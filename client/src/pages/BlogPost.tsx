import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";

const SEED_CONTENT: Record<string, { title: string; content: string; excerpt: string }> = {
  "what-is-a-dynamic-qr-code": {
    title: "What Is a Dynamic QR Code? (And Why You Need One)",
    excerpt: "Static QR codes are permanent — but dynamic QR codes let you change the destination anytime.",
    content: `## What Is a Dynamic QR Code?

A **dynamic QR code** is a QR code that redirects through a short URL, allowing you to change the destination at any time — without reprinting the code.

Unlike static QR codes (where the destination is permanently encoded), dynamic QR codes store a short redirect URL. When someone scans the code, they're sent to the redirect URL, which then forwards them to your actual destination.

## Static vs Dynamic QR Codes

| Feature | Static | Dynamic |
|---|---|---|
| Destination | Fixed | Editable |
| Analytics | None | Full scan tracking |
| File size | Larger | Smaller |
| Best for | One-time use | Ongoing campaigns |

## Why Use Dynamic QR Codes?

**1. Update without reprinting.** Printed a thousand flyers? No problem — just update the destination URL in your dashboard.

**2. Track scan analytics.** See exactly how many people scanned your code, when, where, and on what device.

**3. A/B test destinations.** Send different users to different pages to optimise your conversion rate.

## How to Create a Dynamic QR Code

1. Sign up for a QR Studio Pro account
2. Generate your QR code and toggle "Dynamic QR"
3. Download and print your QR code
4. Update the destination anytime from your dashboard

Dynamic QR codes are available on the Pro plan from $9/month.`,
  },
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = trpc.blog.get.useQuery({ slug: slug || "" }, { enabled: !!slug, retry: false });

  const seedPost = slug ? SEED_CONTENT[slug] : null;
  const displayPost = post || seedPost;

  if (isLoading) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(124,58,237,0.25)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin .65s linear infinite" }} />
    </div>
  );

  if (!displayPost) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <h1 style={{ color: "var(--white)", fontFamily: "'Syne', sans-serif" }}>Post Not Found</h1>
      <a href="/blog" style={{ color: "var(--purpleL)" }}>← Back to Blog</a>
    </div>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      <div className="bg-mesh" aria-hidden="true" />
      <nav style={{ position: "fixed", top: 0, right: 0, left: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(10,15,26,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}><span>⚡</span> QR Studio</a>
        <a href="/blog" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>← Blog</a>
      </nav>
      <article style={{ position: "relative", zIndex: 2, paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "var(--white)", marginBottom: 24, lineHeight: 1.2 }}>{displayPost.title}</h1>
        <div style={{ fontSize: ".88rem", color: "var(--tmuted)", marginBottom: 40 }}>
          {(post as any)?.publishedAt ? new Date((post as any).publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "April 2026"} · QR Studio Team
        </div>
        <div style={{ color: "var(--t2)", lineHeight: 1.8, fontSize: ".95rem" }}>
          {displayPost.content.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i} style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "var(--white)", margin: "32px 0 16px" }}>{line.slice(3)}</h2>;
            if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} style={{ color: "var(--white)" }}>{line.slice(2, -2)}</strong>;
            if (line.startsWith('| ')) return null;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} style={{ marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--white)">$1</strong>') }} />;
          })}
        </div>
        <div style={{ marginTop: 48, padding: "28px", background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(245,158,11,0.08))", border: "1px solid var(--bp)", borderRadius: 16 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--white)", marginBottom: 8 }}>Ready to create your QR code?</h3>
          <p style={{ color: "var(--tmuted)", fontSize: ".88rem", marginBottom: 16 }}>Generate free QR codes instantly — no sign-up required.</p>
          <a href="/" style={{ display: "inline-block", background: "linear-gradient(135deg,var(--purple),var(--purpleD))", color: "#fff", borderRadius: "var(--r12)", padding: "12px 24px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".9rem", textDecoration: "none" }}>Generate QR Code Free →</a>
        </div>
      </article>
      <footer style={{ textAlign: "center", padding: "32px 24px", color: "var(--tdim)", fontSize: ".78rem", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        © {new Date().getFullYear()} QR Studio. All rights reserved.
      </footer>
    </div>
  );
}
