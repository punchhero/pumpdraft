"use client";

import React, { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePoints } from "@/providers/PointsProvider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";

const PREFIXES = ["GHOST", "NEON", "VOID", "CYBER", "ALPHA", "ROGUE", "BYTE", "ZERO", "NOVA", "DARK", "FLUX", "GRID"];
const SUFFIXES = ["DEGEN", "BULL", "BEAR", "APE", "WOLF", "HAWK", "UNIT", "NODE", "CORE", "SHARD", "PULSE", "AGENT"];

function generateAlias(walletAddress: string): string {
    const a = walletAddress.charCodeAt(0) + walletAddress.charCodeAt(1);
    const b = walletAddress.charCodeAt(2) + walletAddress.charCodeAt(3);
    const prefix = PREFIXES[a % PREFIXES.length];
    const suffix = SUFFIXES[b % SUFFIXES.length];
    const tag = walletAddress.slice(0, 4).toUpperCase();
    return `${prefix}_${suffix}_${tag}`;
}

export { generateAlias };

export default function Header() {
    const { publicKey, connected, disconnect } = useWallet();
    const { connection } = useConnection();
    const { setVisible } = useWalletModal();
    const { points, userRank, winStreak, solBalance, tierMultiplier, tierLabel, tierColor, tierEmoji } = usePoints();

    const [airdropStatus, setAirdropStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const alias = publicKey ? generateAlias(publicKey.toBase58()) : null;

    const handleWalletClick = () => {
        if (connected) {
            disconnect();
        } else {
            setVisible(true);
        }
    };

    const handleAirdrop = useCallback(async () => {
        if (!publicKey) return;
        setAirdropStatus("loading");
        try {
            const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig, "confirmed");
            setAirdropStatus("success");
            setTimeout(() => setAirdropStatus("idle"), 3000);
        } catch {
            setAirdropStatus("error");
            setTimeout(() => setAirdropStatus("idle"), 3000);
        }
    }, [publicKey, connection]);

    return (
        <header className="w-full border-b border-terminal-green-dark bg-[#050505]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                {/* Left: Logo + back link */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <span className="text-2xl">🚀</span>
                        <div className="flex flex-col">
                            <span className="text-terminal-green text-glow-strong text-lg font-bold tracking-[0.15em] leading-none">
                                PumpDraft
                            </span>
                            <span className="text-terminal-green-dark text-[9px] tracking-[0.4em]">
                                DEVNET SANDBOX
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Center: Network + Alias + Points */}
                <div className="hidden md:flex items-center gap-4 text-[10px] text-terminal-green-dark">
                    {/* Devnet indicator */}
                    <div className="flex items-center gap-1.5 border border-terminal-green-dark px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
                        <span className="text-terminal-green font-bold">DEVNET</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-terminal-green" : "bg-terminal-amber"}`} />
                        <span>{connected ? "WALLET LINKED" : "FEEDS LIVE"}</span>
                    </div>

                    {/* Alias + profile link + tier badge */}
                    {alias && (
                        <Link href="/profile" className="flex items-center gap-1.5 text-terminal-green hover:text-glow transition-all">
                            <span>▸</span>
                            <span className="font-bold tracking-wider">{alias}</span>
                            {tierEmoji && tierMultiplier > 1 && (
                                <span className={`text-[9px] border px-1 font-bold tracking-wider ${tierColor} border-current`}>
                                    {tierEmoji} {tierLabel}
                                </span>
                            )}
                            <span className="text-terminal-green-dark text-[9px] border border-terminal-green-dark px-1">PROFILE</span>
                        </Link>
                    )}

                    {/* SOL Balance */}
                    {connected && (
                        <div className="flex items-center gap-1.5 border border-terminal-green-dark px-2 py-0.5">
                            <span className="text-terminal-amber font-bold">{solBalance.toFixed(2)} tSOL</span>
                        </div>
                    )}

                    {/* Points Badge */}
                    {points > 0 && (
                        <div className="flex items-center gap-2 px-2 py-0.5 border border-terminal-green-dark">
                            <span className="text-terminal-green font-bold">{points.toLocaleString()} PTS</span>
                            {userRank && <span className="text-terminal-green-dark">#{userRank}</span>}
                            {winStreak >= 2 && <span className="text-yellow-400">🔥{winStreak}W</span>}
                        </div>
                    )}

                    {/* Airdrop Test SOL button */}
                    {connected && (
                        <button
                            id="airdrop-sol-btn"
                            onClick={handleAirdrop}
                            disabled={airdropStatus === "loading"}
                            className={`
                                flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-bold tracking-wider transition-all
                                ${airdropStatus === "success" ? "border-terminal-green text-terminal-green" : ""}
                                ${airdropStatus === "error" ? "border-terminal-red text-terminal-red" : ""}
                                ${airdropStatus === "idle" ? "border-terminal-amber text-terminal-amber hover:bg-terminal-amber hover:text-black" : ""}
                                ${airdropStatus === "loading" ? "border-terminal-amber text-terminal-amber opacity-60 cursor-not-allowed" : ""}
                            `}
                        >
                            {airdropStatus === "idle" && <>💧 AIRDROP tSOL</>}
                            {airdropStatus === "loading" && <>⏳ REQUESTING...</>}
                            {airdropStatus === "success" && <>✓ +1 tSOL RECEIVED</>}
                            {airdropStatus === "error" && <>✗ RATE LIMITED</>}
                        </button>
                    )}
                </div>

                {/* Right: Wallet Button */}
                <button
                    id="connect-wallet-btn"
                    onClick={handleWalletClick}
                    className="
                        relative group px-5 py-2.5
                        border border-terminal-green bg-transparent
                        text-terminal-green text-sm font-bold tracking-wider
                        transition-all duration-200
                        hover:bg-terminal-green hover:text-black
                        hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]
                        active:scale-95
                    "
                >
                    <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-terminal-green" />
                    <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-terminal-green" />
                    <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-terminal-green" />
                    <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-terminal-green" />
                    <span className="relative z-10 flex items-center gap-2">
                        <span className="text-xs">{connected ? "◆" : "◇"}</span>
                        {connected
                            ? `${publicKey!.toBase58().slice(0, 4)}...${publicKey!.toBase58().slice(-4)} ✓`
                            : "CONNECT WALLET"
                        }
                    </span>
                </button>
            </div>

            {/* Devnet Warning Banner — only if not connected yet */}
            {!connected && (
                <div className="bg-terminal-amber/10 border-t border-terminal-amber/30 px-4 py-1.5 text-center text-[10px] text-terminal-amber tracking-wider">
                    ⚠️ Make sure your wallet is set to <strong>Devnet</strong> before connecting.
                    In Phantom: Settings → Developer Settings → Change Network → Devnet
                </div>
            )}

            {/* Ticker */}
            <div className="overflow-hidden border-t border-terminal-green-dark">
                <div className="py-0.5 px-4 text-[9px] text-terminal-green-dark flex gap-8 animate-marquee whitespace-nowrap">
                    <span>█ PumpDraft DEVNET BETA</span>
                    <span>█ PUMP.FUN TOKENS ONLY</span>
                    <span>█ MARKET CAP &gt;$250K</span>
                    <span>█ TOKEN AGE &gt;24H</span>
                    <span>█ BET UP OR DOWN</span>
                    <span>█ ZERO REAL SOL AT RISK</span>
                    <span>█ SOLANA DEVNET</span>
                    <span>█ PumpDraft DEVNET BETA</span>
                    <span>█ PUMP.FUN TOKENS ONLY</span>
                    <span>█ MARKET CAP &gt;$250K</span>
                </div>
            </div>
        </header>
    );
}
