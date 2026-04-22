import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useRef } from "react";
import { toast } from "sonner";
import QRCodeStyling from "qr-code-styling";

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--s1)", border: "1px solid var(--border)",
  borderRadius: "var(--r12)", padding: "12px 16px", color: "var(--white)",
  fontSize: ".9rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em",
  textTransform: "uppercase", color: "var(--tmuted)", marginBottom: 6,
};

type BulkRow = { label: string; url: string; status: "pending" | "done" | "error" };

const SAMPLE_CSV = `Label,URL
My Website,https://example.com
Instagram,https://instagram.com/myprofile
LinkedIn,https://linkedin.com/in/myprofile
Twitter,https://twitter.com/myhandle
YouTube,https://youtube.com/@mychannel`;

export default function BulkQR() {
  const { isAuthenticated, user } = useAuth();
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [darkColor, setDarkColor] = useState("#000000");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isPro = user?.plan === "pro" || user?.plan === "business";

  const parseCSV = (text: string): BulkRow[] => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    const result: BulkRow[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (i === 0 && line.toLowerCase().startsWith("label")) continue; // skip header
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 2 && parts[1]) {
        result.push({ label: parts[0] || `QR ${i}`, url: parts[1], status: "pending" });
      }
    }
    return result;
  };

  const handleParse = () => {
    if (!csvText.trim()) { toast.error("Paste CSV data first."); return; }
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) { toast.error("No valid rows found. Format: Label,URL"); return; }
    if (parsed.length > 50) { toast.error("Maximum 50 QR codes per batch."); return; }
    setRows(parsed);
    setProgress(0);
    toast.success(`Parsed ${parsed.length} rows. Ready to generate.`);
  };

  const handleGenerate = async () => {
    if (rows.length === 0) return;
    setGenerating(true);
    setProgress(0);
    const updated = [...rows];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const qr = new QRCodeStyling({
          width: 300, height: 300,
          type: "canvas",
          data: row.url,
          dotsOptions: { color: darkColor, type: "rounded" },
          backgroundOptions: { color: lightColor },
          cornersSquareOptions: { type: "extra-rounded" },
          qrOptions: { errorCorrectionLevel: "M" },
        });
        const blob = await qr.getRawData("png");
        if (blob) {
          const fileBlob = blob instanceof Blob ? blob : new Blob([new Uint8Array(blob as unknown as ArrayBuffer)], { type: "image/png" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(fileBlob);
          a.download = `${row.label.replace(/[^a-z0-9]/gi, "_")}_qr.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        updated[i] = { ...row, status: "done" };
      } catch {
        updated[i] = { ...row, status: "error" };
      }
      setRows([...updated]);
      setProgress(Math.round(((i + 1) / rows.length) * 100));
      await new Promise(r => setTimeout(r, 300)); // stagger downloads
    }
    setGenerating(false);
    toast.success(`Generated ${updated.filter(r => r.status === "done").length} QR codes!`);
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--white)" }}>
      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, right: 0, left: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", background: "rgba(10,15,26,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚡</span> QR Studio
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Generator</a>
          {isAuthenticated ? (
            <a href="/dashboard" style={{ background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)", padding: "8px 18px", fontSize: ".85rem", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>Dashboard</a>
          ) : (
            <a href={getLoginUrl()} style={{ background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)", padding: "8px 18px", fontSize: ".85rem", fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>Sign In</a>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "100px 24px 60px" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.1)", border: "1px solid var(--bp)", borderRadius: "var(--rfull)", padding: "5px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--purpleL)" }}>Pro Feature</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "2.2rem", marginBottom: 8 }}>Bulk QR Generator</h1>
          <p style={{ color: "var(--tmuted)", fontSize: "1rem", lineHeight: 1.6 }}>
            Generate up to 50 QR codes at once from a CSV list. All codes download automatically as individual PNG files.
          </p>
        </div>

        {/* Pro gate */}
        {!isPro && (
          <div style={{
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 16, padding: 24, marginBottom: 28, display: "flex", alignItems: "center", gap: 16,
          }}>
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--amber)", marginBottom: 4 }}>Pro Plan Required</div>
              <p style={{ fontSize: ".85rem", color: "var(--tmuted)", marginBottom: 12 }}>Bulk generation is available on the Pro and Business plans.</p>
              <a href="/pricing" style={{ background: "var(--amber)", color: "#000", borderRadius: 8, padding: "8px 18px", fontSize: ".82rem", fontWeight: 700, textDecoration: "none" }}>Upgrade to Pro →</a>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* CSV input */}
          <div style={{ gridColumn: "1 / -1", background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <label style={labelStyle}>CSV Data (Label, URL)</label>
              <button onClick={() => setCsvText(SAMPLE_CSV)} style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", color: "var(--tmuted)", fontSize: ".75rem", cursor: "pointer" }}>Load Sample</button>
            </div>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={"Label,URL\nMy Website,https://example.com\nInstagram,https://instagram.com/myprofile"}
              rows={8}
              disabled={!isPro}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: ".82rem", opacity: isPro ? 1 : 0.5 }}
            />
            <p style={{ fontSize: ".75rem", color: "var(--tmuted)", marginTop: 8 }}>
              Format: <code style={{ background: "var(--s2)", padding: "1px 6px", borderRadius: 4 }}>Label,URL</code> — one per line. Header row optional. Max 50 rows.
            </p>
          </div>

          {/* Colors */}
          <div style={{ background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <label style={labelStyle}>QR Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--s1)", border: "1px solid var(--border)", borderRadius: "var(--r12)", padding: "8px 12px" }}>
              <input type="color" value={darkColor} onChange={e => setDarkColor(e.target.value)} style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
              <span style={{ fontSize: ".82rem", color: "var(--t2)", fontFamily: "monospace" }}>{darkColor}</span>
            </div>
          </div>
          <div style={{ background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <label style={labelStyle}>Background Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--s1)", border: "1px solid var(--border)", borderRadius: "var(--r12)", padding: "8px 12px" }}>
              <input type="color" value={lightColor} onChange={e => setLightColor(e.target.value)} style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
              <span style={{ fontSize: ".82rem", color: "var(--t2)", fontFamily: "monospace" }}>{lightColor}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <button onClick={handleParse} disabled={!isPro || !csvText.trim()} style={{
            background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)",
            padding: "14px 24px", color: "var(--t2)", fontWeight: 600, fontSize: ".9rem",
            cursor: (!isPro || !csvText.trim()) ? "not-allowed" : "pointer", opacity: (!isPro || !csvText.trim()) ? 0.5 : 1,
          }}>📋 Parse CSV ({rows.length} rows)</button>
          <button onClick={handleGenerate} disabled={!isPro || rows.length === 0 || generating} style={{
            background: "linear-gradient(135deg,#7C3AED,#5B21B6)", border: "none", borderRadius: "var(--r12)",
            padding: "14px 28px", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: ".9rem", cursor: (!isPro || rows.length === 0 || generating) ? "not-allowed" : "pointer",
            opacity: (!isPro || rows.length === 0 || generating) ? 0.5 : 1,
          }}>{generating ? `Generating… ${progress}%` : `⚡ Generate ${rows.length > 0 ? rows.length : ""} QR Codes`}</button>
        </div>

        {/* Progress bar */}
        {generating && (
          <div style={{ background: "var(--s2)", borderRadius: "var(--rfull)", height: 6, marginBottom: 24, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg,#7C3AED,#A78BFA)", width: `${progress}%`, transition: "width .3s ease", borderRadius: "var(--rfull)" }} />
          </div>
        )}

        {/* Row list */}
        {rows.length > 0 && (
          <div style={{ background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{rows.length} QR Codes</span>
              <span style={{ fontSize: ".8rem", color: "var(--tmuted)" }}>
                {rows.filter(r => r.status === "done").length} done · {rows.filter(r => r.status === "error").length} errors
              </span>
            </div>
            {rows.map((row, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem",
                  background: row.status === "done" ? "rgba(16,185,129,0.15)" : row.status === "error" ? "rgba(239,68,68,0.15)" : "rgba(124,58,237,0.15)",
                  color: row.status === "done" ? "var(--green)" : row.status === "error" ? "var(--red)" : "var(--purpleL)",
                }}>
                  {row.status === "done" ? "✓" : row.status === "error" ? "✗" : (i + 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: ".88rem", color: "var(--white)" }}>{row.label}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--tmuted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.url}</div>
                </div>
                <div ref={el => { canvasRefs.current[i] = el; }} style={{ display: "none" }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
