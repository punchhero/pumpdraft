import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/resolve-bet
 *
 * Server-side API route that resolves a bet after its timeframe expires.
 * 
 * Pari-Mutuel PVP Pool Calculation:
 *   Total Pool = Sum(UP bets) + Sum(DOWN bets)
 *   Platform Fee = Total Pool × 0.05
 *   Reward Pool = Total Pool - Platform Fee
 *   User Share = User's Bet / Total Bets on Winning Side
 *   Final Payout = User Share × Reward Pool
 *
 * This route will be called by a cron job or client-side timer
 * when a bet's timeframe expires.
 *
 * NOTE: Requires Supabase service_role key for server-side operations.
 *       Falls back to mock resolution when Supabase is not configured.
 */

const PLATFORM_FEE_RATE = 0.05; // 5%

interface ResolveBetRequest {
    poolId: string;
    exitPrice: number;
}

export async function POST(req: NextRequest) {
    try {
        const body: ResolveBetRequest = await req.json();
        const { poolId, exitPrice } = body;

        if (!poolId || exitPrice === undefined) {
            return NextResponse.json(
                { error: "poolId and exitPrice are required" },
                { status: 400 }
            );
        }

        // Check if Supabase is configured
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (
            !supabaseUrl ||
            !supabaseServiceKey ||
            supabaseUrl === "https://your-project.supabase.co"
        ) {
            // ── MOCK RESOLUTION (no Supabase) ──────────────────────
            return NextResponse.json({
                success: true,
                mock: true,
                message: "Supabase not configured — returning mock resolution",
                result: {
                    poolId,
                    exitPrice,
                    winningSide: exitPrice > 0 ? "UP" : "DOWN",
                    totalPool: 20.8,
                    platformFee: 1.04,
                    rewardPool: 19.76,
                },
            });
        }

        // ── REAL RESOLUTION (with Supabase) ──────────────────────
        // Import Supabase admin client (server-side with service_role key)
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get the pool
        const { data: pool, error: poolError } = await supabase
            .from("pools")
            .select("*")
            .eq("id", poolId)
            .single();

        if (poolError || !pool) {
            return NextResponse.json(
                { error: "Pool not found" },
                { status: 404 }
            );
        }

        if (pool.status === "resolved") {
            return NextResponse.json(
                { error: "Pool already resolved" },
                { status: 400 }
            );
        }

        // 2. Determine winning side
        const entryPrice = parseFloat(pool.entry_price);
        const winningSide = exitPrice > entryPrice ? "UP" : "DOWN";

        // 3. Calculate pari-mutuel payouts
        const totalUp = parseFloat(pool.total_up_bets);
        const totalDown = parseFloat(pool.total_down_bets);
        const totalPool = totalUp + totalDown;
        const losingSideTotal = winningSide === "UP" ? totalDown : totalUp;
        const winningSideTotal = winningSide === "UP" ? totalUp : totalDown;

        // Edge case: if there are NO losers (everyone bet the same direction),
        // refund 100% of stakes — do NOT charge a fee on their own money.
        const noLosers = losingSideTotal === 0;
        const platformFee = noLosers ? 0 : totalPool * PLATFORM_FEE_RATE;
        const rewardPool = noLosers ? totalPool : totalPool - platformFee;

        // 4. Update pool status
        await supabase
            .from("pools")
            .update({
                exit_price: exitPrice,
                end_time: new Date().toISOString(),
                winning_side: winningSide,
                platform_fee: platformFee,
                reward_pool: rewardPool,
                status: "resolved",
            })
            .eq("id", poolId);

        // 5. Get all predictions for this pool
        const { data: predictions } = await supabase
            .from("predictions")
            .select("*")
            .eq("pool_id", poolId)
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

                // 6. Update each prediction
                await supabase
                    .from("predictions")
                    .update({
                        exit_price: exitPrice,
                        exit_time: new Date().toISOString(),
                        status: "resolved",
                        result: isWinner ? "win" : "loss",
                        payout: payout,
                    })
                    .eq("id", pred.id);

                // 7. Update user win/loss record
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

        return NextResponse.json({
            success: true,
            mock: false,
            result: {
                poolId,
                entryPrice,
                exitPrice,
                winningSide,
                totalPool,
                platformFee,
                rewardPool,
                predictionsResolved: predictions?.length || 0,
            },
        });
    } catch (error) {
        console.error("Resolve bet error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
