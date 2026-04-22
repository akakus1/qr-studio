import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook MUST be registered before express.json() to preserve raw body
  const { registerStripeRoutes } = await import("../stripe");
  registerStripeRoutes(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // REST API v1 — authenticated via Bearer API key (Business plan)
  app.use("/api/v1", async (req, res, next) => {
    const auth = req.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer qrs_your_key" });
      return;
    }
    const raw = auth.slice(7);
    const { verifyApiKey, getQrCodesByUser, createQrCode } = await import("../db");
    const userId = await verifyApiKey(raw);
    if (!userId) {
      res.status(401).json({ error: "Invalid or revoked API key." });
      return;
    }
    (req as express.Request & { apiUserId: number }).apiUserId = userId;
    next();
  });

  app.get("/api/v1/qr", async (req, res) => {
    const { getQrCodesByUser } = await import("../db");
    const userId = (req as express.Request & { apiUserId: number }).apiUserId;
    const codes = await getQrCodesByUser(userId);
    res.json({ data: codes });
  });

  app.post("/api/v1/qr", async (req, res) => {
    const { createQrCode } = await import("../db");
    const { nanoid } = await import("nanoid");
    const userId = (req as express.Request & { apiUserId: number }).apiUserId;
    const { type = "url", content, name = "API QR Code", isDynamic = false } = req.body;
    if (!content) { res.status(400).json({ error: "content is required" }); return; }
    const slug = nanoid(8);
    await createQrCode({ userId, slug, type, content, name, isDynamic });
    res.status(201).json({ success: true, slug, redirectUrl: `/r/${slug}` });
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
