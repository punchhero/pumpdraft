import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/settle
 *
 * Settles all expired open pools by:
 *  1. Finding pools where end_time < NOW and status = "open"
 *  2. Fetching the current exit price from DexScreener
 *  3. Calling the resolve-bet logic inline (same math as /api/resolve-bet)
 *  4. Updating all predictions + user stats in Supabase
 *
 * This endpoint is designed to be called by an external free cron service
 * such as cron-job.org every 1 minute.
 *
 * For security, it checks a CRON_SECRET header or query param.
 * Set CRON_SECRET in your Vercel environment variables.
 *
 * Call example:
 *   https://your-app.vercel.app/api/cron/settle?secret=YOUR_CRON_SECRET
 */

const PLATFORM_FEE_RATE = 0.05;

async function fetchExitPrice(tokenAddress: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: any[] = data.pairs ?? [];
    if (pairs.length === 0) return null;

    const solPair = pairs
      .filter((p) => p.chainId === "solana" && p.quoteToken?.symbol === "SOL")
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

    const pair = solPair ?? pairs[0];
    return parseFloat(pair.priceUsd ?? "0") || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Security: verify secret
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();
  const settled: string[] = [];
  const skipped: string[] = [];

  // 1. Find all expired open pools
  const { data: expiredPools, error } = await supabase
    .from("pools")
    .select("*")
    .eq("status", "open")
    .lt("end_time", now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiredPools || expiredPools.length === 0) {
    return NextResponse.json({ success: true, message: "No expired pools to settle.", settled: [] });
  }

  for (const pool of expiredPools) {
    try {
      // 2. Get exit price from DexScreener
      const exitPrice = await fetchExitPrice(pool.token_address);
      if (exitPrice === null) {
        skipped.push(pool.id);
        continue;
      }

      // 3. Determine winner
      const entryPrice = parseFloat(pool.entry_price ?? "0");
      const winningSide = exitPrice > entryPrice ? "UP" : "DOWN";

      // 4. Pari-mutuel math
      const totalUp = parseFloat(pool.total_up_bets ?? "0");
      const totalDown = parseFloat(pool.total_down_bets ?? "0");
      const totalPool = totalUp + totalDown;
      const losingSideTotal = winningSide === "UP" ? totalDown : totalUp;
      const winningSideTotal = winningSide === "UP" ? totalUp : totalDown;

      // If no one bet the losing side — full refund, no fee
      const noLosers = losingSideTotal === 0;
      const platformFee = noLosers ? 0 : totalPool * PLATFORM_FEE_RATE;
      const rewardPool = noLosers ? totalPool : totalPool - platformFee;

      // 5. Update pool record
      await supabase
        .from("pools")
        .update({
          exit_price: exitPrice,
          end_time: now,
          winning_side: winningSide,
          platform_fee: platformFee,
          reward_pool: rewardPool,
          status: "resolved",
        })
        .eq("id", pool.id);

      // 6. Resolve all predictions in this pool
      const { data: predictions } = await supabase
        .from("predictions")
        .select("*")
        .eq("pool_id", pool.id)
        .eq("status", "pending");

      if (predictions && predictions.length > 0) {
        for (const pred of predictions) {
          const isWinner = pred.direction === winningSide;
          const betAmount = parseFloat(pred.bet_amount);

          let payout = 0;
          if (isWinner && winningSideTotal > 0) {
            const userShare = betAmount / winningSideTotal;
            payout = userShare * rewardPool;
          }

          await supabase
            .from("predictions")
            .update({
              exit_price: exitPrice,
              exit_time: now,
              status: "resolved",
              result: isWinner ? "win" : "loss",
              payout,
            })
            .eq("id", pred.id);

          // Update user stats
          if (isWinner) {
            await supabase.rpc("increment_wins", {
              p_wallet: pred.wallet_address,
              p_earned: payout,
            });
          } else {
            await supabase.rpc("increment_losses", {
              p_wallet: pred.wallet_address,
            });
          }
        }
      }

      settled.push(pool.id);
    } catch (err: any) {
      console.error(`Failed to settle pool ${pool.id}:`, err.message);
      skipped.push(pool.id);
    }
  }

  return NextResponse.json({
    success: true,
    settled: settled.length,
    skipped: skipped.length,
    settledIds: settled,
    timestamp: now,
  });
}
