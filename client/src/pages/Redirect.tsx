import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useParams } from "wouter";

export default function Redirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState(false);
  const resolveMutation = trpc.redirect.resolve.useMutation({
    onSuccess: (data) => { window.location.href = data.destination; },
    onError: () => setError(true),
  });

  useEffect(() => {
    if (!slug) { setError(true); return; }
    const device = /mobile|android|iphone/i.test(navigator.userAgent) ? "mobile" : /tablet|ipad/i.test(navigator.userAgent) ? "tablet" : "desktop";
    resolveMutation.mutate({ slug, device: device as "mobile" | "tablet" | "desktop", referrer: document.referrer || undefined });
  }, [slug]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div className="bg-mesh" aria-hidden="true" />
      {error ? (
        <>
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", color: "var(--white)", fontSize: "1.5rem" }}>QR Code Not Found</h1>
          <p style={{ color: "var(--tmuted)" }}>This QR code may have been deactivated or deleted.</p>
          <a href="/" style={{ color: "var(--purpleL)", textDecoration: "underline" }}>Go to QR Studio</a>
        </>
      ) : (
        <>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(124,58,237,0.25)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin .65s linear infinite" }} />
          <p style={{ color: "var(--tmuted)", fontSize: ".9rem" }}>Redirecting…</p>
        </>
      )}
    </div>
  );
}
