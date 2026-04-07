"use client";

import { useState } from "react";
import AppNav from "@/components/AppNav";
import DexScreenerChart from "@/components/DexScreenerChart";
import PredictionConsole from "@/components/PredictionConsole";
import TokenSubmission from "@/components/TokenSubmission";
import type { TokenInfo } from "@/components/DexScreenerChart";
import { useAuth } from "@/providers/AuthProvider";
import { useWallet } from "@solana/wallet-adapter-react";

export default function AppDashboard() {
  const { user } = useAuth();
  const { connected } = useWallet();
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);

  return (
    <div className="dash-root">
      <AppNav />

      <main className="dash-main">
        {/* Status strip */}
        <div className="dash-status-strip">
          <span className="dash-status-item">
            <span className="dash-dot dash-dot-green" />
            Prediction Engine: <strong>Active</strong>
          </span>
          <span className="dash-status-item">
            Network: <strong>Devnet</strong>
          </span>
          <span className="dash-status-item">
            Wallet:{" "}
            <strong className={connected ? "dash-text-green" : "dash-text-red"}>
              {connected ? "Connected" : "Disconnected"}
            </strong>
          </span>
          <span className="dash-status-item">
            Auth:{" "}
            <strong className={user ? "dash-text-green" : "dash-text-muted"}>
              {user ? "Verified" : "None"}
            </strong>
          </span>
          <span className="dash-status-item">
            Token: <strong className="dash-text-green">{selectedToken ? `$${selectedToken.symbol}` : "Loading..."}</strong>
          </span>
        </div>

        {/* Main grid: Chart (left, large) + Prediction Panel (right, narrow) */}
        <div className="dash-grid">
          {/* Chart — centerpiece */}
          <div className="dash-chart-col">
            <DexScreenerChart onTokenChange={(token) => setSelectedToken(token)} />
          </div>

          {/* Prediction side-panel */}
          <div className="dash-predict-col">
            {selectedToken ? (
              <PredictionConsole selectedToken={selectedToken} />
            ) : (
              <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--text-3)" }}>
                <span className="spin" style={{ display: "inline-block", fontSize: 24, marginBottom: 16 }}>↻</span>
                <div>Loading token data...</div>
              </div>
            )}
          </div>
        </div>

        {/* Token Submission row */}
        <div className="dash-submission-row">
          <TokenSubmission />
        </div>
      </main>
    </div>
  );
}
