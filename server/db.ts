import { createHash, randomBytes } from "crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { apiKeys, blogPosts, InsertBlogPost, InsertQrCode, InsertScanEvent, InsertUser, qrCodes, scanEvents, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPlan(userId: number, plan: "free" | "pro" | "business", expiresAt?: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ plan, planExpiresAt: expiresAt ?? null }).where(eq(users.id, userId));
}

// ── QR Codes ──────────────────────────────────────────────────────────────────
export async function createQrCode(data: InsertQrCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(qrCodes).values(data);
  const result = await db.select().from(qrCodes).where(eq(qrCodes.slug, data.slug!)).limit(1);
  return result[0];
}

export async function getQrCodesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qrCodes).where(eq(qrCodes.userId, userId)).orderBy(desc(qrCodes.createdAt));
}

export async function getQrCodeBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(qrCodes).where(eq(qrCodes.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQrCodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateQrCode(id: number, userId: number, data: Partial<InsertQrCode>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(qrCodes).set(data).where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)));
}

export async function deleteQrCode(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(qrCodes).where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)));
}

export async function incrementScanCount(qrCodeId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(qrCodes).set({ scanCount: sql`${qrCodes.scanCount} + 1` }).where(eq(qrCodes.id, qrCodeId));
}

// ── Scan Events ───────────────────────────────────────────────────────────────
export async function recordScan(data: InsertScanEvent) {
  const db = await getDb();
  if (!db) return;
  await db.insert(scanEvents).values(data);
}

export async function getScansByQrCode(qrCodeId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select().from(scanEvents)
    .where(and(eq(scanEvents.qrCodeId, qrCodeId), gte(scanEvents.scannedAt, since)))
    .orderBy(desc(scanEvents.scannedAt));
}

export async function getScanSummaryByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: qrCodes.id, name: qrCodes.name, slug: qrCodes.slug, type: qrCodes.type,
    isDynamic: qrCodes.isDynamic, scanCount: qrCodes.scanCount, isActive: qrCodes.isActive, createdAt: qrCodes.createdAt,
  }).from(qrCodes).where(eq(qrCodes.userId, userId)).orderBy(desc(qrCodes.scanCount));
}

// ── Blog Posts ────────────────────────────────────────────────────────────────
export async function getPublishedPosts(limit = 10, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts).where(eq(blogPosts.published, true))
    .orderBy(desc(blogPosts.publishedAt)).limit(limit).offset(offset);
}

export async function getPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertBlogPost(data: InsertBlogPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blogPosts).values(data).onDuplicateKeyUpdate({ set: { ...data } });
}

export async function getFullPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteBlogPost(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogPosts).where(eq(blogPosts.slug, slug));
}

// ── API Key helpers ──────────────────────────────────────────────────────────

export async function createApiKey(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const raw = `qrs_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const keyPrefix = raw.slice(0, 12);
  await db.insert(apiKeys).values({ userId, name, keyHash, keyPrefix });
  return { raw, keyPrefix }; // raw shown once, never stored
}

export async function getApiKeysByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix,
    isActive: apiKeys.isActive, lastUsedAt: apiKeys.lastUsedAt, createdAt: apiKeys.createdAt,
  }).from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function revokeApiKey(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(apiKeys).set({ isActive: false }).where(
    and(eq(apiKeys.id, id), eq(apiKeys.userId, userId))
  );
}

export async function verifyApiKey(raw: string) {
  const db = await getDb();
  if (!db) return null;
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const result = await db.select({ userId: apiKeys.userId, id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1);
  if (result.length === 0) return null;
  // Update lastUsedAt asynchronously
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, result[0].id)).catch(() => {});
  return result[0].userId;
}

export async function getAllBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    slug: blogPosts.slug, title: blogPosts.title, excerpt: blogPosts.excerpt,
    published: blogPosts.published, publishedAt: blogPosts.publishedAt,
  }).from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function getTotalQrCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(qrCodes);
  return result[0]?.count ?? 0;
}
