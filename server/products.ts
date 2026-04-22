/**
 * QR Studio subscription plans.
 * These map to Stripe Price IDs created at checkout time.
 * In production, replace the price IDs with real ones from your Stripe dashboard.
 */

export type PlanId = "pro_monthly" | "pro_yearly" | "business_monthly" | "business_yearly";

export interface Plan {
  id: PlanId;
  name: string;
  tier: "pro" | "business";
  interval: "month" | "year";
  amount: number; // in cents
  currency: string;
  description: string;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro Monthly",
    tier: "pro",
    interval: "month",
    amount: 900, // $9/month
    currency: "usd",
    description: "For creators and small businesses",
    features: [
      "Unlimited QR codes",
      "Dynamic QR codes",
      "Scan analytics",
      "Bulk QR generation (up to 50)",
      "Logo upload",
      "AI style suggestions",
      "Priority support",
    ],
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "Pro Yearly",
    tier: "pro",
    interval: "year",
    amount: 7200, // $72/year (save 33%)
    currency: "usd",
    description: "For creators and small businesses",
    features: [
      "Unlimited QR codes",
      "Dynamic QR codes",
      "Scan analytics",
      "Bulk QR generation (up to 50)",
      "Logo upload",
      "AI style suggestions",
      "Priority support",
    ],
  },
  business_monthly: {
    id: "business_monthly",
    name: "Business Monthly",
    tier: "business",
    interval: "month",
    amount: 2900, // $29/month
    currency: "usd",
    description: "For teams and agencies",
    features: [
      "Everything in Pro",
      "API access",
      "Bulk QR generation (up to 500)",
      "Team collaboration",
      "White-label exports",
      "Dedicated support",
      "Custom integrations",
    ],
  },
  business_yearly: {
    id: "business_yearly",
    name: "Business Yearly",
    tier: "business",
    interval: "year",
    amount: 23200, // $232/year (save 33%)
    currency: "usd",
    description: "For teams and agencies",
    features: [
      "Everything in Pro",
      "API access",
      "Bulk QR generation (up to 500)",
      "Team collaboration",
      "White-label exports",
      "Dedicated support",
      "Custom integrations",
    ],
  },
};
