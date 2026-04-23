import {
  bigserial,
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const planEnum = pgEnum("plan", ["free", "pro", "business"]);
export const qrTypeEnum = pgEnum("qr_type", ["url", "text", "wifi", "vcard", "email", "phone", "instagram", "location", "pdf"]);
export const deviceEnum = pgEnum("device", ["mobile", "tablet", "desktop", "unknown"]);

// ── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 320 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull().default(""),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  plan: planEnum("plan").default("free").notNull(),
  planExpiresAt: timestamp("planExpiresAt"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── QR Codes ─────────────────────────────────────────────────────────────────
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  slug: varchar("slug", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull().default("Untitled QR"),
  type: qrTypeEnum("type").notNull().default("url"),
  content: text("content").notNull(),
  isDynamic: boolean("isDynamic").notNull().default(false),
  customisation: text("customisation"),
  scanCount: integer("scanCount").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = typeof qrCodes.$inferInsert;

// ── Scan Events ───────────────────────────────────────────────────────────────
export const scanEvents = pgTable("scan_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  qrCodeId: integer("qrCodeId").notNull(),
  country: varchar("country", { length: 64 }),
  city: varchar("city", { length: 128 }),
  device: deviceEnum("device").default("unknown"),
  os: varchar("os", { length: 64 }),
  browser: varchar("browser", { length: 64 }),
  referrer: varchar("referrer", { length: 512 }),
  ip: varchar("ip", { length: 64 }),
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
});
export type ScanEvent = typeof scanEvents.$inferSelect;
export type InsertScanEvent = typeof scanEvents.$inferInsert;

// ── Blog Posts ────────────────────────────────────────────────────────────────
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImageUrl: varchar("coverImageUrl", { length: 1024 }),
  authorId: integer("authorId"),
  tags: text("tags"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// ── API Keys (Business plan) ──────────────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull().default("My API Key"),
  keyHash: varchar("keyHash", { length: 128 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
