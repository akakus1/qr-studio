import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");

  const utils = trpc.useUtils();
  const { data: qrCodes, isLoading } = trpc.qr.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: subscription } = trpc.subscription.current.useQuery(undefined, { enabled: isAuthenticated });

  const deleteMutation = trpc.qr.delete.useMutation({
    onSuccess: () => { utils.qr.list.invalidate(); toast.success("QR code deleted."); setDeleteConfirm(null); },
    onError: () => toast.error("Failed to delete."),
  });

  const updateMutation = trpc.qr.update.useMutation({
    onSuccess: () => { utils.qr.list.invalidate(); toast.success("QR code updated!"); setEditingId(null); },
    onError: () => toast.error("Failed to update."),
  });

  const toggleMutation = trpc.qr.update.useMutation({
    onSuccess: () => { utils.qr.list.invalidate(); },
  });

  if (loading) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(124,58,237,0.25)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin .65s linear infinite" }} />
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
        <div className="bg-mesh" aria-hidden="true" />
        <div style={{ fontSize: "3rem" }}>🔒</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", color: "var(--white)", fontSize: "1.5rem" }}>Sign in to access your dashboard</h1>
        <p style={{ color: "var(--tmuted)", textAlign: "center", maxWidth: 400 }}>Save, manage, and track your QR codes from one place.</p>
        <a href={getLoginUrl()} style={{ background: "linear-gradient(135deg,var(--purple),var(--purpleD))", color: "#fff", borderRadius: "var(--r12)", padding: "14px 32px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", textDecoration: "none" }}>Sign In</a>
        <a href="/" style={{ color: "var(--tmuted)", fontSize: ".85rem" }}>← Back to Generator</a>
      </div>
    );
  }

  const totalScans = qrCodes?.reduce((sum, qr) => sum + qr.scanCount, 0) ?? 0;
  const activeCount = qrCodes?.filter(qr => qr.isActive).length ?? 0;
  const dynamicCount = qrCodes?.filter(qr => qr.isDynamic).length ?? 0;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, right: 0, left: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(10,15,26,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}><span>⚡</span> QR Studio</a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Generator</a>
          <a href="/pricing" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Pricing</a>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--s1)", border: "1px solid var(--border)", borderRadius: "var(--rfull)", padding: "6px 14px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,var(--purple),var(--purpleD))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 700, color: "#fff" }}>
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <span style={{ fontSize: ".82rem", color: "var(--t2)" }}>{user?.name ?? "User"}</span>
            <span style={{ fontSize: ".65rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: subscription?.plan === "free" ? "var(--tmuted)" : "var(--amber)", background: subscription?.plan === "free" ? "var(--s2)" : "var(--adim)", border: `1px solid ${subscription?.plan === "free" ? "var(--border)" : "var(--amber)"}`, borderRadius: "var(--rfull)", padding: "2px 8px" }}>
              {subscription?.plan ?? "free"}
            </span>
          </div>
        </div>
      </nav>

      <div style={{ position: "relative", zIndex: 2, paddingTop: 96, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "var(--white)", marginBottom: 4 }}>
              My QR Codes
            </h1>
            <p style={{ color: "var(--tmuted)", fontSize: ".9rem" }}>Manage, track, and update your QR codes</p>
          </div>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,var(--purple),var(--purpleD))", color: "#fff", borderRadius: "var(--r12)", padding: "12px 24px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".9rem", textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
            + Create New QR
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total QR Codes", value: qrCodes?.length ?? 0, icon: "⚡", color: "var(--purple)" },
            { label: "Total Scans", value: totalScans, icon: "📊", color: "var(--green)" },
            { label: "Active Codes", value: activeCount, icon: "✅", color: "var(--green)" },
            { label: "Dynamic QRs", value: dynamicCount, icon: "🔄", color: "var(--amber)" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 18px" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "var(--white)", marginBottom: 4 }}>{stat.value.toLocaleString()}</div>
              <div style={{ fontSize: ".78rem", color: "var(--tmuted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Upgrade banner for free users */}
        {subscription?.plan === "free" && (
          <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(245,158,11,0.08))", border: "1px solid var(--bp)", borderRadius: 16, padding: "20px 24px", marginBottom: 28, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: "1.5rem" }}>🚀</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>Upgrade to Pro for Dynamic QR Codes & Analytics</div>
              <div style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Track scans, update destinations, and unlock unlimited QR codes.</div>
            </div>
            <a href="/pricing" style={{ background: "linear-gradient(135deg,var(--purple),var(--purpleD))", color: "#fff", borderRadius: "var(--r12)", padding: "10px 20px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".85rem", textDecoration: "none", whiteSpace: "nowrap" }}>Upgrade — $9/mo</a>
          </div>
        )}

        {/* QR Code list */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--tmuted)" }}>
            <div style={{ width: 40, height: 40, border: "3px solid rgba(124,58,237,0.25)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin .65s linear infinite", margin: "0 auto 16px" }} />
            Loading your QR codes…
          </div>
        ) : !qrCodes || qrCodes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 20 }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚡</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--white)", marginBottom: 8 }}>No QR codes yet</h2>
            <p style={{ color: "var(--tmuted)", marginBottom: 24 }}>Generate your first QR code and save it to your account.</p>
            <a href="/" style={{ display: "inline-block", background: "linear-gradient(135deg,var(--purple),var(--purpleD))", color: "#fff", borderRadius: "var(--r12)", padding: "12px 28px", fontFamily: "'Syne', sans-serif", fontWeight: 700, textDecoration: "none" }}>Create QR Code</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {qrCodes.map(qr => (
              <div key={qr.id} style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", transition: "border-color var(--tr)" }}
                onMouseOver={e => (e.currentTarget.style.borderColor = "var(--bp)")}
                onMouseOut={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                {editingId === qr.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="QR code name" style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--white)", padding: "10px 14px", fontSize: ".9rem", fontFamily: "'DM Sans', sans-serif" }} />
                    {qr.isDynamic && (
                      <input type="text" value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Destination URL" style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--white)", padding: "10px 14px", fontSize: ".9rem", fontFamily: "'DM Sans', sans-serif" }} />
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => updateMutation.mutate({ id: qr.id, name: editName, ...(qr.isDynamic ? { content: editContent } : {}) })}
                        style={{ background: "linear-gradient(135deg,var(--purple),var(--purpleD))", border: "none", borderRadius: "var(--r12)", color: "#fff", padding: "8px 20px", fontSize: ".85rem", fontWeight: 700, cursor: "pointer" }}>
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--tmuted)", padding: "8px 20px", fontSize: ".85rem", cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".95rem", color: "var(--white)" }}>{qr.name}</span>
                        {qr.isDynamic && <span style={{ fontSize: ".65rem", fontWeight: 800, color: "var(--amber)", background: "var(--adim)", border: "1px solid var(--amber)", borderRadius: "var(--rfull)", padding: "2px 8px" }}>Dynamic</span>}
                        <span style={{ fontSize: ".65rem", fontWeight: 700, color: "var(--purpleL)", background: "var(--pdim)", border: "1px solid var(--bp)", borderRadius: "var(--rfull)", padding: "2px 8px", textTransform: "uppercase" }}>{qr.type}</span>
                      </div>
                      <div style={{ fontSize: ".78rem", color: "var(--tmuted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>{qr.content}</div>
                      <div style={{ fontSize: ".75rem", color: "var(--tdim)", marginTop: 4 }}>{new Date(qr.createdAt).toLocaleDateString()}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "1.1rem" }}>📊</span>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".95rem", color: "var(--white)" }}>{qr.scanCount}</span>
                      <span style={{ fontSize: ".75rem", color: "var(--tmuted)" }}>scans</span>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => navigate(`/analytics/${qr.id}`)} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--t2)", padding: "7px 14px", fontSize: ".8rem", fontWeight: 600, cursor: "pointer", transition: "all var(--tr)" }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = "var(--bp)"; e.currentTarget.style.color = "var(--purpleL)"; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)"; }}>
                        Analytics
                      </button>
                      <button onClick={() => { setEditingId(qr.id); setEditName(qr.name); setEditContent(qr.content); }}
                        style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--t2)", padding: "7px 14px", fontSize: ".8rem", fontWeight: 600, cursor: "pointer", transition: "all var(--tr)" }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = "var(--bp)"; e.currentTarget.style.color = "var(--purpleL)"; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)"; }}>
                        Edit
                      </button>
                      <button onClick={() => toggleMutation.mutate({ id: qr.id, isActive: !qr.isActive })}
                        style={{ background: "var(--s2)", border: `1px solid ${qr.isActive ? "var(--green)" : "var(--border)"}`, borderRadius: "var(--r12)", color: qr.isActive ? "var(--green)" : "var(--tmuted)", padding: "7px 14px", fontSize: ".8rem", fontWeight: 600, cursor: "pointer", transition: "all var(--tr)" }}>
                        {qr.isActive ? "Active" : "Paused"}
                      </button>
                      {deleteConfirm === qr.id ? (
                        <>
                          <button onClick={() => deleteMutation.mutate({ id: qr.id })} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid var(--red)", borderRadius: "var(--r12)", color: "var(--red)", padding: "7px 14px", fontSize: ".8rem", fontWeight: 700, cursor: "pointer" }}>Confirm Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--tmuted)", padding: "7px 14px", fontSize: ".8rem", cursor: "pointer" }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(qr.id)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--tmuted)", padding: "7px 14px", fontSize: ".8rem", cursor: "pointer", transition: "all var(--tr)" }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--tmuted)"; }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ textAlign: "center", padding: "32px 24px", color: "var(--tdim)", fontSize: ".78rem", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        © {new Date().getFullYear()} QR Studio. All rights reserved.
      </footer>
    </div>
  );
}
