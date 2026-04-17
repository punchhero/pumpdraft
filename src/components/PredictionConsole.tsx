"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { TokenInfo } from "@/components/DexScreenerChart";
import { usePoints } from "@/providers/PointsProvider";
import { useSupabasePool } from "@/hooks/useSupabasePool";
import { createSupabaseClient } from "@/lib/supabase";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import idl from "@/lib/pumpdraft.json";

const PROGRAM_ID = new PublicKey("BLz3BRDWocq7uU6jTBsMwAenSsPNN8TvewfCaRELWk5r");

/**
 * PredictionConsole — The Betting UI
 *
 * Terminal-styled command-line interface for placing bets.
 * Includes timeframe selector, bet amount input, and PUMP/DUMP buttons.
 */

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

// ──────────────────────────────────────────────────────────────
// SYSTEM CONFIRMATION MESSAGES
// ──────────────────────────────────────────────────────────────
const SASSY_RESPONSES = [
    "Bet locked. Pari-mutuel pool updated.",
    "Prediction confirmed. Pool is live.",
    "Order filled. Resolution at end of timeframe.",
    "Bet accepted. Pooling with opposing positions.",
    "Confirmed. Your position is in the queue.",
    "Locked in. Waiting for timeframe resolution.",
    "Bet placed. May the chart move in your favour.",
    "Pool updated. Watch the ratio shift.",
    "Prediction recorded. Payouts calculated at settlement.",
    "Position confirmed. Track it in your Profile.",
];

interface PredictionConsoleProps {
    selectedToken: TokenInfo | null;
}

export default function PredictionConsole({
    selectedToken,
}: PredictionConsoleProps) {
    const { user } = useAuth();
    const { publicKey, connected } = useWallet();
    const anchorWallet = useAnchorWallet();
    const { connection } = useConnection();
    const { points, winStreak, addPoints, lastPointGain, solBalance, deductBalance, addBetRecord } = usePoints();

    // Declare timeframe state BEFORE hooks that depend on it
    const [timeframe, setTimeframe] = useState<Timeframe>("5m");
    const [betAmount, setBetAmount] = useState("");
    const [isPlacingBet, setIsPlacingBet] = useState(false);
    const [consoleLines, setConsoleLines] = useState<{ text: string; color: string }[]>([]);

    const { poolData, addBetToPool } = useSupabasePool(
        selectedToken?.address ?? null,
        timeframe,
    );

    const addConsoleLine = useCallback(
        (text: string, color: string = "text-terminal-green") => {
            setConsoleLines((prev) => [...prev.slice(-8), { text, color }]);
        },
        []
    );

    const placeBet = async (direction: "UP" | "DOWN") => {
        const amount = parseFloat(betAmount);

        // Validation
        if (!connected) {
            addConsoleLine(
                "> ERROR: Wallet not connected. Plug in, degen.",
                "text-terminal-red"
            );
            return;
        }

        if (!selectedToken) {
            addConsoleLine(
                "> ERROR: No token selected. Pick a target.",
                "text-terminal-red"
            );
            return;
        }

        // Block betting on tokens that don't meet eligibility requirements
        const mcapOk = (selectedToken.usd_market_cap ?? 0) >= 200_000;
        const ageOk  = (selectedToken.age_hours ?? 0) >= 24;
        if (!mcapOk || !ageOk) {
            const reasons = [];
            if (!mcapOk) reasons.push(`MCap $${(selectedToken.usd_market_cap/1000).toFixed(0)}K < $200K minimum`);
            if (!ageOk)  reasons.push(`Token only ${selectedToken.age_hours}h old (need 24h+)`);
            addConsoleLine(
                `> REJECTED: ${selectedToken.symbol} is ineligible — ${reasons.join(" | ")}`,
                "text-terminal-red"
            );
            return;
        }

        if (!amount || amount <= 0) {
            addConsoleLine(
                "> ERROR: Invalid bet amount. Try a real number.",
                "text-terminal-red"
            );
            return;
        }

        if (amount < 0.01) {
            addConsoleLine(
                "> ERROR: Minimum bet is 0.01 SOL. Go big or go home.",
                "text-terminal-red"
            );
            return;
        }

        if (amount > solBalance) {
            addConsoleLine(
                `> ERROR: Insufficient balance. You have ${solBalance.toFixed(2)} SOL.`,
                "text-terminal-red"
            );
            return;
        }

        setIsPlacingBet(true);

        addConsoleLine(
            `> TX INITIATED: ${amount} SOL on ${selectedToken.symbol} ${direction} [${timeframe}]`,
            "text-terminal-amber"
        );

        try {
            if (!anchorWallet || !publicKey) throw new Error("Wallet not fully connected.");
            const walletAddr = publicKey.toBase58();

            // ── ANCHOR SETUP ──
            const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: "processed" });
            const program = new Program(idl as any, PROGRAM_ID, provider);

            // Calculate integer hash for the market ID
            const marketIdStr = `${selectedToken.address.slice(0, 4)}${timeframe}`;
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
            const marketInfo = await connection.getAccountInfo(marketPda);
            const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL)); // Safe integer

            // 1. Automatically initialize market PDA if it doesn't exist
            if (!marketInfo) {
                addConsoleLine(`> INITIALIZING NEW MARKET ON-CHAIN...`, "text-terminal-amber");
                const resolveTime = new BN(Math.floor(Date.now() / 1000) + (5 * 60)); // +5 mins fallback
                const safeMcapInt = Math.floor(selectedToken.usd_market_cap ?? 0);
                
                const initIx = await program.methods.initializeMarket(
                    marketIdBn,
                    new PublicKey(selectedToken.address),
                    new BN(safeMcapInt),
                    resolveTime
                )
                .accounts({
                    market: marketPda,
                    creator: anchorWallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();
                tx.add(initIx);
            }

            // 2. Append prediction instruction
            addConsoleLine(`> BUILDING PREDICTION IX...`, "text-terminal-amber");
            const predictIx = await program.methods.makePrediction(
                marketIdBn,
                direction === "UP",
                amountLamports
            )
            .accounts({
                market: marketPda,
                prediction: predictionPda,
                user: anchorWallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .instruction();
            tx.add(predictIx);

            // 3. Send and confirm via Provider (triggers wallet popup)
            addConsoleLine(`> AWAITING WALLET SIGNATURE...`, "text-terminal-amber");
            const signature = await provider.sendAndConfirm(tx);
            addConsoleLine(`> TX CONFIRMED: ${signature.slice(0, 12)}...`, "text-terminal-green");

            // 4. Record bet in Supabase (only after confirmed tx)
            const poolId = await addBetToPool(
                selectedToken.symbol,
                direction,
                amount,
                0,
                walletAddr,
            );

            const supabase = createSupabaseClient();
            await supabase?.from("predictions").insert({
                wallet_address: walletAddr,
                token_address: selectedToken.address,
                token_symbol: selectedToken.symbol,
                direction,
                bet_amount: amount,
                entry_price: 0,
                timeframe,
                status: "pending",
                tx_signature: signature,
                pool_id: poolId ?? null,
            });

            // 5. Award points and refresh balance
            addPoints(10, "BET_PLACED");
            const betId = signature.slice(0, 8).toUpperCase();
            addConsoleLine(`> BET CONFIRMED [ID: ${betId}]`, "text-terminal-green");
            addConsoleLine(
                `> ${SASSY_RESPONSES[Math.floor(Math.random() * SASSY_RESPONSES.length)]}`,
                "text-terminal-green"
            );
            addConsoleLine(`> +10 PTS AWARDED.`, "text-terminal-green");

            addBetRecord({
                id: betId,
                token: selectedToken.symbol,
                direction,
                amount,
                timeframe,
                result: "pending",
                payout: 0,
                timestamp: Date.now(),
            });

        } catch (error: any) {
            console.error("Bet failed", error);
            const msg = error?.message ?? "Unknown error";
            if (msg.includes("User rejected") || msg.includes("rejected")) {
                addConsoleLine(`> TX CANCELLED: You rejected the wallet signature.`, "text-terminal-red");
            } else {
                addConsoleLine(`> TX FAILED: ${msg}`, "text-terminal-red");
            }
        }

        setBetAmount("");
        setIsPlacingBet(false);
    };

    // Calculate pari-mutuel odds for display
    const totalPool = poolData.totalUp + poolData.totalDown;
    const platformFee = totalPool * 0.05;
    const rewardPool = totalPool - platformFee;
    const upMultiplier =
        poolData.totalUp > 0 ? (rewardPool / poolData.totalUp).toFixed(2) : "—";
    const downMultiplier =
        poolData.totalDown > 0
            ? (rewardPool / poolData.totalDown).toFixed(2)
            : "—";

    return (
    return (
        <div className="bg-[#181818] rounded-xl overflow-hidden shadow-2xl border border-white/5 flex flex-col h-full font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#121212]">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm tracking-wide">Prediction Pool</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                    {lastPointGain && (
                        <span className="text-yellow-400 animate-pulse">
                            +{lastPointGain.amount} PTS
                            {lastPointGain.reason === "STREAK_BONUS" && " 🔥"}
                        </span>
                    )}
                    <span className="text-[#B3B3B3]">
                        PTS <span className="text-white ml-1">{points.toLocaleString()}</span>
                    </span>
                    {winStreak >= 2 && (
                        <span className="text-yellow-400 font-bold">
                            🔥{winStreak}W
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-6 flex-1 flex flex-col">
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#242424] rounded-lg p-3 flex flex-col justify-center items-center">
                        <span className="text-[#B3B3B3] text-[10px] uppercase tracking-wider mb-1 font-semibold">Pool</span>
                        <span className="text-white font-bold text-sm">{totalPool.toFixed(2)}</span>
                    </div>
                    <div className="bg-[#242424] rounded-lg p-3 flex flex-col justify-center items-center">
                        <span className="text-[#B3B3B3] text-[10px] uppercase tracking-wider mb-1 font-semibold">Up / Down</span>
                        <span className="font-bold text-sm inline-flex gap-1 items-center">
                            <span className="text-[#1DB954]">{poolData.totalUp.toFixed(1)}</span>
                            <span className="text-[#6B6B6B]">/</span>
                            <span className="text-[#FF3B5C]">{poolData.totalDown.toFixed(1)}</span>
                        </span>
                    </div>
                    <div className="bg-[#242424] rounded-lg p-3 flex flex-col justify-center items-center">
                        <span className="text-[#B3B3B3] text-[10px] uppercase tracking-wider mb-1 font-semibold">Payout (U/D)</span>
                        <span className="font-bold text-sm inline-flex gap-1 items-center">
                            <span className="text-white">{upMultiplier}x</span>
                            <span className="text-[#6B6B6B]">/</span>
                            <span className="text-[#B3B3B3]">{downMultiplier}x</span>
                        </span>
                    </div>
                    <div className="bg-[#242424] rounded-lg p-3 flex flex-col justify-center items-center">
                        <span className="text-[#B3B3B3] text-[10px] uppercase tracking-wider mb-1 font-semibold">Players</span>
                        <span className="text-white font-bold text-sm">{poolData.participants}</span>
                    </div>
                </div>

                {/* Timeframes */}
                <div>
                    <div className="text-[#B3B3B3] text-xs font-semibold mb-3">
                        Timeframe
                    </div>
                    <div className="flex gap-2">
                        {TIMEFRAMES.map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`
                                    flex-1 py-2.5 rounded-full text-xs font-bold transition-all duration-200
                                    ${tf === timeframe
                                        ? "bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20 scale-105"
                                        : "bg-[#282828] text-white hover:bg-[#3E3E3E]"
                                    }
                                `}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div>
                    <div className="text-[#B3B3B3] text-xs font-semibold mb-3">
                        Risk Amount (SOL)
                    </div>
                    <div className="flex items-center gap-3 bg-[#282828] rounded-full px-5 py-3 transition-colors focus-within:bg-[#3E3E3E]">
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            placeholder="0.00"
                            className="flex-1 bg-transparent text-white text-base font-bold outline-none placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button onClick={() => setBetAmount((solBalance || 1).toString())} className="text-[#B3B3B3] hover:text-white text-xs font-bold px-3 py-1.5 bg-[#404040] hover:bg-[#555] rounded-full transition-colors">
                            MAX
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <button
                        onClick={() => placeBet("UP")}
                        disabled={isPlacingBet}
                        className="
                            group flex flex-col items-center justify-center py-5
                            bg-[#1DB954] text-black rounded-full
                            text-sm font-bold tracking-wide
                            transition-all duration-200
                            hover:bg-[#1ed760] hover:scale-[1.02] active:scale-95
                            disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed
                            shadow-lg shadow-[#1DB954]/10
                        "
                    >
                        <span className="text-xl leading-none mb-1">▲</span>
                        PUMP
                    </button>

                    <button
                        onClick={() => placeBet("DOWN")}
                        disabled={isPlacingBet}
                        className="
                            group flex flex-col items-center justify-center py-5
                            bg-[#282828] text-white rounded-full
                            text-sm font-bold tracking-wide
                            transition-all duration-200
                            hover:bg-[#FF3B5C] hover:text-white hover:scale-[1.02] active:scale-95
                            disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed
                        "
                    >
                        <span className="text-xl leading-none mb-1">▼</span>
                        DUMP
                    </button>
                </div>

                {/* Activity Feed */}
                <div className="mt-4 flex-1 flex flex-col">
                    <div className="text-[#B3B3B3] text-[10px] uppercase font-bold tracking-wider mb-3">
                        Activity Feed
                    </div>
                    <div className="flex-1 min-h-[140px] max-h-[160px] overflow-y-auto pr-2 rounded-lg bg-[#121212] p-4">
                        {consoleLines.length === 0 ? (
                            <div className="text-[#6B6B6B] text-xs font-medium italic">
                                Waiting for market action...
                            </div>
                        ) : (
                            <div className="space-y-2 flex flex-col border-none">
                                {consoleLines.map((line, idx) => {
                                    const cleanText = line.text.replace(/^>\s*/, "");
                                    const isRed = line.color.includes("red");
                                    const isAmber = line.color.includes("amber");
                                    const isGreen = line.color.includes("green");
                                    return (
                                        <div key={idx} className={`textxs leading-relaxed ${isRed ? "text-[#FF3B5C]" : isAmber ? "text-[#F0A020]" : isGreen ? "text-[#1DB954]" : "text-[#B3B3B3]"}`}>
                                            <span className="opacity-40 mr-2 text-[10px]">•</span>
                                            {cleanText}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
