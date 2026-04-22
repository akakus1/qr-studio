import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  createQrCode, deleteQrCode, getPostBySlug, getPublishedPosts, getQrCodeById,
  getQrCodeBySlug, getQrCodesByUser, getScanSummaryByUser, getScansByQrCode,
  getTotalQrCount, incrementScanCount, recordScan, updateQrCode, updateUserPlan,
  upsertBlogPost,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const qrRouter = router({
  save: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255).default("Untitled QR"),
      type: z.enum(["url", "text", "wifi", "vcard", "email", "phone", "instagram", "location", "pdf"]),
      content: z.string().min(1),
      isDynamic: z.boolean().default(false),
      customisation: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slug = nanoid(10);
      const qr = await createQrCode({
        userId: ctx.user.id,
        slug,
        name: input.name,
        type: input.type,
        content: input.content,
        isDynamic: input.isDynamic,
        customisation: input.customisation ?? null,
      });
      return qr;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return getQrCodesByUser(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const qr = await getQrCodeById(input.id);
      if (!qr || qr.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return qr;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      content: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      customisation: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateQrCode(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteQrCode(input.id, ctx.user.id);
      return { success: true };
    }),

  analytics: protectedProcedure
    .input(z.object({ id: z.number(), days: z.number().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const qr = await getQrCodeById(input.id);
      if (!qr || qr.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const scans = await getScansByQrCode(input.id, input.days);

      // Compute derived analytics
      const now = Date.now();
      const last7 = scans.filter(s => now - new Date(s.scannedAt).getTime() < 7 * 86400000).length;
      const last30 = scans.filter(s => now - new Date(s.scannedAt).getTime() < 30 * 86400000).length;

      // Device breakdown
      const deviceMap: Record<string, number> = {};
      for (const s of scans) { const d = s.device ?? "unknown"; deviceMap[d] = (deviceMap[d] ?? 0) + 1; }
      const deviceBreakdown = Object.entries(deviceMap).map(([device, count]) => ({
        device, count, pct: scans.length > 0 ? Math.round((count / scans.length) * 100) : 0,
      })).sort((a, b) => b.count - a.count);

      // Daily scans for chart (last 30 days)
      const dayMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      for (const s of scans) {
        const day = new Date(s.scannedAt).toISOString().slice(0, 10);
        if (dayMap[day] !== undefined) dayMap[day]++;
      }
      const dailyScans = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

      const uniqueDevices = Object.keys(deviceMap).length;
      const recentScans = [...scans].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()).slice(0, 20);

      return { qr, scans, totalScans: scans.length, last7Days: last7, last30Days: last30, deviceBreakdown, dailyScans, uniqueDevices, recentScans };
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    return getScanSummaryByUser(ctx.user.id);
  }),

  totalCount: publicProcedure.query(async () => {
    return getTotalQrCount();
  }),
});

const redirectRouter = router({
  resolve: publicProcedure
    .input(z.object({
      slug: z.string(),
      device: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional(),
      referrer: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const qr = await getQrCodeBySlug(input.slug);
      if (!qr || !qr.isActive) throw new TRPCError({ code: "NOT_FOUND" });
      const ua = (ctx.req.headers["user-agent"] as string) ?? "";
      const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        ?? (ctx.req as unknown as { ip?: string }).ip ?? "";
      let device: "mobile" | "tablet" | "desktop" | "unknown" = input.device ?? "unknown";
      if (!input.device) {
        if (/tablet|ipad/i.test(ua)) device = "tablet";
        else if (/mobile|android|iphone/i.test(ua)) device = "mobile";
        else if (ua) device = "desktop";
      }
      await recordScan({ qrCodeId: qr.id, device, referrer: input.referrer ?? null, ip });
      await incrementScanCount(qr.id);
      return { destination: qr.content, type: qr.type };
    }),
});

const subscriptionRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    return { plan: ctx.user.plan, planExpiresAt: ctx.user.planExpiresAt };
  }),
  upgrade: protectedProcedure
    .input(z.object({ plan: z.enum(["pro", "business"]) }))
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await updateUserPlan(ctx.user.id, input.plan, expiresAt);
      return { success: true, plan: input.plan, expiresAt };
    }),
});

const blogRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().default(10), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return getPublishedPosts(input.limit, input.offset);
    }),
  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const post = await getPostBySlug(input.slug);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      return post;
    }),
  upsert: protectedProcedure
    .input(z.object({
      slug: z.string(),
      title: z.string(),
      excerpt: z.string().optional(),
      content: z.string(),
      coverImageUrl: z.string().optional(),
      tags: z.string().optional(),
      published: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await upsertBlogPost({
        ...input,
        authorId: ctx.user.id,
        publishedAt: input.published ? new Date() : null,
      });
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  qr: qrRouter,
  redirect: redirectRouter,
  subscription: subscriptionRouter,
  blog: blogRouter,
});

export type AppRouter = typeof appRouter;
