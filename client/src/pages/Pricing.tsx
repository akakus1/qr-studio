import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "free" as const,
    label: "Free",
    price: { monthly: "$0", yearly: "$0" },
    period: "forever",
    features: ["5 QR codes", "PNG & SVG download", "Custom colors & logo", "URL, Text, Wi-Fi, vCard, Email, Phone"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    id: "pro" as const,
    label: "Pro",
    price: { monthly: "$9", yearly: "$7" },
    period: "/month",
    features: ["Unlimited QR codes", "Dynamic QR codes", "Scan analytics dashboard", "All QR types", "Logo embedding", "Priority support"],
    cta: "Get Pro",
    highlight: true,
    popular: true,
  },
  {
    id: "business" as const,
    label: "Business",
    price: { monthly: "$29", yearly: "$23" },
    period: "/month",
    features: ["Everything in Pro", "Team access (5 seats)", "API access", "White-label branding", "Custom domain", "Dedicated support"],
    cta: "Get Business",
    highlight: false,
  },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const [yearly, setYearly] = useState(false);
  const upgradeMutation = trpc.subscription.upgrade.useMutation({
    onSuccess: (data) => {
      toast.success(`You are now on the ${data.plan} plan!`);
    },
    onError: () => toast.error("Upgrade failed. Please try again."),
  });

  const handleUpgrade = (planId: "pro" | "business") => {
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    upgradeMutation.mutate({ plan: planId });
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, right: 0, left: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(10,15,26,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.3rem" }}>⚡</span> QR Studio
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Generator</a>
          <a href="/blog" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Blog</a>
          {isAuthenticated ? (
            <a href="/dashboard" style={{ background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)", padding: "8px 18px", fontSize: ".85rem", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>Dashboard</a>
          ) : (
            <a href={getLoginUrl()} style={{ background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)", padding: "8px 18px", fontSize: ".85rem", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>Sign In</a>
          )}
        </div>
      </nav>

      <section style={{ position: "relative", zIndex: 2, paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.1)", border: "1px solid var(--bp)", borderRadius: "var(--rfull)", padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--purpleL)" }}>Pricing</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(2rem, 5vw, 3rem)", color: "var(--white)", marginBottom: 16 }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: "1.05rem", color: "var(--tmuted)", maxWidth: 480, margin: "0 auto 32px" }}>
            Start free. Upgrade when you need dynamic QR codes, analytics, and more.
          </p>

          {/* Billing toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "var(--s1)", border: "1px solid var(--border)", borderRadius: "var(--rfull)", padding: "6px 8px" }}>
            <button onClick={() => setYearly(false)} style={{ padding: "8px 20px", borderRadius: "var(--rfull)", border: "none", background: !yearly ? "var(--purple)" : "transparent", color: !yearly ? "#fff" : "var(--tmuted)", fontSize: ".85rem", fontWeight: 600, cursor: "pointer", transition: "all var(--tr)" }}>Monthly</button>
            <button onClick={() => setYearly(true)} style={{ padding: "8px 20px", borderRadius: "var(--rfull)", border: "none", background: yearly ? "var(--purple)" : "transparent", color: yearly ? "#fff" : "var(--tmuted)", fontSize: ".85rem", fontWeight: 600, cursor: "pointer", transition: "all var(--tr)", display: "flex", alignItems: "center", gap: 8 }}>
              Yearly
              <span style={{ background: "var(--adim)", border: "1px solid var(--amber)", color: "var(--amber)", fontSize: ".65rem", fontWeight: 800, padding: "2px 8px", borderRadius: "var(--rfull)" }}>Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 64 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: "var(--s1)", border: `1.5px solid ${plan.popular ? "var(--amber)" : "var(--border)"}`,
              borderRadius: 20, padding: "32px 24px", position: "relative",
              transition: "all var(--tr)", boxShadow: plan.popular ? "0 0 40px rgba(245,158,11,0.1)" : "none",
            }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "none"; }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,var(--amber),#f97316)", color: "#000", fontSize: ".62rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 14px", borderRadius: "var(--rfull)", whiteSpace: "nowrap" }}>Most Popular</div>
              )}
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--purpleL)", marginBottom: 12 }}>{plan.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "2.4rem", fontWeight: 800, color: "var(--white)" }}>
                  {yearly ? plan.price.yearly : plan.price.monthly}
                </span>
                {plan.id !== "free" && <span style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>{plan.period}</span>}
              </div>
              {plan.id !== "free" && yearly && (
                <div style={{ fontSize: ".75rem", color: "var(--green)", marginBottom: 4 }}>Billed annually</div>
              )}
              <div style={{ fontSize: ".78rem", color: "var(--tmuted)", marginBottom: 24 }}>{plan.id === "free" ? "No credit card required" : "Cancel anytime"}</div>
              <ul style={{ listStyle: "none", marginBottom: 28 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, fontSize: ".85rem", color: "var(--t2)" }}>
                    <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <a href="/" style={{ display: "block", padding: "13px 0", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--t2)", fontSize: ".9rem", fontWeight: 700, fontFamily: "'Syne', sans-serif", textAlign: "center", textDecoration: "none", transition: "all var(--tr)" }}>
                  {plan.cta}
                </a>
              ) : (
                <button onClick={() => handleUpgrade(plan.id as "pro" | "business")}
                  disabled={upgradeMutation.isPending}
                  style={{ width: "100%", padding: "13px 0", background: plan.popular ? "linear-gradient(135deg,#7C3AED,#5B21B6)" : "transparent", border: `1px solid ${plan.popular ? "transparent" : "var(--border)"}`, borderRadius: "var(--r12)", color: plan.popular ? "#fff" : "var(--t2)", fontSize: ".9rem", fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", transition: "all var(--tr)", boxShadow: plan.popular ? "0 4px 24px rgba(124,58,237,0.4)" : "none" }}>
                  {upgradeMutation.isPending ? "Processing…" : plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Feature comparison table */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "var(--white)" }}>Feature comparison</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "16px 28px", textAlign: "left", fontSize: ".82rem", color: "var(--tmuted)", fontWeight: 600 }}>Feature</th>
                  {PLANS.map(p => <th key={p.id} style={{ padding: "16px 20px", textAlign: "center", fontSize: ".82rem", color: p.popular ? "var(--amber)" : "var(--tmuted)", fontWeight: 700 }}>{p.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ["QR code generation", "✓", "✓", "✓"],
                  ["Custom colors & logo", "✓", "✓", "✓"],
                  ["PNG & SVG download", "✓", "✓", "✓"],
                  ["QR code limit", "5", "Unlimited", "Unlimited"],
                  ["Dynamic QR codes", "—", "✓", "✓"],
                  ["Scan analytics", "—", "✓", "✓"],
                  ["API access", "—", "—", "✓"],
                  ["Team seats", "1", "1", "5"],
                  ["White-label", "—", "—", "✓"],
                ].map(([feature, ...vals]) => (
                  <tr key={feature as string} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 28px", fontSize: ".88rem", color: "var(--t2)" }}>{feature}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ padding: "14px 20px", textAlign: "center", fontSize: ".88rem", color: v === "✓" ? "var(--green)" : v === "—" ? "var(--tdim)" : "var(--t2)", fontWeight: v === "✓" ? 700 : 400 }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "32px 24px", color: "var(--tdim)", fontSize: ".78rem", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        © {new Date().getFullYear()} QR Studio. All rights reserved.
      </footer>
    </div>
  );
}
