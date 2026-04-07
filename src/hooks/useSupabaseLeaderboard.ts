"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export interface LeaderboardRow {
    rank: number;
    wallet_address: string;
    points: number;
    total_wins: number;
    total_losses: number;
    winRate: number;
    isCurrentUser?: boolean;
}

/**
 * useSupabaseLeaderboard
 *
 * Fetches the top 10 players by points from Supabase users table.
 * Subscribes to real-time changes so the board updates live as players earn points.
 * Falls back to empty array if Supabase is not configured.
 */
export function useSupabaseLeaderboard(currentWallet: string | null) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = useCallback(async () => {
        const supabase = createSupabaseClient();
        if (!supabase) { setLoading(false); return; }

        const { data, error } = await supabase
            .from("users")
            .select("wallet_address, points, total_wins, total_losses")
            .order("points", { ascending: false })
            .limit(10);

        if (error || !data) { setLoading(false); return; }

        const rows: LeaderboardRow[] = data.map((row, i) => ({
            rank: i + 1,
            wallet_address: row.wallet_address,
            points: row.points ?? 0,
            total_wins: row.total_wins ?? 0,
            total_losses: row.total_losses ?? 0,
            winRate: (row.total_wins + row.total_losses) > 0
                ? Math.round((row.total_wins / (row.total_wins + row.total_losses)) * 100)
                : 0,
            isCurrentUser: row.wallet_address === currentWallet,
        }));

        setLeaderboard(rows);
        setLoading(false);
    }, [currentWallet]);

    useEffect(() => {
        fetchLeaderboard();

        const supabase = createSupabaseClient();
        if (!supabase) return;

        // Real-time subscription on users table
        const channel = supabase
            .channel("leaderboard-realtime")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "users",
            }, () => {
                fetchLeaderboard();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchLeaderboard]);

    return { leaderboard, loading };
}
