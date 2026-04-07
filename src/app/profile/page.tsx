"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePoints } from "@/providers/PointsProvider";
import AppNav from "@/components/AppNav";
import { PillLogo } from "@/components/FloatingPills";

export default function ProfilePage() {
    const { publicKey, connected } = useWallet();
    const { setVisible } = useWalletModal();
    const {
        points, winStreak, totalWins, totalLosses, winRate,
        solBalance, betHistory, userRank
    } = usePoints();

    const totalBets = totalWins + totalLosses;

    if (!connected || !publicKey) {
        return (
            <div className="dash-root">
                <AppNav />
                <main className="dash-main" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="card" style={{ maxWidth: 440, width: "100%", textAlign: "center", padding: "48px 32px" }}>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                            <PillLogo style={{ width: 48, height: 48 }} />
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>
                            Wallet Not Connected
                        </h2>
                        <p style={{ color: "var(--text-2)", marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>
                            Connect your Solana wallet to view your profile, performance states, and complete prediction history.
                        </p>
                        <button
                            onClick={() => setVisible(true)}
                            className="hero-btn-primary"
                            style={{ padding: "12px 32px", fontSize: 15 }}
                        >
                            Connect Wallet
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dash-root">
            <AppNav />
            <main className="dash-main">
                <div className="dash-page-header">
                    <h1 className="dash-page-title">Operative Profile</h1>
                    <p className="dash-page-sub">Your trading history, stats, and rank.</p>
                </div>

                <div className="profile-grid">
                    
                    {/* Left: Identity Card */}
                    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
                            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--bg-active)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 16 }}>
                                👤
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 4, textTransform: "uppercase" }}>
                                Wallet Address
                            </div>
                            <div style={{ fontFamily: "monospace", fontSize: 16, color: "var(--text-1)", fontWeight: 600 }}>
                                {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="stat-card" style={{ padding: 12 }}>
                                <span className="stat-card-value">{userRank ? `#${userRank}` : "—"}</span>
                                <span className="stat-card-label">Global Rank</span>
                            </div>
                            <div className="stat-card" style={{ padding: 12 }}>
                                <span className="stat-card-value" style={{ color: "var(--green)" }}>{points.toLocaleString()}</span>
                                <span className="stat-card-label">Total Points</span>
                            </div>
                            <div className="stat-card" style={{ padding: 12 }}>
                                <span className="stat-card-value">{totalBets}</span>
                                <span className="stat-card-label">Predictions</span>
                            </div>
                            <div className="stat-card" style={{ padding: 12 }}>
                                <span className="stat-card-value" style={winRate >= 50 ? { color: "var(--green)" } : {}}>
                                    {totalBets > 0 ? `${winRate}%` : "—"}
                                </span>
                                <span className="stat-card-label">Win Rate</span>
                            </div>
                        </div>

                        <div style={{ background: "var(--bg-elevated)", padding: "16px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Balance (Devnet)</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{solBalance.toFixed(2)} SOL</span>
                        </div>
                    </div>

                    {/* Right: History */}
                    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-1)" }}>Prediction History</h2>
                            <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>Last 50 predictions</span>
                        </div>

                        {betHistory.length === 0 ? (
                            <div style={{ padding: "64px 24px", textAlign: "center" }}>
                                <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-1)", marginBottom: 8 }}>No predictions yet</h3>
                                <p style={{ color: "var(--text-3)", marginBottom: 24, fontSize: 14 }}>
                                    Your prediction history will appear here once you place a bet.
                                </p>
                                <Link href="/app" className="hero-btn-secondary" style={{ padding: "10px 24px", fontSize: 14 }}>
                                    Go to Terminal
                                </Link>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table className="pd-table">
                                    <thead>
                                        <tr>
                                            <th>Token</th>
                                            <th>Direction</th>
                                            <th>Timeframe</th>
                                            <th className="text-right">Risk Amount</th>
                                            <th className="text-right">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {betHistory.map((bet) => (
                                            <tr key={bet.id}>
                                                <td style={{ fontWeight: 700, color: "var(--text-1)" }}>${bet.token}</td>
                                                <td>
                                                    <span style={{ 
                                                        color: bet.direction === "UP" ? "var(--green)" : "var(--red)", 
                                                        fontWeight: 700,
                                                        background: bet.direction === "UP" ? "var(--green-dim)" : "var(--red-dim)",
                                                        padding: "4px 8px",
                                                        borderRadius: 4,
                                                        fontSize: 11,
                                                        letterSpacing: "0.04em"
                                                    }}>
                                                        {bet.direction === "UP" ? "▲ UP" : "▼ DOWN"}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{bet.timeframe}</td>
                                                <td className="text-right" style={{ color: "var(--text-2)", fontWeight: 500 }}>
                                                    {bet.amount.toFixed(2)} SOL
                                                </td>
                                                <td className="text-right">
                                                    {bet.result === "pending" && (
                                                        <span style={{ color: "var(--amber)", fontWeight: 600 }}>PENDING</span>
                                                    )}
                                                    {bet.result === "win" && (
                                                        <span style={{ color: "var(--green)", fontWeight: 700 }}>
                                                            ✓ +{bet.payout.toFixed(2)} SOL
                                                        </span>
                                                    )}
                                                    {bet.result === "loss" && (
                                                        <span style={{ color: "var(--red)", fontWeight: 600 }}>
                                                            ✗ LOSS
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
