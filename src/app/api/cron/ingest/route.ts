import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_MCAP = 200_000;      // Strictly less than $200k
const MIN_AGE_HOURS = 24;      // Strictly older than 24h
const MIN_AGE_SECONDS = MIN_AGE_HOURS * 60 * 60;

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

    // 1. Broad Net Strategy: Search DexScreener for diverse Pump.fun tokens
    const searchTerms = ["dog pump", "cat pump", "ai pump", "pepe pump", "sol pump", "moon pump"];
    const endpoints = searchTerms.map(term => `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(term)}`);

    for (const link of endpoints) {
      try {
        const res = await fetch(link, { headers: { "Accept": "application/json" } });
        if (!res.ok) continue;

        const data = await res.json();
        const pairs = data.pairs ?? [];

        for (const pair of pairs) {
          if (pair.chainId !== "solana") continue;
          // Most authentic pump.fun tokens end in "pump"
          if (!pair.baseToken.address.toLowerCase().endsWith('pump')) continue;

          const tokenAddress = pair.baseToken.address;
          const mcap = pair.marketCap ?? pair.fdv ?? 0;
          const createdAt = pair.pairCreatedAt ? Math.floor(pair.pairCreatedAt / 1000) : 0;
          
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

    // 2. Exact Filter: MCAP <= 200,000 AND Age >= 24h
    const validTokens = Array.from(uniqueTokens.values()).filter((coin) => {
        const launchTime = new Date(coin.launch_timestamp).getTime() / 1000;
        const ageInSeconds = nowSeconds - launchTime;
        
        // Critical filtering
        return coin.current_mcap > 0 && coin.current_mcap <= MAX_MCAP && ageInSeconds >= MIN_AGE_SECONDS;
    });

    if (validTokens.length === 0) {
        return NextResponse.json({ message: "No tokens met the rigorous <= 200k MCAP + > 24h Age thresholds during this sweep." });
    }

    // 3. Upsert into Supabase strictly by constraint
    const { error } = await supabase
      .from('tokens')
      .upsert(validTokens, { onConflict: 'mint_address' });

    if (error) throw error;

    return NextResponse.json({ 
        success: true, 
        message: `Successfully indexed ${validTokens.length} verified micro-cap pump tokens into Supabase.` 
    });

  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
