import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";
import { updateUserPlan } from "./db";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { PLANS, type PlanId } from "./products";

// Lazily initialize Stripe to avoid crash when STRIPE_SECRET_KEY is missing at startup
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

export function registerStripeRoutes(app: Express) {
  // ── Webhook (must be before express.json) ────────────────────────────────────
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let event: any;

      try {
        event = getStripe().webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err) {
        console.error("[Stripe] Webhook signature verification failed:", err);
        res.status(400).send("Webhook signature verification failed");
        return;
      }

      // Test event detection — required for webhook verification
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Stripe] Webhook received: ${event.type} (${event.id})`);

      try {
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const userId = parseInt(session.metadata?.user_id ?? "0", 10);
          const planId = session.metadata?.plan_id as PlanId | undefined;

          if (userId && planId && PLANS[planId]) {
            const plan = PLANS[planId];
            const expiresAt = new Date(
              Date.now() + (plan.interval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000
            );
            await updateUserPlan(userId, plan.tier, expiresAt);

            // Save stripe customer id if available
            if (session.customer) {
              const db = await getDb();
              if (db) {
                await db.update(users)
                  .set({ stripeCustomerId: session.customer as string })
                  .where(eq(users.id, userId));
              }
            }
            console.log(`[Stripe] Upgraded user ${userId} to ${plan.tier} (${planId})`);
          }
        }

        if (event.type === "customer.subscription.deleted") {
          // Downgrade to free when subscription is cancelled
          const subscription = event.data.object;
          const db = await getDb();
          if (db && subscription.customer) {
            const result = await db.select({ id: users.id })
              .from(users)
              .where(eq(users.stripeCustomerId, subscription.customer as string))
              .limit(1);
            if (result[0]) {
              await updateUserPlan(result[0].id, "free", undefined);
              console.log(`[Stripe] Downgraded user ${result[0].id} to free (subscription cancelled)`);
            }
          }
        }
      } catch (err) {
        console.error("[Stripe] Error processing webhook:", err);
        res.status(500).send("Webhook processing error");
        return;
      }

      res.json({ received: true });
    }
  );
}

/**
 * Create a Stripe Checkout Session for a given plan.
 * Called from the tRPC subscription.createCheckout procedure.
 */
export async function createCheckoutSession(params: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  planId: PlanId;
  origin: string;
}) {
  const plan = PLANS[params.planId];
  if (!plan) throw new Error(`Unknown plan: ${params.planId}`);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    customer_email: params.userEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency: plan.currency,
          unit_amount: plan.amount,
          product_data: {
            name: `QR Studio ${plan.name}`,
            description: plan.features.slice(0, 3).join(" · "),
          },
        },
        quantity: 1,
      },
    ],
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      plan_id: params.planId,
      customer_email: params.userEmail ?? "",
      customer_name: params.userName ?? "",
    },
    success_url: `${params.origin}/dashboard?upgrade=success&plan=${params.planId}`,
    cancel_url: `${params.origin}/pricing?upgrade=cancelled`,
  });

  return { url: session.url! };
}
