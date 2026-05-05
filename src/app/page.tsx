import Link from "next/link";
import FloatingPills, { PillLogo } from "@/components/FloatingPills";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PumpDraft — The Ultimate Pump.fun Prediction Market",
  description:
    "Bet on the trenches. Predict memecoin movements. Dominate the leaderboard. The most competitive Pump.fun prediction market on Solana.",
  keywords: ["pump.fun", "solana", "memecoin", "prediction market", "crypto", "defi", "trading"],
};

export default function LandingPage() {
  return (
    <div className="landing">

      {/* ── Navbar ─────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-logo">
            <PillLogo style={{ width: 22, height: 22 }} />
            <span className="landing-logo-text">PumpDraft</span>
          </Link>
          <div className="landing-nav-links">
            <Link href="/about" className="landing-nav-link">How it works</Link>
            <Link href="/leaderboard" className="landing-nav-link">Leaderboard</Link>
          </div>
          <Link href="/app" id="nav-launch-btn" className="landing-launch-btn">
            Launch App
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow" />
        
        {/* Floating Pills Animation */}
        <FloatingPills />

        <div className="hero-inner animate-fade-up">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            LIVE ON SOLANA DEVNET
          </div>

          <h1 className="hero-title">
            The Ultimate<br />
            <span className="hero-title-accent">Pump.fun</span> Prediction Market
          </h1>

          <p className="hero-sub">
            Bet on the trenches. Predict memecoin movements.
            Dominate the leaderboard and prove you called it first.
          </p>

          <div className="hero-cta">
            <Link href="/app" id="hero-launch-btn" className="hero-btn-primary">
              <PillLogo style={{ width: 20, height: 20 }} /> Launch App
            </Link>
            <Link href="/about" className="hero-btn-secondary">
              How it works →
            </Link>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">$250K+</span>
              <span className="hero-stat-label">Min Market Cap Filter</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">24h+</span>
              <span className="hero-stat-label">Token Age Filter</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">PvP</span>
              <span className="hero-stat-label">Pari-Mutuel Pools</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">Live</span>
              <span className="hero-stat-label">DexScreener Data</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────── */}
      <section id="how-it-works" className="section section-alt">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Three steps to dominate</h2>
            <p className="section-sub">No experience required. Pure conviction.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">01</div>
              <div className="step-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </div>
              <h3 className="step-title">Connect Your Wallet</h3>
              <p className="step-desc">
                Connect Phantom, Solflare, Backpack or any Solana wallet. Your identity, 
                your predictions, your rank — all tied to your wallet address.
              </p>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <div className="step-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <h3 className="step-title">Pick a Pump.fun Token</h3>
              <p className="step-desc">
                Browse tokens launched on Pump.fun with market caps above $250K and 
                at least 24 hours of trading history. Real coins, real price action.
              </p>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <div className="step-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <h3 className="step-title">Predict &amp; Dominate</h3>
              <p className="step-desc">
                Call UP or DOWN across multiple timeframes. Correct calls earn points, 
                build your streak, and push you up the global leaderboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────── */}
      <section id="features" className="section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Built for serious players</h2>
            <p className="section-sub">Pro-grade tools. Zero compromise.</p>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon mb-[14px]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              </div>
              <h3 className="feature-title">Live DexScreener Charts</h3>
              <p className="feature-desc">
                Full candlestick charts with volume, liquidity, and trade history. 
                The same data tools institutional traders use — right inside the terminal.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon mb-[14px]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <h3 className="feature-title">Pump.fun Exclusive Feed</h3>
              <p className="feature-desc">
                Only tokens launched on Pump.fun with &gt;$250K market cap and &gt;24h 
                age. Strict filters eliminate noise and keep you focused on real plays.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon mb-[14px]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M8 15h8"/></svg>
              </div>
              <h3 className="feature-title">PvP Pari-Mutuel Pools</h3>
              <p className="feature-desc">
                Your prediction enters a pool against other players. Winners split the 
                losing pool minus a 5% fee. Pure skill beats pure luck over time.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon mb-[14px]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              </div>
              <h3 className="feature-title">Global Leaderboard</h3>
              <p className="feature-desc">
                Every prediction is tracked and ranked. Your points, win rate, and streak 
                are public. Build a reputation. Earn bragging rights.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon mb-[14px]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3 className="feature-title">Multiple Timeframes</h3>
              <p className="feature-desc">
                1m, 5m, 15m, 30m, and 1h windows. Short scalp or longer hold — 
                predict across any timeframe and stack your edge.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon mb-[14px]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 className="feature-title">Non-Custodial &amp; Transparent</h3>
              <p className="feature-desc">
                No accounts. No passwords. Just your wallet. All prediction state 
                is stored on Supabase with full transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────── */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to call the next 10x?</h2>
        <p className="cta-sub">Join the prediction market. Prove you see the future.</p>
        <Link href="/app" id="cta-launch-btn" className="hero-btn-primary">
          <PillLogo style={{ width: 20, height: 20 }} /> Open the Terminal
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PillLogo style={{ width: 18, height: 18 }} />
            <span style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>PumpDraft</span>
          </div>
          <p className="landing-footer-copy">
            © 2025 PumpDraft. Not financial advice. Trade responsibly.
          </p>
          <div className="landing-footer-links">
            <Link href="/app" className="landing-footer-link">Terminal</Link>
            <Link href="/leaderboard" className="landing-footer-link">Leaderboard</Link>
            <Link href="/about" className="landing-footer-link">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
