import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, loading } = useAuth();
  const qrId = parseInt(id || "0");

  const { data: analytics, isLoading } = trpc.qr.analytics.useQuery({ id: qrId }, { enabled: isAuthenticated && !!qrId });

  if (loading || isLoading) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(124,58,237,0.25)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin .65s linear infinite" }} />
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: "3rem" }}>🔒</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", color: "var(--white)", fontSize: "1.5rem" }}>Sign in to view analytics</h1>
        <a href={getLoginUrl()} style={{ background: "linear-gradient(135deg,var(--purple),var(--purpleD))", color: "#fff", borderRadius: "var(--r12)", padding: "14px 32px", fontFamily: "'Syne', sans-serif", fontWeight: 700, textDecoration: "none" }}>Sign In</a>
      </div>
    );
  }

  if (!analytics) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <h1 style={{ color: "var(--white)", fontFamily: "'Syne', sans-serif" }}>QR Code Not Found</h1>
      <a href="/dashboard" style={{ color: "var(--purpleL)" }}>← Back to Dashboard</a>
    </div>
  );

  const chartData = analytics.dailyScans.map((d: { date: string; count: number }) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    scans: d.count,
  }));

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />

      <nav style={{ position: "fixed", top: 0, right: 0, left: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(10,15,26,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}><span>⚡</span> QR Studio</a>
        <a href="/dashboard" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>← Dashboard</a>
      </nav>

      <div style={{ position: "relative", zIndex: 2, paddingTop: 96, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "var(--white)", marginBottom: 4 }}>{analytics.qr.name}</h1>
          <p style={{ color: "var(--tmuted)", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{analytics.qr.content}</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Scans", value: analytics.totalScans, icon: "📊", color: "var(--purple)" },
            { label: "Last 7 Days", value: analytics.last7Days, icon: "📅", color: "var(--green)" },
            { label: "Last 30 Days", value: analytics.last30Days, icon: "📆", color: "var(--amber)" },
            { label: "Unique Devices", value: analytics.uniqueDevices, icon: "📱", color: "var(--purpleL)" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 18px" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "var(--white)", marginBottom: 4 }}>{stat.value.toLocaleString()}</div>
              <div style={{ fontSize: ".78rem", color: "var(--tmuted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--white)", marginBottom: 24 }}>Scans Over Time (Last 30 Days)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                <XAxis dataKey="date" tick={{ fill: "var(--tmuted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--tmuted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--s1)", border: "1px solid var(--bp)", borderRadius: 12, color: "var(--white)", fontSize: ".85rem" }}
                  cursor={{ fill: "rgba(124,58,237,0.08)" }}
                />
                <Bar dataKey="scans" fill="var(--purple)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--tmuted)" }}>No scan data yet. Share your QR code to start tracking!</div>
          )}
        </div>

        {/* Device breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 20, padding: "24px" }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--white)", marginBottom: 20 }}>Device Breakdown</h2>
            {analytics.deviceBreakdown.length > 0 ? analytics.deviceBreakdown.map((d: { device: string; count: number; pct: number }) => (
              <div key={d.device} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: ".85rem", color: "var(--t2)", textTransform: "capitalize" }}>{d.device}</span>
                  <span style={{ fontSize: ".85rem", color: "var(--white)", fontWeight: 700 }}>{d.count} <span style={{ color: "var(--tmuted)", fontWeight: 400 }}>({d.pct}%)</span></span>
                </div>
                <div style={{ height: 6, background: "var(--s2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.pct}%`, background: "linear-gradient(90deg,var(--purple),var(--purpleL))", borderRadius: 3, transition: "width .5s ease" }} />
                </div>
              </div>
            )) : <div style={{ color: "var(--tmuted)", fontSize: ".88rem" }}>No data yet.</div>}
          </div>

          <div style={{ background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 20, padding: "24px" }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--white)", marginBottom: 20 }}>Recent Scans</h2>
            {analytics.recentScans.length > 0 ? analytics.recentScans.slice(0, 8).map((scan: { id: number; scannedAt: Date; device: string | null }) => (
              <div key={scan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: ".82rem", color: "var(--t2)", textTransform: "capitalize" }}>{scan.device}</span>
                <span style={{ fontSize: ".75rem", color: "var(--tmuted)" }}>{new Date(scan.scannedAt).toLocaleString()}</span>
              </div>
            )) : <div style={{ color: "var(--tmuted)", fontSize: ".88rem" }}>No scans yet.</div>}
          </div>
        </div>
      </div>

      <footer style={{ textAlign: "center", padding: "32px 24px", color: "var(--tdim)", fontSize: ".78rem", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        © {new Date().getFullYear()} QR Studio. All rights reserved.
      </footer>
    </div>
  );
}
