import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 10; // Rapid cache for live token lists

export async function GET() {
  try {
    // 1. Ensure Supabase relies on ENV or falls back
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key || url === "https://your-project.supabase.co") {
      return NextResponse.json({
        tokens: FALLBACK_TOKENS,
        count: FALLBACK_TOKENS.length,
        fallback: true,
        message: "Supabase not connected. Showing mock data."
      });
    }

    const supabase = createClient(url, key);

    // 2. Extremely fast query against our local Supabase index for >= 250k MCAP
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('*')
      .gte('current_mcap', 250000)
      .order('current_mcap', { ascending: false })
      .limit(100);

    if (error) {
        throw error;
    }

    if (!tokens || tokens.length === 0) {
        return NextResponse.json({
            tokens: FALLBACK_TOKENS,
            count: FALLBACK_TOKENS.length,
            fallback: true,
            warning: "Database is empty. Waiting for cron job to ingest data."
          });
    }

    // Map table results to the interface UI expects
    const formatted = tokens.map(t => ({
        address: t.mint_address,
        symbol: t.symbol,
        name: t.name,
        image_uri: t.image_uri,
        usd_market_cap: t.current_mcap,
        created_timestamp: Math.floor(new Date(t.launch_timestamp).getTime() / 1000),
        age_hours: Math.floor((Date.now() - new Date(t.launch_timestamp).getTime()) / 3600000)
    }));

    return NextResponse.json({ tokens: formatted, count: formatted.length });

  } catch (err) {
    console.error("Supabase API error:", err);
    return NextResponse.json({
      tokens: FALLBACK_TOKENS,
      count: FALLBACK_TOKENS.length,
      fallback: true,
    });
  }
}

interface PumpCoin {
  address: string;
  symbol: string;
  name: string;
  image_uri: string | null;
  usd_market_cap: number;
  created_timestamp: number;
  age_hours: number;
}

const FALLBACK_TOKENS = [
  { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat", image_uri: null, usd_market_cap: 1200000000, created_timestamp: 0, age_hours: 400 },
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", image_uri: null, usd_market_cap: 800000000, created_timestamp: 0, age_hours: 600 },
  { address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", symbol: "POPCAT", name: "Popcat", image_uri: null, usd_market_cap: 300000000, created_timestamp: 0, age_hours: 300 },
  { address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", symbol: "MEW", name: "cat in a dogs world", image_uri: null, usd_market_cap: 200000000, created_timestamp: 0, age_hours: 350 },
];
