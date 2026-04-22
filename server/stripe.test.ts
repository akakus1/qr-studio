/**
 * Tests for the Stripe integration — subscription.createCheckout procedure.
 * The actual Stripe API call is mocked so no network is required.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the stripe module before importing anything that uses it
vi.mock("./stripe", () => ({
  createCheckoutSession: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test_session" }),
  registerStripeRoutes: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-42",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    plan: "free",
    planExpiresAt: null,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("apiKey router", () => {
  it("list rejects free plan users", async () => {
    const ctx = makeCtx({ plan: "free" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.apiKey.list()).rejects.toThrow("Business plan");
  });

  it("list rejects pro plan users", async () => {
    const ctx = makeCtx({ plan: "pro" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.apiKey.list()).rejects.toThrow("Business plan");
  });

  it("create rejects non-business users", async () => {
    const ctx = makeCtx({ plan: "free" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.apiKey.create({ name: "test" })).rejects.toThrow("Business plan");
  });

  it("revoke rejects non-business users", async () => {
    const ctx = makeCtx({ plan: "free" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.apiKey.revoke({ id: 1 })).rejects.toThrow("Business plan");
  });
});

describe("subscription.createCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a checkout URL for pro_monthly plan", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createCheckout({
      planId: "pro_monthly",
      origin: "https://qrstudio.example.com",
    });

    expect(result.url).toBe("https://checkout.stripe.com/test_session");
  });

  it("returns a checkout URL for business_yearly plan", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.subscription.createCheckout({
      planId: "business_yearly",
      origin: "https://qrstudio.example.com",
    });

    expect(result.url).toBe("https://checkout.stripe.com/test_session");
  });

  it("throws UNAUTHORIZED when user is not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.subscription.createCheckout({
        planId: "pro_monthly",
        origin: "https://qrstudio.example.com",
      })
    ).rejects.toThrow();
  });

  it("rejects an invalid origin URL", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.subscription.createCheckout({
        planId: "pro_monthly",
        origin: "not-a-valid-url",
      })
    ).rejects.toThrow();
  });
});
