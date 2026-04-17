"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePoints } from "@/providers/PointsProvider";
import AppNav from "@/components/AppNav";
import { PillLogo } from "@/components/FloatingPills";
import { createSupabaseClient } from "@/lib/supabase";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import idl from "@/lib/pumpdraft.json";

const PROGRAM_ID = new PublicKey("BLz3BRDWocq7uU6jTBsMwAenSsPNN8TvewfCaRELWk5r");

export default function ProfilePage() {
    const { publicKey, connected } = useWallet();
    const anchorWallet = useAnchorWallet();
    const { connection } = useConnection();
    const { setVisible } = useWalletModal();
    const {
        points, winStreak, totalWins, totalLosses, winRate,
        solBalance, betHistory, userRank
    } = usePoints();

    const totalBets = totalWins + totalLosses;

    const [dbBets, setDbBets] = useState<any[]>([]);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);

    // Fetch db bets directly since local history doesn't have token_address needed for market PDA
    useEffect(() => {
        if (!publicKey) return;
        const supabase = createSupabaseClient();
        if (supabase) {
            supabase
                .from("predictions")
                .select("*")
                .eq("wallet_address", publicKey.toBase58())
                .order("created_at", { ascending: false })
                .limit(50)
                .then(({ data }) => {
                    if (data) setDbBets(data);
                });
        }
    }, [publicKey]);

    const handleClaim = async (bet: any) => {
        if (!anchorWallet || !publicKey || !bet.token_address || !bet.timeframe) return;
        setIsClaiming(bet.id);
        try {
            const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: "processed" });
            const program = new Program(idl as any, PROGRAM_ID, provider);

            const marketIdStr = `${bet.token_address.slice(0, 4)}${bet.timeframe}`;
            const encoded = new TextEncoder().encode(marketIdStr);
            const numericHash = Array.from(encoded).reduce((a: number, b: number) => a + b, 0);
            const marketIdBn = new BN(numericHash);

            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), marketIdBn.toArrayLike(Buffer, "le", 8)],
                PROGRAM_ID
            );
            const [predictionPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("prediction"), marketPda.toBuffer(), anchorWallet.publicKey.toBuffer()],
                PROGRAM_ID
            );

            const tx = new Transaction();
            const claimIx = await program.methods.claimWinnings()
                .accounts({
                    market: marketPda,
                    prediction: predictionPda,
                    user: anchorWallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();
            tx.add(claimIx);

            await provider.sendAndConfirm(tx);
            
            // Update supabase after successful claim
            const supabase = createSupabaseClient();
            if (supabase) {
                await supabase.from("predictions").update({ has_claimed: true }).eq("id", bet.id);
            }
            
            // update local UI
            setDbBets(prev => prev.map(b => b.id === bet.id ? { ...b, has_claimed: true } : b));

        } catch (error) {
            console.error("Claim failed", error);
            alert("Claim Failed: The market may not be settled on-chain yet, or you already claimed it.");
        }
        setIsClaiming(null);
    };

    const displayBets = dbBets.length > 0 ? dbBets : betHistory.map(b => ({
      id: b.id, token_symbol: b.token, direction: b.direction, timeframe: b.timeframe, bet_amount: b.amount, result: b.result, payout: b.payout
    }));
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
                            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--green-dim)", border: "1.5px solid var(--green-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="8" r="4" stroke="var(--green)" strokeWidth="1.8" />
                                  <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
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

                        {displayBets.length === 0 ? (
                            <div style={{ padding: "64px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 14, background: "var(--green-dim)", border: "1px solid var(--green-border)", marginBottom: 16 }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <polyline points="3 17 8 12 12 15 17 9 21 12" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        <line x1="3" y1="20" x2="21" y2="20" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                </div>
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
                                        {displayBets.map((bet) => (
                                            <tr key={bet.id}>
                                                <td style={{ fontWeight: 700, color: "var(--text-1)" }}>${bet.token_symbol}</td>
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
                                                    {Number(bet.bet_amount).toFixed(2)} SOL
                                                </td>
                                                <td className="text-right">
                                                    {bet.result === "pending" && (
                                                        <span style={{ color: "var(--amber)", fontWeight: 600 }}>PENDING</span>
                                                    )}
                                                    {bet.result === "win" && (
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                                                            <span style={{ color: "var(--green)", fontWeight: 700 }}>
                                                                ✓ +{Number(bet.payout).toFixed(2)} SOL
                                                            </span>
                                                            {!bet.has_claimed && bet.token_address && (
                                                                <button 
                                                                    onClick={() => handleClaim(bet)}
                                                                    disabled={isClaiming === bet.id}
                                                                    style={{ 
                                                                        background: "var(--green)", color: "black", border: "none", 
                                                                        padding: "4px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800, 
                                                                        cursor: "pointer", textTransform: "uppercase" 
                                                                    }}
                                                                >
                                                                    {isClaiming === bet.id ? "..." : "Claim"}
                                                                </button>
                                                            )}
                                                            {bet.has_claimed && (
                                                                <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600 }}>CLAIMED</span>
                                                            )}
                                                        </div>
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
