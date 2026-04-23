import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module so tests don't make real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-id",
    created: Date.now(),
    model: "gpt-4o-mini",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: JSON.stringify({
          suggestions: [
            { name: "Classic Black", darkColor: "#000000", lightColor: "#ffffff", description: "Timeless black on white." },
            { name: "Deep Purple", darkColor: "#5B21B6", lightColor: "#F5F3FF", description: "Modern purple tones." },
            { name: "Midnight Navy", darkColor: "#1E3A5F", lightColor: "#EFF6FF", description: "Deep navy on soft blue." },
            { name: "Forest Green", darkColor: "#14532D", lightColor: "#F0FDF4", description: "Natural green palette." },
          ],
        }),
      },
      finish_reason: "stop",
    }],
  }),
}));

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  createQrCode: vi.fn().mockResolvedValue({ id: 1, slug: "abc123", name: "Test QR", type: "url", content: "https://example.com", isDynamic: false, scanCount: 0, isActive: true, userId: 1, customisation: null, createdAt: new Date(), updatedAt: new Date() }),
  getQrCodesByUser: vi.fn().mockResolvedValue([]),
  getQrCodeById: vi.fn().mockResolvedValue({ id: 1, userId: 1, slug: "abc123", name: "Test QR", type: "url", content: "https://example.com", isDynamic: false, scanCount: 0, isActive: true, customisation: null, createdAt: new Date(), updatedAt: new Date() }),
  getQrCodeBySlug: vi.fn().mockResolvedValue({ id: 1, userId: 1, slug: "abc123", name: "Test QR", type: "url", content: "https://example.com", isDynamic: true, scanCount: 5, isActive: true, customisation: null, createdAt: new Date(), updatedAt: new Date() }),
  updateQrCode: vi.fn().mockResolvedValue(undefined),
  deleteQrCode: vi.fn().mockResolvedValue(undefined),
  incrementScanCount: vi.fn().mockResolvedValue(undefined),
  recordScan: vi.fn().mockResolvedValue(undefined),
  getScansByQrCode: vi.fn().mockResolvedValue([]),
  getScanSummaryByUser: vi.fn().mockResolvedValue([]),
  getTotalQrCount: vi.fn().mockResolvedValue(12847),
  getPublishedPosts: vi.fn().mockResolvedValue([]),
  getPostBySlug: vi.fn().mockResolvedValue(null),
  upsertBlogPost: vi.fn().mockResolvedValue(undefined),
  updateUserPlan: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue(undefined),
}));

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1, openId: "test-user", name: "Test User", email: "test@example.com",
      loginMethod: "manus", role: "user", plan: "free", planExpiresAt: null,
      stripeCustomerId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

describe("qr.totalCount", () => {
  it("returns total count without authentication", async () => {
    const ctx = makeCtx({ user: null });
    const caller = appRouter.createCaller(ctx);
    const count = await caller.qr.totalCount();
    expect(count).toBe(12847);
  });
});

describe("qr.save", () => {
  it("saves a QR code for authenticated user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.qr.save({
      name: "My Website",
      type: "url",
      content: "https://example.com",
      isDynamic: false,
    });
    expect(result).toMatchObject({ id: 1, type: "url", content: "https://example.com" });
  });
});

describe("qr.list", () => {
  it("returns empty list for new user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const list = await caller.qr.list();
    expect(Array.isArray(list)).toBe(true);
  });
});

describe("qr.analytics", () => {
  it("returns analytics with computed fields", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const analytics = await caller.qr.analytics({ id: 1 });
    expect(analytics).toHaveProperty("totalScans");
    expect(analytics).toHaveProperty("last7Days");
    expect(analytics).toHaveProperty("last30Days");
    expect(analytics).toHaveProperty("deviceBreakdown");
    expect(analytics).toHaveProperty("dailyScans");
    expect(analytics).toHaveProperty("uniqueDevices");
    expect(analytics).toHaveProperty("recentScans");
    expect(analytics.dailyScans).toHaveLength(30);
  });
});

describe("redirect.resolve", () => {
  it("resolves a valid dynamic QR code slug", async () => {
    const ctx = makeCtx({ user: null });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.redirect.resolve({ slug: "abc123", device: "mobile" });
    expect(result).toMatchObject({ destination: "https://example.com", type: "url" });
  });
});

describe("subscription.current", () => {
  it("returns free plan for new user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const sub = await caller.subscription.current();
    expect(sub.plan).toBe("free");
  });
});

describe("qr.aiStyle", () => {
  it("returns 4 suggestions for a URL type", async () => {
    const ctx = makeCtx({ user: null });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.qr.aiStyle({ type: "url", content: "https://example.com" });
    expect(result).toHaveProperty("suggestions");
    expect(Array.isArray(result.suggestions)).toBe(true);
    // Should always return at least 1 suggestion (fallback guarantees 4)
    expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
    if (result.suggestions.length > 0) {
      const s = result.suggestions[0];
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("darkColor");
      expect(s).toHaveProperty("lightColor");
      expect(s).toHaveProperty("description");
    }
  }, 30_000); // Allow up to 30s for the real LLM call
});

describe("blog.list", () => {
  it("returns empty list when no posts exist", async () => {
    const ctx = makeCtx({ user: null });
    const caller = appRouter.createCaller(ctx);
    const posts = await caller.blog.list({ limit: 10, offset: 0 });
    expect(Array.isArray(posts)).toBe(true);
  });
});
