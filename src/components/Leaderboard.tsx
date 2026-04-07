"use client";

import React, { useState } from "react";
import { usePoints } from "@/providers/PointsProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSupabaseLeaderboard } from "@/hooks/useSupabaseLeaderboard";

export default function Leaderboard() {
    const { userRank, points, winRate, totalWins, totalLosses, winStreak } = usePoints();
    const { publicKey } = useWallet();
    const { leaderboard, loading } = useSupabaseLeaderboard(publicKey?.toBase58() ?? null);

    const totalGames = totalWins + totalLosses;

    return (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex flex-col lg:flex-row">
                
                {/* Leaderboard Table */}
                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center" style={{ color: "var(--text-3)" }}>
                            <span className="spin" style={{ display: "inline-block", fontSize: 24, marginBottom: 12 }}>↻</span>
                            <div>Loading Leaderboard...</div>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="p-12 text-center" style={{ color: "var(--text-3)" }}>
                            <div style={{ fontSize: 16, color: "var(--text-2)", marginBottom: 8, fontWeight: 500 }}>No Predictions Yet</div>
                            <div>Be the first to call a chart.</div>
                        </div>
                    ) : (
                        <table className="pd-table">
                            <thead>
                                <tr>
                                    <th className="pd-table-rank text-center">#</th>
                                    <th>Wallet</th>
                                    <th className="text-right">Points</th>
                                    <th className="text-right">W/L</th>
                                    <th className="text-right">Win%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry) => {
                                    const isUser = !!entry.isCurrentUser;
                                    const displayWallet = `${entry.wallet_address.slice(0, 4)}...${entry.wallet_address.slice(-4)}`;
                                    
                                    return (
                                        <tr key={entry.rank} style={isUser ? { background: "var(--bg-elevated)" } : {}}>
                                            <td className="pd-table-rank text-center" style={{ color: entry.rank <= 3 ? "var(--green)" : "var(--text-3)" }}>
                                                {entry.rank}
                                            </td>
                                            <td style={isUser ? { color: "var(--text-1)", fontWeight: 600 } : {}}>
                                                <span style={{ fontFamily: "monospace", fontSize: 14 }}>{displayWallet}</span>
                                                {isUser && <span className="pd-table-you">YOU</span>}
                                            </td>
                                            <td className="text-right" style={{ color: "var(--text-1)", fontWeight: 700 }}>
                                                {entry.points.toLocaleString()}
                                            </td>
                                            <td className="text-right" style={{ fontWeight: 500 }}>
                                                <span className="pd-table-green">{entry.total_wins}</span>
                                                <span style={{ color: "var(--text-4)", margin: "0 4px" }}>/</span>
                                                <span className="pd-table-red">{entry.total_losses}</span>
                                            </td>
                                            <td className="text-right" style={entry.winRate >= 50 ? { color: "var(--green)", fontWeight: 700 } : { fontWeight: 500 }}>
                                                {entry.winRate}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Your Stats Sidebar */}
                <div className="lg:w-[280px] bg-[#121212] border-t lg:border-t-0 lg:border-l border-white/[0.08]" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 20 }}>
                        Your Performance
                    </div>

                    <div className="stat-card" style={{ marginBottom: 12 }}>
                        <span className="stat-card-label">Total Points</span>
                        <span className="stat-card-value" style={{ color: "var(--green)" }}>{points.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 24 }}>
                        <div className="stat-card" style={{ padding: "16px 12px" }}>
                            <span className="stat-card-label">Global Rank</span>
                            <span className="stat-card-value" style={{ fontSize: 20 }}>{userRank ? `#${userRank}` : "—"}</span>
                        </div>
                        <div className="stat-card" style={{ padding: "16px 12px" }}>
                            <span className="stat-card-label">Streak</span>
                            <span className="stat-card-value" style={{ fontSize: 20 }}>{winStreak}</span>
                        </div>
                    </div>

                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 12, textTransform: "uppercase" }}>
                        How to earn points
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center" style={{ fontSize: 13, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
                            <span style={{ color: "var(--text-2)" }}>Place Prediction</span>
                            <span style={{ fontWeight: 600, color: "var(--text-1)" }}>+10 pts</span>
                        </div>
                        <div className="flex justify-between items-center" style={{ fontSize: 13, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
                            <span style={{ color: "var(--text-2)" }}>Win Prediction</span>
                            <span style={{ fontWeight: 600, color: "var(--green)" }}>+50 pts</span>
                        </div>
                        <div className="flex justify-between items-center" style={{ fontSize: 13, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
                            <span style={{ color: "var(--text-2)" }}>3-Win Streak</span>
                            <span style={{ fontWeight: 600, color: "var(--green)" }}>+25 bonus</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}
