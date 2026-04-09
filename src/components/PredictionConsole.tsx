"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import type { TokenInfo } from "@/components/DexScreenerChart";
import { usePoints } from "@/providers/PointsProvider";
import { useSupabasePool } from "@/hooks/useSupabasePool";
import { createSupabaseClient } from "@/lib/supabase";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
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
            if (!anchorWallet) throw new Error("Wallet not linked.");
            
            // 1. Setup Anchor Provider
            const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: "processed" });
            const program = new Program(idl as any, PROGRAM_ID, provider);

            // 2. Generate a unique integer ID based on Token + Timeframe
            const marketIdStr = `${selectedToken.address.slice(0, 4)}${timeframe}`;
            const encoded = new TextEncoder().encode(marketIdStr);
            const numericHash = Array.from(encoded).reduce((a: number, b: number) => a + b, 0);
            const marketIdBn = new BN(numericHash);

            // 3. Find Smart Contract PDAs
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
            const amountLamports = new BN(Math.floor(amount * 1e9)); // lamports must be integer

            // 4. If the market doesn't exist yet on-chain, automatically initialize it
            if (!marketInfo) {
                addConsoleLine(`> INITIALIZING NEW ON-CHAIN MARKET PDA...`, "text-terminal-amber");
                const resolveTime = new BN(Math.floor(Date.now() / 1000) + (5 * 60));
                const initIx = await program.methods.initializeMarket(
                    marketIdBn,
                    new PublicKey(selectedToken.address),
                    new BN(Math.floor(selectedToken.usd_market_cap)),
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

            // 5. Append the user's prediction bet instruction
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

            // 6. Request wallet signature and execute entirely on-chain!
            addConsoleLine(`> WAITING FOR WALLET SIGNATURE...`, "text-terminal-amber animate-pulse");
            const signature = await provider.sendAndConfirm(tx);
            
            addConsoleLine(`> BLOCKCHAIN SUCCESS: TX ${signature.slice(0, 10)}...`, "text-terminal-green font-bold");

            // Only deduct local UI balance after successful chain confirmation
            deductBalance(amount);

            // Sync with our UI off-chain Supabase stats
            const poolId = await addBetToPool(
                selectedToken.symbol,
                direction,
                amount,
                0,
                publicKey?.toBase58() ?? "demo",
            );

            if (poolId && publicKey) {
                const supabase = createSupabaseClient();
                supabase?.from("predictions").insert({
                    wallet_address: publicKey.toBase58(),
                    token_address: selectedToken.address,
                    token_symbol: selectedToken.symbol,
                    direction,
                    bet_amount: amount,
                    entry_price: 0,
                    timeframe,
                    status: "pending",
                    pool_id: poolId,
                }).then(() => { });
            }

            // +10 points for placing a verified on-chain bet
            addPoints(10, "BET_PLACED");
            addConsoleLine(`> +10 PTS AWARDED! BALANCE EXPORTED.`, "text-terminal-green");

            addBetRecord({
                id: signature.slice(0,8),
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
            addConsoleLine(`> TX REJECTED: ${error.message || "User declined."}`, "text-terminal-red");
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
        <div className="terminal-border bg-[#050505] rounded-sm overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-green-dark bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                    <span className="text-terminal-green text-[10px]">●</span>
                    <span className="text-terminal-green-dark text-[10px]">
                        PREDICTION_ENGINE.sh
                    </span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                    {/* Points flash */}
                    {lastPointGain && (
                        <span className="text-yellow-400 font-bold animate-pulse">
                            +{lastPointGain.amount} PTS
                            {lastPointGain.reason === "STREAK_BONUS" && " 🔥 STREAK!"}
                        </span>
                    )}
                    <span className="text-terminal-green-dark">
                        PTS: <span className="text-terminal-green font-bold">{points.toLocaleString()}</span>
                    </span>
                    {winStreak >= 2 && (
                        <span className="text-yellow-400 font-bold">
                            🔥{winStreak}W
                        </span>
                    )}
                    <span className="text-terminal-green">
                        {selectedToken ? `$${selectedToken.symbol}` : "NO TOKEN"}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Pool Stats Display */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div className="terminal-border p-2 text-center">
                        <div className="text-terminal-green-dark">POOL</div>
                        <div className="text-terminal-green text-glow font-bold">
                            {totalPool.toFixed(2)} SOL
                        </div>
                    </div>
                    <div className="terminal-border p-2 text-center">
                        <div className="text-terminal-green-dark">UP BETS</div>
                        <div className="text-terminal-green font-bold">
                            {poolData.totalUp.toFixed(2)} SOL
                        </div>
                    </div>
                    <div className="terminal-border p-2 text-center">
                        <div className="text-terminal-green-dark">DOWN BETS</div>
                        <div className="text-terminal-red font-bold">
                            {poolData.totalDown.toFixed(2)} SOL
                        </div>
                    </div>
                    <div className="terminal-border p-2 text-center">
                        <div className="text-terminal-green-dark">PLAYERS</div>
                        <div className="text-terminal-amber font-bold">
                            {poolData.participants}
                        </div>
                    </div>
                </div>

                {/* Pari-Mutuel Multipliers */}
                <div className="flex gap-2 text-[10px]">
                    <div className="flex-1 terminal-border p-2 text-center">
                        <span className="text-terminal-green-dark">UP PAYOUT: </span>
                        <span className="text-terminal-green font-bold">{upMultiplier}x</span>
                    </div>
                    <div className="flex-1 terminal-border p-2 text-center">
                        <span className="text-terminal-green-dark">DOWN PAYOUT: </span>
                        <span className="text-terminal-red font-bold">{downMultiplier}x</span>
                    </div>
                    <div className="flex-1 terminal-border p-2 text-center">
                        <span className="text-terminal-green-dark">FEE: </span>
                        <span className="text-terminal-amber font-bold">5%</span>
                    </div>
                </div>

                {/* Timeframe Selector */}
                <div>
                    <div className="text-terminal-green-dark text-[10px] mb-1.5 tracking-wider">
                        &gt; SELECT TIMEFRAME:
                    </div>
                    <div className="flex gap-1.5">
                        {TIMEFRAMES.map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`
                  flex-1 py-2 text-xs font-bold tracking-wider
                  border transition-all duration-150
                  ${tf === timeframe
                                        ? "border-terminal-green bg-terminal-green text-black shadow-[0_0_10px_rgba(0,255,65,0.3)]"
                                        : "border-terminal-green-dark text-terminal-green-dark hover:border-terminal-green hover:text-terminal-green"
                                    }
                `}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bet Amount Input */}
                <div>
                    <div className="text-terminal-green-dark text-[10px] mb-1.5 tracking-wider">
                        &gt; ENTER BET AMOUNT (SOL):
                    </div>
                    <div className="flex items-center gap-2 terminal-border bg-[#0a0a0a] px-3 py-2">
                        <span className="text-terminal-green text-sm">$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            placeholder="0.00"
                            className="
                flex-1 bg-transparent text-terminal-green text-glow text-sm
                outline-none placeholder:text-terminal-green-dark
                [appearance:textfield]
                [&::-webkit-outer-spin-button]:appearance-none
                [&::-webkit-inner-spin-button]:appearance-none
              "
                        />
                        <span className="text-terminal-green-dark text-xs">SOL</span>
                    </div>
                </div>

                {/* PUMP / DUMP Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    {/* PUMP (UP) */}
                    <button
                        onClick={() => placeBet("UP")}
                        disabled={isPlacingBet}
                        className="
              group relative py-4
              border-2 border-terminal-green
              bg-transparent
              text-terminal-green text-lg font-bold tracking-widest
              transition-all duration-200
              hover:bg-terminal-green hover:text-black
              hover:shadow-[0_0_30px_rgba(0,255,65,0.4)]
              active:scale-95
              disabled:opacity-50 disabled:cursor-wait
            "
                    >
                        <span className="text-2xl">▲</span>
                        <br />
                        PUMP
                    </button>

                    {/* DUMP (DOWN) */}
                    <button
                        onClick={() => placeBet("DOWN")}
                        disabled={isPlacingBet}
                        className="
              group relative py-4
              border-2 border-terminal-red
              bg-transparent
              text-terminal-red text-lg font-bold tracking-widest
              transition-all duration-200
              hover:bg-terminal-red hover:text-black
              hover:shadow-[0_0_30px_rgba(255,0,64,0.4)]
              active:scale-95
              disabled:opacity-50 disabled:cursor-wait
            "
                    >
                        <span className="text-2xl">▼</span>
                        <br />
                        DUMP
                    </button>
                </div>

                {/* Console Output / Bet History */}
                {consoleLines.length > 0 && (
                    <div className="terminal-border bg-[#0a0a0a] p-3 max-h-[160px] overflow-y-auto">
                        <div className="text-terminal-green-dark text-[10px] mb-1 tracking-wider">
                            CONSOLE OUTPUT:
                        </div>
                        {consoleLines.map((line, i) => (
                            <div key={i} className={`text-xs ${line.color} leading-relaxed`}>
                                {line.text}
                            </div>
                        ))}
                        <div className="text-terminal-green text-xs mt-1">
                            &gt; <span className="cursor-blink">█</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom status */}
            <div className="flex justify-between px-3 py-1 border-t border-terminal-green-dark text-[10px] text-terminal-green-dark">
                <span>
                    TIMEFRAME: <span className="text-terminal-green">{timeframe}</span>
                </span>
                <span>
                    ENGINE:{" "}
                    <span className="text-terminal-green">PARI-MUTUEL</span>
                </span>
            </div>
        </div>
    );
}
