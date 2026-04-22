import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ApiKeys() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [newKeyName, setNewKeyName] = useState("My API Key");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const keysQuery = trpc.apiKey.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.plan === "business",
  });

  const createMutation = trpc.apiKey.create.useMutation({
    onSuccess: (data) => {
      setRevealedKey(data.raw);
      setCreating(false);
      keysQuery.refetch();
      toast.success("API key created. Copy it now — it will not be shown again.");
    },
    onError: (e) => { toast.error(e.message); setCreating(false); },
  });

  const revokeMutation = trpc.apiKey.revoke.useMutation({
    onSuccess: () => { toast.success("Key revoked."); keysQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  if (!isAuthenticated) { navigate("/"); return null; }

  const isPro = user?.plan === "business";

  const nav: React.CSSProperties = {
    position: "fixed", top: 0, right: 0, left: 0, zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 24px", background: "rgba(10,15,26,0.85)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border)",
  };

  const card: React.CSSProperties = {
    background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px", marginBottom: 16,
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="bg-mesh" aria-hidden="true" />

      {/* Nav */}
      <nav style={nav}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.3rem" }}>⚡</span> QR Studio
        </a>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/dashboard" style={{ color: "var(--t2)", textDecoration: "none", fontSize: ".9rem" }}>← Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "100px 24px 60px" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "var(--white)", marginBottom: 8 }}>
          API Access
        </h1>
        <p style={{ color: "var(--t2)", fontSize: ".95rem", marginBottom: 32 }}>
          Use your API key to generate and manage QR codes programmatically. Available on the Business plan.
        </p>

        {!isPro ? (
          <div style={{ ...card, textAlign: "center", padding: "48px 28px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🔐</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "var(--white)", marginBottom: 8 }}>
              Business Plan Required
            </h2>
            <p style={{ color: "var(--t2)", fontSize: ".9rem", marginBottom: 24 }}>
              API access is available on the Business plan. Upgrade to generate and manage QR codes via REST API.
            </p>
            <a href="/pricing" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg,#7C3AED,#5B21B6)", borderRadius: 10, color: "#fff", fontWeight: 700, fontFamily: "'Syne', sans-serif", textDecoration: "none" }}>
              Upgrade to Business
            </a>
          </div>
        ) : (
          <>
            {/* Revealed key banner */}
            {revealedKey && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
                <p style={{ color: "#34d399", fontSize: ".85rem", fontWeight: 700, marginBottom: 8 }}>
                  ⚠️ Copy your API key now — it will not be shown again
                </p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <code style={{ flex: 1, background: "rgba(0,0,0,0.3)", padding: "10px 14px", borderRadius: 8, color: "#a7f3d0", fontSize: ".85rem", wordBreak: "break-all", fontFamily: "monospace" }}>
                    {revealedKey}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(revealedKey); toast.success("Copied!"); }}
                    style={{ padding: "10px 16px", background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, color: "#34d399", fontSize: ".8rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                    Copy
                  </button>
                  <button onClick={() => setRevealedKey(null)}
                    style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--t2)", fontSize: ".8rem", cursor: "pointer" }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Create new key */}
            <div style={card}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--white)", marginBottom: 16 }}>
                Create New API Key
              </h2>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production)"
                  style={{ flex: 1, background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--white)", fontSize: ".9rem", outline: "none" }}
                />
                <button
                  onClick={() => { setCreating(true); createMutation.mutate({ name: newKeyName || "My API Key" }); }}
                  disabled={createMutation.isPending}
                  style={{ padding: "10px 20px", background: "linear-gradient(135deg,#7C3AED,#5B21B6)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", opacity: createMutation.isPending ? 0.6 : 1 }}>
                  {createMutation.isPending ? "Creating…" : "Create Key"}
                </button>
              </div>
              <p style={{ color: "var(--t3)", fontSize: ".8rem", marginTop: 10 }}>
                Maximum 5 active keys per account. The full key is shown only once on creation.
              </p>
            </div>

            {/* Key list */}
            <div style={card}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--white)", marginBottom: 16 }}>
                Your API Keys ({keysQuery.data?.filter(k => k.isActive).length ?? 0} active)
              </h2>
              {keysQuery.isLoading ? (
                <p style={{ color: "var(--t2)", fontSize: ".9rem" }}>Loading…</p>
              ) : keysQuery.data?.length === 0 ? (
                <p style={{ color: "var(--t2)", fontSize: ".9rem" }}>No API keys yet. Create one above.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {keysQuery.data?.map(key => (
                    <div key={key.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", opacity: key.isActive ? 1 : 0.5 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ color: "var(--white)", fontWeight: 600, fontSize: ".9rem" }}>{key.name}</span>
                          {!key.isActive && <span style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: ".7rem", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Revoked</span>}
                        </div>
                        <code style={{ color: "var(--t2)", fontSize: ".8rem", fontFamily: "monospace" }}>{key.keyPrefix}••••••••••••••••••••••••</code>
                        <div style={{ color: "var(--t3)", fontSize: ".75rem", marginTop: 4 }}>
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      {key.isActive && (
                        <button
                          onClick={() => { if (confirm(`Revoke key "${key.name}"?`)) revokeMutation.mutate({ id: key.id }); }}
                          style={{ padding: "8px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: ".8rem", cursor: "pointer" }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* API docs */}
            <div style={card}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--white)", marginBottom: 16 }}>
                API Usage
              </h2>
              <p style={{ color: "var(--t2)", fontSize: ".85rem", marginBottom: 12 }}>
                Pass your API key in the <code style={{ color: "var(--purpleL)", fontFamily: "monospace" }}>Authorization</code> header:
              </p>
              <pre style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px", color: "#a5b4fc", fontSize: ".8rem", overflowX: "auto", fontFamily: "monospace", lineHeight: 1.6 }}>
{`# Generate a QR code
curl -X POST https://your-domain.com/api/v1/qr \\
  -H "Authorization: Bearer qrs_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"url","content":"https://example.com","name":"My QR"}'

# List your QR codes
curl https://your-domain.com/api/v1/qr \\
  -H "Authorization: Bearer qrs_your_key_here"`}
              </pre>
              <p style={{ color: "var(--t3)", fontSize: ".8rem", marginTop: 12 }}>
                Full API documentation is available in the developer docs.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
