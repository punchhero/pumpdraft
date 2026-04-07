"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export interface PoolData {
    id: string | null;
    totalUp: number;
    totalDown: number;
    totalPool: number;
    participants: number;
}

const DEFAULT_POOL: PoolData = {
    id: null,
    totalUp: 0,
    totalDown: 0,
    totalPool: 0,
    participants: 0,
};

/**
 * useSupabasePool
 *
 * Fetches or creates the active pool for a given token + timeframe.
 * Subscribes to real-time changes on the pools table.
 * Falls back to zeroed local state if Supabase is not configured.
 *
 * Also exposes addBetToPool() to update pool totals when a bet is placed.
 */
export function useSupabasePool(tokenAddress: string | null, timeframe: string) {
    const [poolData, setPoolData] = useState<PoolData>(DEFAULT_POOL);
    const [loading, setLoading] = useState(true);

    const fetchPool = useCallback(async () => {
        const supabase = createSupabaseClient();
        if (!supabase || !tokenAddress) { setLoading(false); return; }

        // Find the latest open pool for this token + timeframe
        const { data, error } = await supabase
            .from("pools")
            .select("id, total_up_bets, total_down_bets, total_pool")
            .eq("token_address", tokenAddress)
            .eq("timeframe", timeframe)
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) { setLoading(false); return; }

        if (data) {
            // Count unique participants
            const { count } = await supabase
                .from("predictions")
                .select("*", { count: "exact", head: true })
                .eq("pool_id", data.id);

            setPoolData({
                id: data.id,
                totalUp: data.total_up_bets ?? 0,
                totalDown: data.total_down_bets ?? 0,
                totalPool: data.total_pool ?? 0,
                participants: count ?? 0,
            });
        } else {
            setPoolData(DEFAULT_POOL);
        }
        setLoading(false);
    }, [tokenAddress, timeframe]);

    useEffect(() => {
        setPoolData(DEFAULT_POOL);
        fetchPool();

        const supabase = createSupabaseClient();
        if (!supabase) return;

        const channel = supabase
            .channel(`pool-realtime-${tokenAddress}-${timeframe}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "pools",
            }, () => fetchPool())
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "predictions",
            }, () => fetchPool())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [tokenAddress, timeframe, fetchPool]);

    /**
     * addBetToPool — called when a bet is placed.
     * Creates a pool if none exists, updates totals, returns pool id.
     */
    const addBetToPool = useCallback(async (
        tokenSymbol: string,
        direction: "UP" | "DOWN",
        amount: number,
        entryPrice: number,
        walletAddress: string,
    ): Promise<string | null> => {
        const supabase = createSupabaseClient();
        if (!supabase || !tokenAddress) return null;

        let poolId = poolData.id;

        // Create pool if it doesn't exist yet
        if (!poolId) {
            const endTime = new Date(Date.now() + parseDuration(timeframe)).toISOString();
            const { data: newPool, error } = await supabase
                .from("pools")
                .insert({
                    token_address: tokenAddress,
                    token_symbol: tokenSymbol,
                    timeframe,
                    entry_price: entryPrice,
                    end_time: endTime,
                    total_up_bets: 0,
                    total_down_bets: 0,
                    total_pool: 0,
                    status: "open",
                })
                .select("id")
                .single();

            if (error || !newPool) return null;
            poolId = newPool.id;
        }

        // Update pool totals
        const upDelta = direction === "UP" ? amount : 0;
        const downDelta = direction === "DOWN" ? amount : 0;
        await supabase.rpc("update_pool_totals", {
            p_pool_id: poolId,
            p_up_delta: upDelta,
            p_down_delta: downDelta,
            p_total_delta: amount,
        }).maybeSingle(); // best-effort, don't block

        // Fallback: direct update if RPC not available
        await supabase
            .from("pools")
            .update({
                total_up_bets: (poolData.totalUp + upDelta),
                total_down_bets: (poolData.totalDown + downDelta),
                total_pool: (poolData.totalPool + amount),
            })
            .eq("id", poolId);

        // Optimistic UI update
        setPoolData(prev => ({
            ...prev,
            id: poolId!,
            totalUp: prev.totalUp + upDelta,
            totalDown: prev.totalDown + downDelta,
            totalPool: prev.totalPool + amount,
            participants: prev.participants + 1,
        }));

        return poolId;
    }, [poolData, tokenAddress, timeframe]);

    return { poolData, loading, addBetToPool };
}

function parseDuration(timeframe: string): number {
    const map: Record<string, number> = {
        "1m": 60_000,
        "5m": 300_000,
        "15m": 900_000,
        "30m": 1_800_000,
        "1h": 3_600_000,
    };
    return map[timeframe] ?? 300_000;
}
