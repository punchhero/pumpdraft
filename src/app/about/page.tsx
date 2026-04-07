"use client";

import AppNav from "@/components/AppNav";

export default function AboutPage() {
  return (
    <div className="dash-root">
      <AppNav />
      <main className="dash-main">
        <div className="dash-page-header">
          <h1 className="dash-page-title">About PumpDraft</h1>
          <p className="dash-page-sub">The protocol, the mechanics, and the vision.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* Left col — main content */}
          <div className="card about-content">
            <div className="about-pill">The Protocol</div>
            <h2>What is PumpDraft?</h2>
            <p>
              PumpDraft is a competitive prediction market built exclusively around tokens 
              launched on Pump.fun. Rather than buying and holding memecoins, you predict 
              their price direction across defined timeframes and compete against other players.
            </p>

            <h2>How Predictions Work</h2>
            <p>
              When you place a prediction, your bet enters a shared pool with other players 
              who took the opposite position. This is called a pari-mutuel pool. At resolution, 
              the winning side splits the entire losing pool, minus a 5% platform fee.
            </p>
            <p>
              The longer your win streak, the greater your multiplier. Consistency is rewarded 
              over lucky single calls.
            </p>

            <h2>Token Filters</h2>
            <p>
              We apply strict quality filters to every token displayed on the platform:
            </p>
            <ul style={{ paddingLeft: 20, color: "var(--text-2)", lineHeight: 2 }}>
              <li>Must be launched on Pump.fun</li>
              <li>Market cap must exceed <strong style={{ color: "var(--text-1)" }}>$250,000 USD</strong></li>
              <li>Token must be at least <strong style={{ color: "var(--text-1)" }}>24 hours old</strong></li>
            </ul>
            <p>
              These filters eliminate brand-new launches and micro-cap rugs, keeping your 
              focus on tokens with real trading history.
            </p>
          </div>

          {/* Right col — points system + FAQ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Points system card */}
            <div className="card">
              <div className="about-pill">Points System</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {[
                  { action: "Place any bet",         pts: "+10 PTS",  color: "var(--text-2)" },
                  { action: "Win a prediction",      pts: "+50 PTS",  color: "var(--green)"  },
                  { action: "3-win streak bonus",    pts: "+25 BONUS", color: "var(--green)" },
                  { action: "Loss",                  pts: "Streak reset", color: "var(--red)"  },
                ].map((row) => (
                  <div
                    key={row.action}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-2)" }}>{row.action}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.pts}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeframes card */}
            <div className="card">
              <div className="about-pill">Timeframes</div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {["1m", "5m", "15m", "30m", "1h"].map((tf) => (
                  <div
                    key={tf}
                    style={{
                      flex: 1,
                      minWidth: 48,
                      textAlign: "center",
                      padding: "12px 8px",
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-1)",
                    }}
                  >
                    {tf}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 12, marginBottom: 0 }}>
                Predictions resolve at the end of the selected timeframe window.
              </p>
            </div>

            {/* Tech stack */}
            <div className="card">
              <div className="about-pill">Tech Stack</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {["Next.js 16", "Solana Web3.js", "Supabase", "Pump.fun API", "DexScreener", "Tailwind CSS"].map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 12,
                      color: "var(--text-2)",
                      background: "var(--bg-elevated)",
                      padding: "4px 10px",
                      borderRadius: 100,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
