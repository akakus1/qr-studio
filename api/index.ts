import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { registerStripeRoutes } from "../server/stripe";

const app = express();

// Stripe webhook MUST be registered before express.json()
registerStripeRoutes(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS for production
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = (req as any).headers?.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, trpc-accept");
  if ((req as any).method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  next();
});

registerStorageProxy(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// REST API v1 - auth middleware
app.use("/api/v1", async (req: any, res: any, next: any) => {
  const auth = req.headers?.["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header." });
    return;
  }
  const raw = auth.slice(7);
  const { verifyApiKey } = await import("../server/db");
  const userId = await verifyApiKey(raw);
  if (!userId) {
    res.status(401).json({ error: "Invalid or revoked API key." });
    return;
  }
  req.apiUserId = userId;
  next();
});

app.get("/api/v1/qr", async (req: any, res: any) => {
  const { getQrCodesByUser } = await import("../server/db");
  const codes = await getQrCodesByUser(req.apiUserId);
  res.json({ data: codes });
});

app.post("/api/v1/qr", async (req: any, res: any) => {
  const { createQrCode } = await import("../server/db");
  const { nanoid } = await import("nanoid");
  const { type = "url", content, name = "API QR Code", isDynamic = false } = req.body;
  if (!content) { res.status(400).json({ error: "content is required" }); return; }
  const slug = nanoid(8);
  await createQrCode({ userId: req.apiUserId, slug, type, content, name, isDynamic });
  res.status(201).json({ success: true, slug, redirectUrl: `/r/${slug}` });
});

// Export as handler function (required by Vercel)
export default function handler(req: any, res: any) {
  return app(req, res);
}
