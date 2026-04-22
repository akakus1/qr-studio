import {
  bigint,
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "business"]).default("free").notNull(),
  planExpiresAt: timestamp("planExpiresAt"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── QR Codes ─────────────────────────────────────────────────────────────────
export const qrCodes = mysqlTable("qr_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  slug: varchar("slug", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull().default("Untitled QR"),
  type: mysqlEnum("type", ["url", "text", "wifi", "vcard", "email", "phone", "instagram", "location", "pdf"]).notNull().default("url"),
  content: text("content").notNull(),
  isDynamic: boolean("isDynamic").notNull().default(false),
  customisation: text("customisation"),
  scanCount: int("scanCount").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = typeof qrCodes.$inferInsert;

// ── Scan Events ───────────────────────────────────────────────────────────────
export const scanEvents = mysqlTable("scan_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  qrCodeId: int("qrCodeId").notNull(),
  country: varchar("country", { length: 64 }),
  city: varchar("city", { length: 128 }),
  device: mysqlEnum("device", ["mobile", "tablet", "desktop", "unknown"]).default("unknown"),
  os: varchar("os", { length: 64 }),
  browser: varchar("browser", { length: 64 }),
  referrer: varchar("referrer", { length: 512 }),
  ip: varchar("ip", { length: 64 }),
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
});

export type ScanEvent = typeof scanEvents.$inferSelect;
export type InsertScanEvent = typeof scanEvents.$inferInsert;

// ── Blog Posts ────────────────────────────────────────────────────────────────
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
  authorId: int("authorId"),
  tags: text("tags"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// ── API Keys (Business plan) ────────────────────────────────────────────────────────────────────────────────
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull().default("My API Key"),
  keyHash: varchar("keyHash", { length: 128 }).notNull().unique(), // SHA-256 of the raw key
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(), // first 8 chars for display
  isActive: boolean("isActive").notNull().default(true),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;