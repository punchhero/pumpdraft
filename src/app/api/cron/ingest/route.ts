import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // Ensure cron doesn't cache

const MIN_MCAP = 250_000;
const MIN_AGE_HOURS = 24;
const MIN_AGE_SECONDS = MIN_AGE_HOURS * 60 * 60;

// Base tokens to ensure the leaderboard is populated with the strongest coins
const SEED_TOKENS = [
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82", "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  "C5gR63GbzmdyKegkFZyPAZkfWqn4tR7it8RTWakepump", "ARbvFZqhtbSnHhq7c7fva8bU67GnUr14RdxpDkWUpump",
  "DUr5rZAfYduvihaiyMnfqgnhqYWbPWJXvK954qyTpump", "FLJYGHpCCcfYUdzhcfHSeSd2peb5SMajNWaCsRnhpump"
];

export async function GET(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key || url === "https://your-project.supabase.co") {
      return NextResponse.json({ error: "Missing Supabase credentials." }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const uniqueTokens = new Map<string, any>();
    const nowSeconds = Math.floor(Date.now() / 1000);

    // 1. Fetch live metadata for seed tokens + trending pump.fun searches
    const endpoints = [
      `https://api.dexscreener.com/latest/dex/tokens/${SEED_TOKENS.join(",")}`,
      `https://api.dexscreener.com/latest/dex/search?q=solana%20pump`
    ];

    for (const link of endpoints) {
      try {
        const res = await fetch(link, { headers: { "Accept": "application/json" } });
        if (!res.ok) continue;

        const data = await res.json();
        const pairs = data.pairs ?? [];

        for (const pair of pairs) {
          const tokenAddress = pair.baseToken.address;
          if (pair.chainId !== "solana") continue;

          const mcap = pair.marketCap ?? pair.fdv ?? 0;
          const createdAt = pair.pairCreatedAt ? Math.floor(pair.pairCreatedAt / 1000) : 0;
          const ageHours = createdAt > 0 ? (nowSeconds - createdAt) / 3600 : 999;
          
          if (!uniqueTokens.has(tokenAddress)) {
            uniqueTokens.set(tokenAddress, {
              mint_address: tokenAddress,
              symbol: pair.baseToken.symbol,
              name: pair.baseToken.name,
              image_uri: pair.info?.imageUrl ?? null,
              current_mcap: mcap,
              current_price: parseFloat(pair.priceUsd ?? "0"),
              launch_timestamp: new Date(createdAt * 1000).toISOString(),
              graduated: false,
              dev_wallet: null,
              bonding_curve_progress: 100
            });
          }
        }
      } catch (err) {
        console.warn("API Error during ingest subset: ", err);
      }
    }

    // 2. Filter data rigorously against user requirements (MCAP >= 250k, AGE >= 24h)
    const validTokens = Array.from(uniqueTokens.values()).filter((coin) => {
        const launchTime = new Date(coin.launch_timestamp).getTime() / 1000;
        return coin.current_mcap >= MIN_MCAP && (nowSeconds - launchTime) >= MIN_AGE_SECONDS;
    });

    if (validTokens.length === 0) {
        return NextResponse.json({ message: "No tokens met 250k MCAP + 24h Age thresholds in this cycle." });
    }

    // 3. Upsert aggressively into Supabase
    const { error } = await supabase
      .from('tokens')
      .upsert(validTokens, { onConflict: 'mint_address' });

    if (error) throw error;

    return NextResponse.json({ 
        success: true, 
        message: `Successfully indexed ${validTokens.length} massive tokens into Supabase.` 
    });

  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
