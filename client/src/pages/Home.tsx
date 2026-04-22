import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import QRCodeStyling from "qr-code-styling";

// ── Types ─────────────────────────────────────────────────────────────────────
type QrType = "url" | "text" | "wifi" | "vcard" | "email" | "phone" | "instagram" | "location" | "pdf";
type PlanId = "free" | "pro" | "business";

const PLANS: { id: PlanId; label: string; price: string; period: string; features: string[]; popular?: boolean }[] = [
  {
    id: "free",
    label: "Free",
    price: "$0",
    period: "forever",
    features: ["5 QR codes", "PNG & SVG download", "Custom colors & logo", "Basic types"],
  },
  {
    id: "pro",
    label: "Pro",
    price: "$9",
    period: "/month",
    features: ["Unlimited QR codes", "Dynamic QR codes", "Scan analytics", "All QR types", "Priority support"],
    popular: true,
  },
  {
    id: "business",
    label: "Business",
    price: "$29",
    period: "/month",
    features: ["Everything in Pro", "Team access", "API access", "White-label", "Custom domain"],
  },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Marketing Manager", text: "QR Studio saved us hours every week. The dynamic QR codes are a game-changer for our campaigns.", avatar: "SM" },
  { name: "Ahmed R.", role: "Restaurant Owner", text: "We replaced all our printed menus with QR codes. Setup took 5 minutes and customers love it.", avatar: "AR" },
  { name: "Lisa K.", role: "Event Coordinator", text: "The analytics dashboard shows exactly how many people scanned each QR. Incredibly useful.", avatar: "LK" },
];

// ── QR Code generation helper ─────────────────────────────────────────────────
function buildQrContent(type: QrType, fields: Record<string, string>): string {
  switch (type) {
    case "url": return fields.url || "";
    case "text": return fields.text || "";
    case "wifi": {
      const enc = fields.wifiEnc || "WPA";
      const hidden = fields.wifiHidden === "true" ? "H:true;" : "";
      return `WIFI:T:${enc};S:${fields.wifiSsid || ""};P:${fields.wifiPass || ""};${hidden};`;
    }
    case "vcard":
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${fields.vcardFname || ""} ${fields.vcardLname || ""}\nTEL:${fields.vcardPhone || ""}\nEMAIL:${fields.vcardEmail || ""}\nORG:${fields.vcardOrg || ""}\nTITLE:${fields.vcardTitle || ""}\nURL:${fields.vcardUrl || ""}\nEND:VCARD`;
    case "email":
      return `mailto:${fields.emailTo || ""}?subject=${encodeURIComponent(fields.emailSubject || "")}&body=${encodeURIComponent(fields.emailBody || "")}`;
    case "phone":
      return `tel:${fields.phone || ""}`;
    case "instagram":
      return `https://instagram.com/${(fields.igHandle || "").replace(/^@/, "")}`;
    case "location":
      return `geo:${fields.lat || "0"},${fields.lng || "0"}?q=${encodeURIComponent(fields.locationName || "")}`;
    case "pdf":
      return fields.pdfUrl || "";
    default:
      return "";
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // QR state
  const [activeType, setActiveType] = useState<QrType>("url");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [darkColor, setDarkColor] = useState("#000000");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [size, setSize] = useState(240);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [customOpen, setCustomOpen] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);
  const [qrName, setQrName] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; darkColor: string; lightColor: string; description: string }[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // QR rendering
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const livePreviewRef = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<QRCodeStyling | null>(null);
  const liveQrInstance = useRef<QRCodeStyling | null>(null);

  // tRPC
  const totalCountQuery = trpc.qr.totalCount.useQuery();
  const saveQrMutation = trpc.qr.save.useMutation();
  const aiStyleMutation = trpc.qr.aiStyle.useMutation();

  // ── AI Style Suggestions ─────────────────────────────────────────────────────
  const handleAiStyle = async () => {
    const content = buildQrContent(activeType, fields);
    if (!content) { showToast("Enter some content first."); return; }
    setAiLoading(true);
    setShowAiPanel(true);
    try {
      const result = await aiStyleMutation.mutateAsync({ type: activeType, content });
      setAiSuggestions(result.suggestions);
    } catch {
      showToast("AI suggestions unavailable. Try again.");
      setShowAiPanel(false);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // ── Field update ─────────────────────────────────────────────────────────────
  const setField = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  // ── Logo upload ───────────────────────────────────────────────────────────────
  const handleLogoUpload = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Live preview ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const content = buildQrContent(activeType, fields);
    if (!content || !livePreviewRef.current) return;

    const opts = {
      width: 72, height: 72,
      data: content,
      dotsOptions: { color: darkColor, type: "rounded" as const },
      backgroundOptions: { color: lightColor },
      imageOptions: { crossOrigin: "anonymous", margin: 2 },
      ...(logoDataUrl ? { image: logoDataUrl } : {}),
    };

    if (!liveQrInstance.current) {
      liveQrInstance.current = new QRCodeStyling(opts);
      liveQrInstance.current.append(livePreviewRef.current);
    } else {
      liveQrInstance.current.update(opts);
    }
  }, [fields, activeType, darkColor, lightColor, logoDataUrl]);

  // ── Generate ──────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const content = buildQrContent(activeType, fields);
    if (!content.trim()) { setError("Please enter something to generate a QR code."); return; }
    setError("");
    setLoading(true);

    setTimeout(() => {
      setGenerated(true);
      setLoading(false);

      if (qrContainerRef.current) {
        qrContainerRef.current.innerHTML = "";
        const opts = {
          width: size, height: size,
          data: content,
          dotsOptions: { color: darkColor, type: "rounded" as const },
          backgroundOptions: { color: lightColor },
          imageOptions: { crossOrigin: "anonymous", margin: 4 },
          cornersSquareOptions: { type: "extra-rounded" as const },
          ...(logoDataUrl ? { image: logoDataUrl } : {}),
        };
        qrInstance.current = new QRCodeStyling(opts);
        qrInstance.current.append(qrContainerRef.current);
      }
    }, 600);
  };

  // ── Download ──────────────────────────────────────────────────────────────────
  const handleDownloadPng = () => {
    if (!qrInstance.current) return;
    qrInstance.current.download({ name: "qr-code", extension: "png" });
    showToast("PNG downloaded!");
  };

  const handleDownloadSvg = () => {
    if (!qrInstance.current) return;
    qrInstance.current.download({ name: "qr-code", extension: "svg" });
    showToast("SVG downloaded!");
  };

  // ── Save to account ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    const content = buildQrContent(activeType, fields);
    if (!content) return;
    try {
      await saveQrMutation.mutateAsync({
        name: qrName || `${activeType.toUpperCase()} QR - ${new Date().toLocaleDateString()}`,
        type: activeType,
        content,
        isDynamic,
        customisation: JSON.stringify({ darkColor, lightColor, logoDataUrl, size }),
      });
      setSaveSuccess(true);
      setShowSaveModal(false);
      showToast("QR code saved to your account!");
    } catch {
      showToast("Failed to save. Please try again.");
    }
  };

  const liveContent = buildQrContent(activeType, fields);
  const hasContent = liveContent.trim().length > 0;
  const totalCount = totalCountQuery.data ?? 12847;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      {/* Toast */}
      <div className={`toast-custom${toast ? " show" : ""}`}>{toast}</div>

      {/* ── Nav Auth Bar ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, right: 0, left: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        background: "rgba(10,15,26,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.3rem" }}>⚡</span> QR Studio
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/pricing" style={{ fontSize: ".85rem", color: "var(--tmuted)", transition: "color .2s" }}
            onMouseOver={e => (e.currentTarget.style.color = "var(--white)")}
            onMouseOut={e => (e.currentTarget.style.color = "var(--tmuted)")}>Pricing</a>
          <a href="/blog" style={{ fontSize: ".85rem", color: "var(--tmuted)", transition: "color .2s" }}
            onMouseOver={e => (e.currentTarget.style.color = "var(--white)")}
            onMouseOut={e => (e.currentTarget.style.color = "var(--tmuted)")}>Blog</a>
          {isAuthenticated ? (
            <a href="/dashboard" style={{
              background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)",
              padding: "8px 18px", fontSize: ".85rem", fontWeight: 700, fontFamily: "'Syne', sans-serif",
            }}>Dashboard</a>
          ) : (
            <a href={getLoginUrl()} style={{
              background: "var(--purple)", color: "#fff", borderRadius: "var(--r12)",
              padding: "8px 18px", fontSize: ".85rem", fontWeight: 700, fontFamily: "'Syne', sans-serif",
            }}>Sign In</a>
          )}
        </div>
      </nav>

      {/* ── Hero + Generator ──────────────────────────────────────────────────── */}
      <section style={{
        position: "relative", zIndex: 2, display: "flex", flexDirection: "column",
        alignItems: "center", paddingTop: 120, paddingBottom: 64, paddingLeft: 24, paddingRight: 24,
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(124,58,237,0.1)", border: "1px solid var(--bp)",
          borderRadius: "var(--rfull)", padding: "6px 16px", marginBottom: 24,
          animation: "fadeUp .5s ease both",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 1.5s ease infinite" }} />
          <span style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--purpleL)" }}>
            QR Studio — Free Generator
          </span>
        </div>

        {/* H1 */}
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800, textAlign: "center",
          fontSize: "clamp(2.4rem, 6vw, 3.8rem)", lineHeight: 1.1, marginBottom: 20,
          animation: "fadeUp .5s ease .1s both",
        }}>
          Generate QR Codes<br />
          <span style={{ background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Instantly. Free.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: "1.05rem", color: "var(--tmuted)", textAlign: "center", maxWidth: 520, marginBottom: 28, lineHeight: 1.6, animation: "fadeUp .5s ease .2s both" }}>
          Enter any URL, text, phone number, or email — get a download-ready QR code in seconds.
        </p>

        {/* Stats pills */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 40, animation: "fadeUp .5s ease .25s both" }}>
          {[
            { dot: "var(--green)", text: "100% Free" },
            { dot: "var(--purple)", text: "No Login Required" },
            { dot: "var(--amber)", text: "Instant Download" },
          ].map(s => (
            <div key={s.text} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(17,24,39,0.6)", border: "1px solid var(--border)", borderRadius: "var(--rfull)", padding: "7px 16px", fontSize: ".82rem", color: "var(--t2)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
              {s.text}
            </div>
          ))}
        </div>

        {/* Trust signal */}
        <div style={{ marginBottom: 32, textAlign: "center", animation: "fadeUp .5s ease .3s both" }}>
          <span style={{ fontSize: ".82rem", color: "var(--tmuted)" }}>
            Trusted by <strong style={{ color: "var(--purpleL)" }}>{totalCount.toLocaleString()}+</strong> QR codes generated
          </span>
        </div>

        {/* ── Generator Card ───────────────────────────────────────────────────── */}
        <div style={{
          background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)",
          borderRadius: 24, padding: "36px 32px", width: "100%", maxWidth: 560,
          backdropFilter: "blur(20px)", boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          animation: "fadeUp .5s ease .35s both",
        }}>
          {/* Card title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--purple),var(--purpleD))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>⚡</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--white)" }}>QR Code Generator</span>
          </div>

          {/* Type Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
            {(["url", "text", "wifi", "vcard", "email", "phone", "instagram", "location", "pdf"] as QrType[]).map(t => {
              const icons: Record<QrType, string> = { url: "🔗", text: "📝", wifi: "📶", vcard: "👤", email: "✉️", phone: "📞", instagram: "📸", location: "📍", pdf: "📄" };
              const labels: Record<QrType, string> = { url: "URL", text: "Text", wifi: "Wi-Fi", vcard: "vCard", email: "Email", phone: "Phone", instagram: "Instagram", location: "Location", pdf: "PDF" };              return (
                <button key={t} onClick={() => { setActiveType(t); setGenerated(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
                    borderRadius: "var(--r12)", border: "1px solid",
                    borderColor: activeType === t ? "var(--bp)" : "var(--border)",
                    background: activeType === t ? "var(--pdim)" : "transparent",
                    color: activeType === t ? "var(--purpleL)" : "var(--tmuted)",
                    fontSize: ".8rem", fontWeight: 600, transition: "all var(--tr)", cursor: "pointer",
                  }}>
                  <span>{icons[t]}</span><span>{labels[t]}</span>
                </button>
              );
            })}
          </div>

          {/* Input Panels */}
          <div style={{ marginBottom: 20 }}>
            {activeType === "url" && (
              <InputGroup label="Website URL">
                <input type="url" placeholder="https://yourwebsite.com" value={fields.url || ""}
                  onChange={e => setField("url", e.target.value)}
                  style={inputStyle} />
              </InputGroup>
            )}
            {activeType === "text" && (
              <InputGroup label="Text / Message">
                <textarea placeholder="Enter any text or message…" value={fields.text || ""}
                  onChange={e => setField("text", e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </InputGroup>
            )}
            {activeType === "wifi" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InputGroup label="Network Name (SSID)">
                  <input type="text" placeholder="MyHomeNetwork" value={fields.wifiSsid || ""}
                    onChange={e => setField("wifiSsid", e.target.value)} style={inputStyle} />
                </InputGroup>
                <InputGroup label="Password">
                  <input type="password" placeholder="••••••••" value={fields.wifiPass || ""}
                    onChange={e => setField("wifiPass", e.target.value)} style={inputStyle} />
                </InputGroup>
                <InputGroup label="Encryption">
                  <select value={fields.wifiEnc || "WPA"} onChange={e => setField("wifiEnc", e.target.value)} style={inputStyle}>
                    <option value="WPA">WPA / WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None (Open)</option>
                  </select>
                </InputGroup>
              </div>
            )}
            {activeType === "vcard" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InputGroup label="First Name"><input type="text" placeholder="Ahmed" value={fields.vcardFname || ""} onChange={e => setField("vcardFname", e.target.value)} style={inputStyle} /></InputGroup>
                <InputGroup label="Last Name"><input type="text" placeholder="Al-Rashid" value={fields.vcardLname || ""} onChange={e => setField("vcardLname", e.target.value)} style={inputStyle} /></InputGroup>
                <InputGroup label="Phone"><input type="tel" placeholder="+966 5X XXX XXXX" value={fields.vcardPhone || ""} onChange={e => setField("vcardPhone", e.target.value)} style={inputStyle} /></InputGroup>
                <InputGroup label="Email"><input type="email" placeholder="ahmed@company.com" value={fields.vcardEmail || ""} onChange={e => setField("vcardEmail", e.target.value)} style={inputStyle} /></InputGroup>
                <InputGroup label="Company"><input type="text" placeholder="My Company" value={fields.vcardOrg || ""} onChange={e => setField("vcardOrg", e.target.value)} style={inputStyle} /></InputGroup>
                <InputGroup label="Job Title"><input type="text" placeholder="CEO" value={fields.vcardTitle || ""} onChange={e => setField("vcardTitle", e.target.value)} style={inputStyle} /></InputGroup>
              </div>
            )}
            {activeType === "email" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <InputGroup label="To (Email Address)"><input type="email" placeholder="recipient@example.com" value={fields.emailTo || ""} onChange={e => setField("emailTo", e.target.value)} style={inputStyle} /></InputGroup>
                <InputGroup label="Subject (optional)"><input type="text" placeholder="Hello!" value={fields.emailSubject || ""} onChange={e => setField("emailSubject", e.target.value)} style={inputStyle} /></InputGroup>
                <InputGroup label="Body (optional)"><textarea placeholder="Your message…" value={fields.emailBody || ""} onChange={e => setField("emailBody", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></InputGroup>
              </div>
            )}
            {activeType === "phone" && (
              <InputGroup label="Phone Number">
                <input type="tel" placeholder="+966 5X XXX XXXX" value={fields.phone || ""}
                  onChange={e => setField("phone", e.target.value)} style={inputStyle} />
              </InputGroup>
            )}
            {activeType === "instagram" && (
              <InputGroup label="Instagram Username">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--tmuted)", fontSize: ".9rem", pointerEvents: "none" }}>@</span>
                  <input type="text" placeholder="yourusername" value={fields.igHandle || ""}
                    onChange={e => setField("igHandle", e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 32 }} />
                </div>
                <p style={{ fontSize: ".75rem", color: "var(--tmuted)", marginTop: 6 }}>Generates a QR that opens your Instagram profile directly.</p>
              </InputGroup>
            )}
            {activeType === "location" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <InputGroup label="Place Name (optional)">
                  <input type="text" placeholder="Burj Khalifa, Dubai" value={fields.locationName || ""}
                    onChange={e => setField("locationName", e.target.value)} style={inputStyle} />
                </InputGroup>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <InputGroup label="Latitude">
                    <input type="number" step="any" placeholder="25.1972" value={fields.lat || ""}
                      onChange={e => setField("lat", e.target.value)} style={inputStyle} />
                  </InputGroup>
                  <InputGroup label="Longitude">
                    <input type="number" step="any" placeholder="55.2744" value={fields.lng || ""}
                      onChange={e => setField("lng", e.target.value)} style={inputStyle} />
                  </InputGroup>
                </div>
                <p style={{ fontSize: ".75rem", color: "var(--tmuted)" }}>Opens Google Maps to the exact coordinates when scanned.</p>
              </div>
            )}
            {activeType === "pdf" && (
              <InputGroup label="PDF URL">
                <input type="url" placeholder="https://example.com/document.pdf" value={fields.pdfUrl || ""}
                  onChange={e => setField("pdfUrl", e.target.value)} style={inputStyle} />
                <p style={{ fontSize: ".75rem", color: "var(--tmuted)", marginTop: 6 }}>Paste a direct link to your PDF. The QR code will open it when scanned.</p>
              </InputGroup>
            )}
          </div>

          {/* Error */}
          {error && <p style={{ color: "var(--red)", fontSize: ".85rem", marginBottom: 12 }}>⚠ {error}</p>}

          {/* Size */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>QR Code Size</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: 160, l: "Small" }, { v: 240, l: "Medium" }, { v: 320, l: "Large" }].map(s => (
                <button key={s.v} onClick={() => setSize(s.v)} style={{
                  flex: 1, padding: "9px 0", borderRadius: "var(--r12)", border: "1px solid",
                  borderColor: size === s.v ? "var(--bp)" : "var(--border)",
                  background: size === s.v ? "var(--pdim)" : "transparent",
                  color: size === s.v ? "var(--purpleL)" : "var(--tmuted)",
                  fontSize: ".82rem", fontWeight: 600, transition: "all var(--tr)", cursor: "pointer",
                }}>{s.l}</button>
              ))}
            </div>
          </div>

          {/* Customize toggle */}
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setCustomOpen(!customOpen)} style={{
              width: "100%", background: "var(--s2)", border: "1px solid var(--border)",
              borderRadius: "var(--r12)", padding: "12px 16px", color: "var(--t2)",
              fontSize: ".88rem", fontWeight: 600, display: "flex", alignItems: "center",
              justifyContent: "space-between", cursor: "pointer", transition: "all var(--tr)",
            }}>
              <span>🎨 Customize Colors &amp; Logo</span>
              <span style={{ transform: customOpen ? "rotate(180deg)" : "none", transition: "transform .25s", fontSize: ".75rem" }}>▼</span>
            </button>
            {customOpen && (
              <div style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "0 0 var(--r12) var(--r12)", padding: "16px", borderTop: "none" }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>QR Color</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--s1)", border: "1px solid var(--border)", borderRadius: "var(--r12)", padding: "8px 12px" }}>
                      <input type="color" value={darkColor} onChange={e => setDarkColor(e.target.value)} style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
                      <span style={{ fontSize: ".82rem", color: "var(--t2)", fontFamily: "monospace" }}>{darkColor}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Background Color</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--s1)", border: "1px solid var(--border)", borderRadius: "var(--r12)", padding: "8px 12px" }}>
                      <input type="color" value={lightColor} onChange={e => setLightColor(e.target.value)} style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
                      <span style={{ fontSize: ".82rem", color: "var(--t2)", fontFamily: "monospace" }}>{lightColor}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Logo / Icon (optional)</label>
                  <div
                    onClick={() => document.getElementById("logo-input")?.click()}
                    style={{
                      border: "2px dashed var(--border)", borderRadius: "var(--r12)", padding: "20px",
                      textAlign: "center", cursor: "pointer", transition: "border-color var(--tr)",
                    }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = "var(--bp)")}
                    onMouseOut={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {logoDataUrl ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src={logoDataUrl} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain", background: "#fff", padding: 4 }} />
                        <span style={{ fontSize: ".82rem", color: "var(--t2)" }}>{logoFile?.name}</span>
                        <button onClick={e => { e.stopPropagation(); setLogoFile(null); setLogoDataUrl(""); }}
                          style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--tmuted)", cursor: "pointer", fontSize: ".75rem" }}>✕ Remove</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>🖼️</div>
                        <p style={{ fontSize: ".78rem", color: "var(--tmuted)" }}>Click to upload logo (PNG, JPG, SVG)</p>
                      </>
                    )}
                  </div>
                  <input id="logo-input" type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                </div>
              </div>
            )}
          </div>

          {/* AI Style Suggestions */}
          {hasContent && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={handleAiStyle} disabled={aiLoading}
                style={{
                  width: "100%", background: "var(--s2)", border: "1px solid var(--bp)",
                  borderRadius: "var(--r12)", padding: "12px 16px", color: "var(--purpleL)",
                  fontSize: ".88rem", fontWeight: 600, display: "flex", alignItems: "center",
                  justifyContent: "space-between", cursor: aiLoading ? "not-allowed" : "pointer",
                  transition: "all var(--tr)", opacity: aiLoading ? 0.7 : 1,
                }}
                onMouseOver={e => { if (!aiLoading) e.currentTarget.style.background = "var(--pdim)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "var(--s2)"; }}
              >
                <span>✨ AI Style Suggestions</span>
                {aiLoading ? (
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin .65s linear infinite", display: "inline-block" }} />
                ) : (
                  <span style={{ fontSize: ".75rem" }}>Get 4 AI-generated color schemes →</span>
                )}
              </button>
              {showAiPanel && !aiLoading && aiSuggestions.length > 0 && (
                <div style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "0 0 var(--r12) var(--r12)", padding: "16px", borderTop: "none" }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--tmuted)", marginBottom: 12 }}>AI-Suggested Color Schemes</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {aiSuggestions.map((s, i) => (
                      <button key={i} onClick={() => { setDarkColor(s.darkColor); setLightColor(s.lightColor); setShowAiPanel(false); showToast(`Applied: ${s.name}`); }}
                        style={{
                          background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 10,
                          padding: "12px", cursor: "pointer", textAlign: "left", transition: "all var(--tr)",
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = "var(--bp)"; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, background: s.darkColor, border: "1px solid rgba(255,255,255,0.1)" }} />
                          <div style={{ width: 20, height: 20, borderRadius: 4, background: s.lightColor, border: "1px solid rgba(255,255,255,0.1)" }} />
                        </div>
                        <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--white)", marginBottom: 2 }}>{s.name}</div>
                        <div style={{ fontSize: ".7rem", color: "var(--tmuted)", lineHeight: 1.4 }}>{s.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live preview */}
          {hasContent && (
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              background: "rgba(22,31,48,0.6)", border: "1px solid var(--border)",
              borderRadius: "var(--r12)", padding: "14px 18px", marginBottom: 20,
              animation: "fadeUp .3s ease both",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: ".68rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--purpleL)", marginBottom: 4 }}>Live Preview</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".65rem", fontWeight: 700, color: "var(--green)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 1.5s ease infinite" }} />
                  Auto-updating
                </div>
              </div>
              <div ref={livePreviewRef} style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", background: "#fff", padding: 4, flexShrink: 0 }} />
            </div>
          )}

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={loading}
            style={{
              width: "100%", background: "linear-gradient(135deg,#7C3AED 0%,#5B21B6 50%,#7C3AED 100%)",
              backgroundSize: "200% 100%", border: "none", borderRadius: "var(--r12)",
              color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: "1rem", fontWeight: 700,
              letterSpacing: ".04em", textTransform: "uppercase", padding: "18px 32px",
              cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 12, transition: "all var(--tr)",
              boxShadow: "0 4px 24px rgba(124,58,237,0.4)", opacity: loading ? 0.6 : 1,
            }}>
            {loading ? (
              <span style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .65s linear infinite", display: "inline-block" }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /></svg>
            )}
            Generate QR Code
          </button>

          {/* Output */}
          {generated && (
            <div style={{ marginTop: 32, animation: "fadeUp .5s ease both" }}>
              <p style={{
                textAlign: "center", fontSize: ".68rem", fontWeight: 800, letterSpacing: ".14em",
                textTransform: "uppercase", color: "var(--tmuted)", marginBottom: 20,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,var(--border))", display: "block" }} />
                Your QR Code
                <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,var(--border),transparent)", display: "block" }} />
              </p>
              <div style={{ background: "#fff", borderRadius: 20, padding: 20, display: "block", width: "fit-content", margin: "0 auto 20px", boxShadow: "0 0 0 1px rgba(124,58,237,0.2), 0 20px 60px rgba(0,0,0,0.5)" }}>
                <div ref={qrContainerRef} />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
                <ActionBtn onClick={handleDownloadPng} icon="⬇">Download PNG</ActionBtn>
                <ActionBtn onClick={handleDownloadSvg} icon="⬇">Download SVG</ActionBtn>
                <ActionBtn onClick={() => setShowSaveModal(true)} icon="💾" highlight>Save to Account</ActionBtn>
              </div>

              {/* Promo banner */}
              <a href="/pricing" style={{
                display: "block", marginTop: 16,
                background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(245,158,11,0.08))",
                border: "1px solid var(--bp)", borderRadius: 20, padding: "24px 28px",
                textDecoration: "none", position: "relative", overflow: "hidden", transition: "all var(--tr)",
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = "var(--amber)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = "var(--bp)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ width: 52, height: 52, flexShrink: 0, background: "linear-gradient(135deg,var(--pdim),var(--adim))", border: "1px solid var(--bp)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🎨</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "inline-block", background: "linear-gradient(135deg,var(--pdim),var(--adim))", border: "1px solid var(--bp)", borderRadius: "var(--rfull)", color: "var(--amber)", fontSize: ".62rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", padding: "3px 12px", marginBottom: 7 }}>✦ Pro · From $9/mo</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "var(--white)", marginBottom: 3 }}>Unlock Dynamic QR Codes + Analytics</div>
                    <div style={{ fontSize: ".82rem", color: "var(--tmuted)" }}>Track scans, update destinations, and grow your business.</div>
                  </div>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", background: "linear-gradient(135deg,var(--purple),var(--purpleD))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </a>
            </div>
          )}
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 32, paddingBottom: 64, animation: "fadeUp .7s var(--ease) .3s both" }}>
          {["High error correction", "URL, Wi-Fi, vCard, email, phone", "PNG & SVG download · No account", "Custom colors & logo"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(17,24,39,0.5)", border: "1px solid var(--border)", borderRadius: "var(--rfull)", padding: "8px 16px", fontSize: ".78rem", color: "var(--tmuted)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {f}
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--white)", textAlign: "center", marginBottom: 32 }}>
          Loved by thousands of creators
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 20px", transition: "border-color var(--tr)" }}
              onMouseOver={e => (e.currentTarget.style.borderColor = "var(--bp)")}
              onMouseOut={e => (e.currentTarget.style.borderColor = "var(--border)")}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,var(--purple),var(--purpleD))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: ".9rem", color: "#fff", flexShrink: 0 }}>{t.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--white)" }}>{t.name}</div>
                  <div style={{ fontSize: ".78rem", color: "var(--tmuted)" }}>{t.role}</div>
                </div>
              </div>
              <p style={{ fontSize: ".88rem", color: "var(--t2)", lineHeight: 1.6 }}>"{t.text}"</p>
              <div style={{ marginTop: 12, color: "var(--amber)", fontSize: ".85rem" }}>★★★★★</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing Preview ───────────────────────────────────────────────────── */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 24px 80px", maxWidth: 960, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--white)", textAlign: "center", marginBottom: 8 }}>Simple, transparent pricing</h2>
        <p style={{ textAlign: "center", color: "var(--tmuted)", fontSize: ".9rem", marginBottom: 40 }}>Start free. Upgrade when you need more.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: "var(--s1)", border: `1.5px solid ${plan.popular ? "var(--amber)" : "var(--border)"}`,
              borderRadius: 16, padding: "24px 16px", textAlign: "center", position: "relative",
              transition: "all var(--tr)",
            }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = plan.popular ? "var(--amber)" : "var(--bp)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = plan.popular ? "var(--amber)" : "var(--border)"; }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,var(--amber),#f97316)", color: "#000", fontSize: ".6rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "var(--rfull)", whiteSpace: "nowrap" }}>Most Popular</div>
              )}
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "var(--white)", marginBottom: 4 }}>{plan.price}</div>
              <div style={{ fontSize: ".75rem", color: "var(--tmuted)", marginBottom: 4 }}>{plan.period}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "var(--purpleL)", marginBottom: 16 }}>{plan.label}</div>
              <ul style={{ listStyle: "none", fontSize: ".72rem", color: "var(--t2)", lineHeight: 1.8, textAlign: "left" }}>
                {plan.features.map(f => (
                  <li key={f} style={{ paddingLeft: 14, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--green)", fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/pricing" style={{
                display: "block", marginTop: 20, padding: "10px 0",
                background: plan.popular ? "linear-gradient(135deg,var(--purple),var(--purpleD))" : "transparent",
                border: `1px solid ${plan.popular ? "transparent" : "var(--border)"}`,
                borderRadius: "var(--r12)", color: plan.popular ? "#fff" : "var(--tmuted)",
                fontSize: ".82rem", fontWeight: 700, fontFamily: "'Syne', sans-serif",
                transition: "all var(--tr)", textDecoration: "none",
              }}>
                {plan.id === "free" ? "Get Started Free" : `Get ${plan.label}`}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <FaqSection />

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: "center", padding: "32px 24px", color: "var(--tdim)", fontSize: ".78rem", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          <a href="/pricing" style={{ color: "var(--tmuted)", transition: "color .2s" }} onMouseOver={e => (e.currentTarget.style.color = "var(--white)")} onMouseOut={e => (e.currentTarget.style.color = "var(--tmuted)")}>Pricing</a>
          <a href="/blog" style={{ color: "var(--tmuted)", transition: "color .2s" }} onMouseOver={e => (e.currentTarget.style.color = "var(--white)")} onMouseOut={e => (e.currentTarget.style.color = "var(--tmuted)")}>Blog</a>
          <a href="/dashboard" style={{ color: "var(--tmuted)", transition: "color .2s" }} onMouseOver={e => (e.currentTarget.style.color = "var(--white)")} onMouseOut={e => (e.currentTarget.style.color = "var(--tmuted)")}>Dashboard</a>
        </div>
        © {new Date().getFullYear()} QR Studio. All rights reserved.
      </footer>

      {/* ── Save Modal ────────────────────────────────────────────────────────── */}
      {showSaveModal && (
        <Modal onClose={() => setShowSaveModal(false)}>
          <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: 16 }}>💾</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.4rem", fontWeight: 800, color: "var(--white)", textAlign: "center", marginBottom: 10 }}>Save QR Code</h2>
          <p style={{ fontSize: ".9rem", color: "var(--tmuted)", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
            {isAuthenticated ? "Give your QR code a name and save it to your account." : "Sign in to save and manage your QR codes."}
          </p>
          {isAuthenticated ? (
            <>
              <input type="text" placeholder="QR Code name (e.g. My Website)" value={qrName}
                onChange={e => setQrName(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 12 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, cursor: "pointer", fontSize: ".85rem", color: "var(--t2)" }}>
                <input type="checkbox" checked={isDynamic} onChange={e => setIsDynamic(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--purple)", cursor: "pointer" }} />
                Make this a Dynamic QR (editable destination)
                <span style={{ fontSize: ".72rem", color: "var(--amber)", background: "var(--adim)", border: "1px solid var(--amber)", borderRadius: "var(--rfull)", padding: "2px 8px" }}>Pro</span>
              </label>
              <button onClick={handleSave} disabled={saveQrMutation.isPending}
                style={{ width: "100%", background: "linear-gradient(135deg,#7C3AED,#5B21B6)", border: "none", borderRadius: "var(--r12)", color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: ".95rem", fontWeight: 700, padding: 15, cursor: "pointer", marginBottom: 10 }}>
                {saveQrMutation.isPending ? "Saving…" : "Save QR Code"}
              </button>
            </>
          ) : (
            <a href={getLoginUrl()} style={{ display: "block", width: "100%", background: "linear-gradient(135deg,#7C3AED,#5B21B6)", border: "none", borderRadius: "var(--r12)", color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: ".95rem", fontWeight: 700, padding: 15, textAlign: "center", textDecoration: "none", marginBottom: 10 }}>
              Sign In to Save
            </a>
          )}
          <button onClick={() => setShowSaveModal(false)} style={{ width: "100%", background: "none", border: "1px solid var(--border)", borderRadius: "var(--r12)", color: "var(--tmuted)", fontFamily: "'DM Sans', sans-serif", fontSize: ".88rem", padding: 13, cursor: "pointer" }}>
            Cancel
          </button>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ActionBtn({ onClick, icon, children, highlight }: { onClick: () => void; icon: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8,
      background: highlight ? "linear-gradient(135deg,var(--purple),var(--purpleD))" : "var(--s1)",
      border: `1px solid ${highlight ? "transparent" : "var(--border)"}`,
      borderRadius: "var(--r12)", color: highlight ? "#fff" : "var(--t2)",
      fontFamily: "'DM Sans', sans-serif", fontSize: ".88rem", fontWeight: 600,
      padding: "12px 22px", cursor: "pointer", transition: "all var(--tr)",
    }}
      onMouseOver={e => { e.currentTarget.style.borderColor = "var(--bp)"; e.currentTarget.style.color = highlight ? "#fff" : "var(--purpleL)"; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = highlight ? "transparent" : "var(--border)"; e.currentTarget.style.color = highlight ? "#fff" : "var(--t2)"; }}>
      {icon} {children}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--s1)", border: "1px solid var(--bp)", borderRadius: 24, padding: "36px 32px", maxWidth: 480, width: "100%", position: "relative", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", animation: "scaleIn .3s var(--ease) both" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--tmuted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, padding: 4 }}>✕</button>
        {children}
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  { q: "Is QR Studio really free?", a: "Yes! The core QR code generator is completely free — no sign-up required. You can generate, customise, and download QR codes in PNG and SVG format at no cost. Pro and Business plans unlock dynamic QR codes, scan analytics, and more." },
  { q: "What is a dynamic QR code?", a: "A dynamic QR code uses a short redirect URL, so you can change the destination anytime without reprinting the QR code. It also tracks scan analytics including device, location, and time." },
  { q: "Can I add my logo to the QR code?", a: "Absolutely! Use the 'Customize Colors & Logo' section to upload your logo. It will be embedded in the centre of the QR code while maintaining scannability." },
  { q: "What file formats can I download?", a: "You can download your QR code as a high-resolution PNG (ideal for digital use) or as a scalable SVG (perfect for print at any size)." },
  { q: "Do I need an account to use QR Studio?", a: "No account is needed to generate and download QR codes. Creating an account unlocks the ability to save, manage, and track your QR codes over time." },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 680, margin: "0 auto", padding: "0 24px 80px" }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--white)", textAlign: "center", marginBottom: 32 }}>Frequently Asked Questions</h2>
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} style={{ border: `1px solid ${open === i ? "var(--bp)" : "var(--border)"}`, borderRadius: "var(--r12)", marginBottom: 10, overflow: "hidden", transition: "border-color var(--tr)" }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{
            width: "100%", background: "var(--s1)", border: "none", color: "var(--t2)",
            fontFamily: "'DM Sans', sans-serif", fontSize: ".92rem", fontWeight: 600,
            padding: "18px 20px", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            {item.q}
            <span style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .25s", color: "var(--tmuted)", flexShrink: 0 }}>▼</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 20px 18px", background: "var(--s1)", color: "var(--tmuted)", fontSize: ".88rem", lineHeight: 1.7 }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--s2)", border: "1px solid var(--border)",
  borderRadius: "var(--r12)", color: "var(--white)", fontFamily: "'DM Sans', sans-serif",
  fontSize: ".9rem", padding: "12px 14px", transition: "border-color var(--tr)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: ".78rem", fontWeight: 600, color: "var(--tmuted)",
  marginBottom: 6, letterSpacing: ".04em",
};
