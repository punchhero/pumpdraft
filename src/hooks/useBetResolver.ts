"use client";

import { useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { createSupabaseClient } from "@/lib/supabase";
import { usePoints } from "@/providers/PointsProvider";
import idl from "@/lib/pumpdraft.json";

const PROGRAM_ID = new PublicKey("BLz3BRDWocq7uU6jTBsMwAenSsPNN8TvewfCaRELWk5r");
const POLL_INTERVAL_MS = 60_000; // Check every 60 seconds

/**
 * useBetResolver
 *
 * Client-side hook that automatically resolves expired betting pools.
 * This is the alternative to a cron job — it runs as long as a user
 * is on the page, checking for expired pools every 60 seconds.
 *
 * Flow:
 *  1. Query Supabase for pools where end_time < now AND status = "open"
 *  2. Fetch the current exit price from DexScreener for each expired pool
 *  3. Call /api/resolve-bet to calculate winners and update Supabase
 *  4. If the current user won, call claim_winnings on-chain via Anchor
 *  5. Award points and update bet history
 */
export function useBetResolver() {
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { recordWin, recordLoss, addPoints, addToBalance, addBetRecord } = usePoints();

  const fetchCurrentPrice = useCallback(async (tokenAddress: string): Promise<number | null> => {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const pairs = data.pairs ?? [];
      if (pairs.length === 0) return null;

      // Use the most liquid SOL pair
      const solPair = pairs
        .filter((p: any) => p.chainId === "solana" && p.quoteToken?.symbol === "SOL")
        .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

      const pair = solPair ?? pairs[0];
      return parseFloat(pair.priceUsd ?? "0") || null;
    } catch {
      return null;
    }
  }, []);

  const resolveExpiredPools = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const now = new Date().toISOString();

    // Find all expired open pools
    const { data: expiredPools, error } = await supabase
      .from("pools")
      .select("*")
      .eq("status", "open")
      .lt("end_time", now);

    if (error || !expiredPools || expiredPools.length === 0) return;

    for (const pool of expiredPools) {
      try {
        // Fetch exit price from DexScreener
        const exitPrice = await fetchCurrentPrice(pool.token_address);
        if (exitPrice === null) {
          console.warn(`No price found for ${pool.token_address}, skipping.`);
          continue;
        }

        // Call server-side resolve-bet API
        const res = await fetch("/api/resolve-bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poolId: pool.id, exitPrice }),
        });

        if (!res.ok) continue;
        const resolution = await res.json();
        if (!resolution.success) continue;

        const { winningSide, rewardPool, winningSideTotal } = resolution.result;

        // If the current user is connected, handle their prediction on-chain
        if (connected && publicKey && anchorWallet) {
          const walletAddr = publicKey.toBase58();

          // Get user's prediction for this pool
          const { data: userPred } = await supabase
            .from("predictions")
            .select("*")
            .eq("pool_id", pool.id)
            .eq("wallet_address", walletAddr)
            .eq("status", "resolved")
            .maybeSingle();

          if (userPred) {
            const isWinner = userPred.result === "win";
            const betAmount = parseFloat(userPred.bet_amount);
            const payout = parseFloat(userPred.payout ?? "0");

            if (isWinner) {
              // Try to claim on-chain winnings via Anchor
              try {
                const provider = new AnchorProvider(connection, anchorWallet, {
                  preflightCommitment: "processed",
                });
                const program = new Program(idl as any, PROGRAM_ID, provider);

                const marketIdStr = `${pool.token_address.slice(0, 4)}${pool.timeframe}`;
                const encoded = new TextEncoder().encode(marketIdStr);
                const numericHash = Array.from(encoded).reduce(
                  (a: number, b: number) => a + b,
                  0
                );
                const marketIdBn = new BN(numericHash);

                const [marketPda] = PublicKey.findProgramAddressSync(
                  [Buffer.from("market"), marketIdBn.toArrayLike(Buffer, "le", 8)],
                  PROGRAM_ID
                );
                const [predictionPda] = PublicKey.findProgramAddressSync(
                  [
                    Buffer.from("prediction"),
                    marketPda.toBuffer(),
                    publicKey.toBuffer(),
                  ],
                  PROGRAM_ID
                );

                // Check if on-chain claim is still possible
                const predInfo = await connection.getAccountInfo(predictionPda);
                if (predInfo) {
                  await program.methods
                    .claimWinnings()
                    .accounts({
                      market: marketPda,
                      prediction: predictionPda,
                      user: publicKey,
                      systemProgram: new PublicKey("11111111111111111111111111111111"),
                    })
                    .rpc();
                  console.log(`✅ On-chain claim successful for pool ${pool.id}`);
                }
              } catch (claimErr: any) {
                // On-chain claim may already be done or market not settled yet on-chain
                console.warn("On-chain claim skipped:", claimErr?.message);
              }

              // Update local state regardless
              recordWin();
              addPoints(50, "WIN");
              addToBalance(payout);
              addBetRecord({
                id: userPred.tx_signature?.slice(0, 8).toUpperCase() ?? pool.id,
                token: pool.token_symbol,
                direction: userPred.direction,
                amount: betAmount,
                timeframe: pool.timeframe,
                result: "win",
                payout,
                timestamp: Date.now(),
              });
            } else {
              recordLoss();
              addBetRecord({
                id: userPred.tx_signature?.slice(0, 8).toUpperCase() ?? pool.id,
                token: pool.token_symbol,
                direction: userPred.direction,
                amount: betAmount,
                timeframe: pool.timeframe,
                result: "loss",
                payout: 0,
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error resolving pool ${pool.id}:`, err);
      }
    }
  }, [
    connected,
    publicKey,
    anchorWallet,
    connection,
    fetchCurrentPrice,
    recordWin,
    recordLoss,
    addPoints,
    addToBalance,
    addBetRecord,
  ]);

  // Run on mount and every 60 seconds
  useEffect(() => {
    resolveExpiredPools();
    const interval = setInterval(resolveExpiredPools, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [resolveExpiredPools]);
}
