import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Blog() {
  const { isAuthenticated } = useAuth();
  const { data: posts, isLoading } = trpc.blog.list.useQuery({ limit: 20, offset: 0 });

  const SEED_POSTS = [
    { slug: "what-is-a-dynamic-qr-code", title: "What Is a Dynamic QR Code? (And Why You Need One)", excerpt: "Static QR codes are permanent — but dynamic QR codes let you change the destination anytime. Here's everything you need to know.", publishedAt: new Date("2026-01-15") },
    { slug: "qr-code-best-practices", title: "QR Code Best Practices for Marketing in 2026", excerpt: "From sizing to placement to tracking, here are the essential best practices for using QR codes in your marketing campaigns.", publishedAt: new Date("2026-02-01") },
    { slug: "how-to-add-logo-to-qr-code", title: "How to Add Your Logo to a QR Code (Without Breaking It)", excerpt: "Branded QR codes with logos get 80% more scans. Learn how to embed your logo while keeping the code scannable.", publishedAt: new Date("2026-02-20") },
    { slug: "qr-code-analytics-guide", title: "QR Code Analytics: What to Track and Why It Matters", excerpt: "Scan counts are just the beginning. Learn how to use QR code analytics to optimise your campaigns and increase conversions.", publishedAt: new Date("2026-03-05") },
    { slug: "wifi-qr-code-guide", title: "How to Create a Wi-Fi QR Code for Your Business", excerpt: "Let customers connect to your Wi-Fi instantly — no passwords needed. A step-by-step guide to creating Wi-Fi QR codes.", publishedAt: new Date("2026-03-20") },
    { slug: "vcard-qr-code-guide", title: "vCard QR Codes: The Modern Business Card", excerpt: "Replace paper business cards with a scannable vCard QR code. Everything you need to know about creating and sharing digital contact cards.", publishedAt: new Date("2026-04-01") },
  ];

  const displayPosts = (posts && posts.length > 0) ? posts : SEED_POSTS;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <nav style={{ position: "fixed", top: 0, right: 0, left: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(10,15,26,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}><span>⚡</span> QR Studio</a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/pricing" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Pricing</a>
          {isAuthenticated ? <a href="/dashboard" style={{ background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)", padding: "8px 18px", fontSize: ".85rem", fontWeight: 700 }}>Dashboard</a>
            : <a href={getLoginUrl()} style={{ background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)", padding: "8px 18px", fontSize: ".85rem", fontWeight: 700 }}>Sign In</a>}
        </div>
      </nav>
      <section style={{ position: "relative", zIndex: 2, paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.1)", border: "1px solid var(--bp)", borderRadius: "var(--rfull)", padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--purpleL)" }}>Blog</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(2rem, 5vw, 2.8rem)", color: "var(--white)", marginBottom: 16 }}>QR Code Resources & Guides</h1>
          <p style={{ fontSize: "1rem", color: "var(--tmuted)" }}>Tips, tutorials, and best practices for QR codes.</p>
        </div>
        {isLoading ? (
          <div style={{ textAlign: "center", color: "var(--tmuted)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {displayPosts.map((post: any) => (
              <a key={post.slug} href={`/blog/${post.slug}`} style={{ display: "block", background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px", textDecoration: "none", transition: "all var(--tr)" }}
                onMouseOver={e => { e.currentTarget.style.borderColor = "var(--bp)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ fontSize: ".75rem", color: "var(--tmuted)", marginBottom: 8 }}>{new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--white)", marginBottom: 8 }}>{post.title}</h2>
                <p style={{ fontSize: ".88rem", color: "var(--tmuted)", lineHeight: 1.6 }}>{post.excerpt}</p>
                <div style={{ marginTop: 12, fontSize: ".82rem", color: "var(--purpleL)", fontWeight: 600 }}>Read more →</div>
              </a>
            ))}
          </div>
        )}
      </section>
      <footer style={{ textAlign: "center", padding: "32px 24px", color: "var(--tdim)", fontSize: ".78rem", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        © {new Date().getFullYear()} QR Studio. All rights reserved.
      </footer>
    </div>
  );
}
