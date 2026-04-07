"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createSupabaseClient } from "@/lib/supabase";
import { useTokenTier } from "@/hooks/useTokenTier";

/**
 * PointsProvider — Global Points, Streak & SOL Balance Tracking
 *
 * Points rules:
 *   +10  — Placing any bet
 *   +50  — Winning a bet
 *   +25  — Win streak bonus (every 3 consecutive wins)
 *
 * Balance rules:
 *   New account starts with 50.00 virtual SOL
 *   Balance deducted on bet, returned +/- on resolution
 *
 * Demo mode: persisted in localStorage per wallet address.
 */

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [];

export interface LeaderboardEntry {
    rank: number;
    wallet: string;
    points: number;
    wins: number;
    losses: number;
    winRate: number;
    isCurrentUser?: boolean;
}

export interface BetRecord {
    id: string;
    token: string;
    direction: "UP" | "DOWN";
    amount: number;
    timeframe: string;
    result: "win" | "loss" | "pending";
    payout: number;
    timestamp: number;
}

export type PointReason = "BET_PLACED" | "WIN" | "STREAK_BONUS";

const STARTING_BALANCE = 50;

interface PointsContextType {
    points: number;
    winStreak: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    solBalance: number;
    betHistory: BetRecord[];
    tierMultiplier: number;
    tierLabel: string;
    tierColor: string;
    tierEmoji: string;
    addPoints: (amount: number, reason: PointReason) => void;
    recordWin: () => void;
    recordLoss: () => void;
    deductBalance: (amount: number) => boolean;
    addToBalance: (amount: number) => void;
    addBetRecord: (bet: BetRecord) => void;
    leaderboard: LeaderboardEntry[];
    userRank: number | null;
    lastPointGain: { amount: number; reason: PointReason } | null;
}

const PointsContext = createContext<PointsContextType>({
    points: 0,
    winStreak: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    solBalance: STARTING_BALANCE,
    betHistory: [],
    tierMultiplier: 1,
    tierLabel: "DEGEN",
    tierColor: "text-terminal-green-dark",
    tierEmoji: "",
    addPoints: () => { },
    recordWin: () => { },
    recordLoss: () => { },
    deductBalance: () => false,
    addToBalance: () => { },
    addBetRecord: () => { },
    leaderboard: [],
    userRank: null,
    lastPointGain: null,
});

export const usePoints = () => useContext(PointsContext);

interface StoredState {
    points: number;
    winStreak: number;
    totalWins: number;
    totalLosses: number;
    solBalance: number;
    betHistory: BetRecord[];
}

function getStorageKey(wallet: string) {
    return `pumpdraft_state_${wallet}`;
}

function loadFromStorage(wallet: string): StoredState {
    try {
        const raw = localStorage.getItem(getStorageKey(wallet));
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {
        points: 0,
        winStreak: 0,
        totalWins: 0,
        totalLosses: 0,
        solBalance: STARTING_BALANCE,
        betHistory: [],
    };
}

function saveToStorage(wallet: string, state: StoredState) {
    try {
        localStorage.setItem(getStorageKey(wallet), JSON.stringify(state));
    } catch { /* ignore */ }
}

export default function PointsProvider({ children }: { children: React.ReactNode }) {
    const { publicKey } = useWallet();
    const walletKey = publicKey?.toBase58() ?? "demo";
    const { tier } = useTokenTier();

    const [points, setPoints] = useState(0);
    const [winStreak, setWinStreak] = useState(0);
    const [totalWins, setTotalWins] = useState(0);
    const [totalLosses, setTotalLosses] = useState(0);
    const [solBalance, setSolBalance] = useState(STARTING_BALANCE);
    const [betHistory, setBetHistory] = useState<BetRecord[]>([]);
    const [lastPointGain, setLastPointGain] = useState<{ amount: number; reason: PointReason } | null>(null);

    // Load from localStorage when wallet connects
    useEffect(() => {
        const stored = loadFromStorage(walletKey);
        setPoints(stored.points);
        setWinStreak(stored.winStreak);
        setTotalWins(stored.totalWins);
        setTotalLosses(stored.totalLosses);
        setSolBalance(stored.solBalance);
        setBetHistory(stored.betHistory ?? []);

        // Also try to fetch from Supabase (Supabase is source of truth)
        const supabase = createSupabaseClient();
        if (supabase && walletKey !== "demo") {
            supabase
                .from("users")
                .select("points, win_streak, total_wins, total_losses, sol_balance")
                .eq("wallet_address", walletKey)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        setPoints(data.points ?? 0);
                        setWinStreak(data.win_streak ?? 0);
                        setTotalWins(data.total_wins ?? 0);
                        setTotalLosses(data.total_losses ?? 0);
                        setSolBalance(data.sol_balance ?? STARTING_BALANCE);
                    } else {
                        // New user — create row with starting balance
                        supabase.from("users").insert({
                            wallet_address: walletKey,
                            points: 0,
                            win_streak: 0,
                            total_wins: 0,
                            total_losses: 0,
                            sol_balance: STARTING_BALANCE,
                        }).then(() => { });
                    }
                });
        }
    }, [walletKey]);

    // Save to localStorage on every change
    useEffect(() => {
        saveToStorage(walletKey, { points, winStreak, totalWins, totalLosses, solBalance, betHistory });

        // Sync to Supabase (best-effort, non-blocking)
        const supabase = createSupabaseClient();
        if (supabase && walletKey !== "demo") {
            supabase.from("users").upsert({
                wallet_address: walletKey,
                points,
                win_streak: winStreak,
                total_wins: totalWins,
                total_losses: totalLosses,
                sol_balance: solBalance,
            }, { onConflict: "wallet_address" }).then(() => { });
        }
    }, [walletKey, points, winStreak, totalWins, totalLosses, solBalance, betHistory]);

    const addPoints = useCallback((amount: number, reason: PointReason) => {
        // Apply tier multiplier to all point gains
        const multiplied = Math.round(amount * tier.multiplier);
        setPoints(p => p + multiplied);
        setLastPointGain({ amount: multiplied, reason });
        setTimeout(() => setLastPointGain(null), 2000);
    }, [tier.multiplier]);

    const recordWin = useCallback(() => {
        setTotalWins(w => w + 1);
        setWinStreak(s => {
            const newStreak = s + 1;
            if (newStreak % 3 === 0) {
                setPoints(p => p + 75);
                setLastPointGain({ amount: 75, reason: "STREAK_BONUS" });
            } else {
                setPoints(p => p + 50);
                setLastPointGain({ amount: 50, reason: "WIN" });
            }
            setTimeout(() => setLastPointGain(null), 2000);
            return newStreak;
        });
    }, []);

    const recordLoss = useCallback(() => {
        setTotalLosses(l => l + 1);
        setWinStreak(0);
    }, []);

    // Returns false if insufficient balance
    const deductBalance = useCallback((amount: number): boolean => {
        let success = false;
        setSolBalance(b => {
            if (b < amount) { success = false; return b; }
            success = true;
            return Math.round((b - amount) * 100) / 100;
        });
        return success;
    }, []);

    const addToBalance = useCallback((amount: number) => {
        setSolBalance(b => Math.round((b + amount) * 100) / 100);
    }, []);

    const addBetRecord = useCallback((bet: BetRecord) => {
        setBetHistory(prev => [bet, ...prev].slice(0, 50)); // keep last 50
    }, []);

    const winRate = totalWins + totalLosses > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
        : 0;

    const walletDisplay = publicKey
        ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
        : null;

    const userEntry: LeaderboardEntry | null = walletDisplay && points > 0
        ? { rank: 0, wallet: walletDisplay, points, wins: totalWins, losses: totalLosses, winRate, isCurrentUser: true }
        : null;

    // Only inject user into leaderboard when there are other players too
    const rawBoard = MOCK_LEADERBOARD.length > 0 && userEntry
        ? [...MOCK_LEADERBOARD.filter(e => e.wallet !== walletDisplay), userEntry]
        : [...MOCK_LEADERBOARD];

    const sortedBoard = rawBoard
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((e, i) => ({ ...e, rank: i + 1 }));

    const userRank = sortedBoard.find(e => e.isCurrentUser)?.rank ?? null;

    return (
        <PointsContext.Provider value={{
            points, winStreak, totalWins, totalLosses, winRate,
            solBalance, betHistory,
            tierMultiplier: tier.multiplier,
            tierLabel: tier.label,
            tierColor: tier.color,
            tierEmoji: tier.emoji,
            addPoints, recordWin, recordLoss,
            deductBalance, addToBalance, addBetRecord,
            leaderboard: sortedBoard, userRank, lastPointGain,
        }}>
            {children}
        </PointsContext.Provider>
    );
}
