import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  createQrCode, deleteBlogPost, deleteQrCode, getAllBlogPosts, getDb, getFullPostBySlug,
  getPostBySlug, getPublishedPosts, getQrCodeById,
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

  aiStyle: publicProcedure
    .input(z.object({
      type: z.enum(["url", "text", "wifi", "vcard", "email", "phone", "instagram", "location", "pdf"]),
      content: z.string().max(500),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const systemPrompt = `You are a QR code design expert. Given a QR code type and content, suggest 4 beautiful color schemes that would suit the brand or context. Each suggestion must have a name, a dark color (hex, for QR dots), a light color (hex, for background), and a one-sentence description. Return valid JSON only.`;
      const userPrompt = `QR type: ${input.type}\nContent: ${input.content.slice(0, 200)}\n\nSuggest 4 color schemes.`;
      const response = await invokeLLM({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "color_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      darkColor: { type: "string" },
                      lightColor: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["name", "darkColor", "lightColor", "description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        },
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      let parsed: { suggestions: { name: string; darkColor: string; lightColor: string; description: string }[] };
      try {
        const str = typeof raw === "string" ? raw : JSON.stringify(raw);
        // Strip markdown code fences if present
        const cleaned = str.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // Fallback: return sensible default suggestions
        parsed = {
          suggestions: [
            { name: "Classic Black", darkColor: "#000000", lightColor: "#ffffff", description: "Timeless black on white, maximum contrast and scan reliability." },
            { name: "Deep Purple", darkColor: "#5B21B6", lightColor: "#F5F3FF", description: "Brand-aligned purple tones for a modern, professional look." },
            { name: "Midnight Navy", darkColor: "#1E3A5F", lightColor: "#EFF6FF", description: "Deep navy on soft blue, great for corporate and finance brands." },
            { name: "Forest Green", darkColor: "#14532D", lightColor: "#F0FDF4", description: "Natural green palette, ideal for eco, health, and food brands." },
          ],
        };
      }
      // Validate shape
      if (!Array.isArray(parsed?.suggestions)) {
        parsed = { suggestions: [] };
      }
      return parsed;
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

      // Scan milestone notifications (fire-and-forget)
      const newCount = (qr.scanCount ?? 0) + 1;
      const MILESTONES = [10, 50, 100, 500, 1000, 5000, 10000];
      if (MILESTONES.includes(newCount)) {
        const { notifyOwner } = await import("./_core/notification");
        notifyOwner({
          title: `🎉 QR Milestone: ${newCount} scans`,
          content: `Your QR code "${qr.name || qr.slug}" just reached ${newCount} scans! Keep sharing it to grow further.`,
        }).catch(() => {}); // non-blocking
      }

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
  adminList: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllBlogPosts();
    }),
  adminGet: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const post = await getFullPostBySlug(input.slug);
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      return post;
    }),
  adminDelete: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteBlogPost(input.slug);
      return { success: true };
    }),
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
