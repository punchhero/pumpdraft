import { NextResponse } from "next/server";

export const revalidate = 60; // cache for 60 seconds

const PUMP_API = "https://frontend-api.pump.fun/coins";
const MIN_MCAP = 200_000;      // $200k USD
const MIN_AGE_HOURS = 24;
const MIN_AGE_SECONDS = MIN_AGE_HOURS * 60 * 60;

export async function GET() {
  try {
    // Fetch top tokens by market cap from pump.fun
    const url = `${PUMP_API}?offset=0&limit=200&sort=market_cap&order=DESC&includeNsfw=false`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "PumpDraft/1.0",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Pump.fun API returned ${res.status}`);
    }

    const data = await res.json();
    const coins: PumpCoin[] = Array.isArray(data) ? data : data?.coins ?? [];

    const nowSeconds = Math.floor(Date.now() / 1000);
    const cutoff = nowSeconds - MIN_AGE_SECONDS;

    const filtered = coins
      .filter((coin) => {
        const mcap = coin.usd_market_cap ?? 0;
        const created = coin.created_timestamp ?? nowSeconds;
        return mcap >= MIN_MCAP && created <= cutoff;
      })
      .slice(0, 50)
      .map((coin) => ({
        address: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
        image_uri: coin.image_uri ?? null,
        usd_market_cap: coin.usd_market_cap ?? 0,
        created_timestamp: coin.created_timestamp ?? 0,
        age_hours: Math.floor((nowSeconds - coin.created_timestamp) / 3600),
      }));

    return NextResponse.json({ tokens: filtered, count: filtered.length });
  } catch (err) {
    console.error("Pump.fun API error:", err);
    // Fallback to known reliable tokens so app never fully breaks
    return NextResponse.json({
      tokens: FALLBACK_TOKENS,
      count: FALLBACK_TOKENS.length,
      fallback: true,
    });
  }
}

interface PumpCoin {
  mint: string;
  symbol: string;
  name: string;
  image_uri?: string;
  usd_market_cap?: number;
  created_timestamp: number;
}

// Fallback in case API is unreachable
const FALLBACK_TOKENS = [
  {
    address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
    name: "dogwifhat",
    image_uri: null,
    usd_market_cap: 1_200_000_000,
    created_timestamp: 0,
    age_hours: 400,
  },
  {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    image_uri: null,
    usd_market_cap: 800_000_000,
    created_timestamp: 0,
    age_hours: 600,
  },
  {
    address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    symbol: "POPCAT",
    name: "Popcat",
    image_uri: null,
    usd_market_cap: 300_000_000,
    created_timestamp: 0,
    age_hours: 300,
  },
  {
    address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    symbol: "MEW",
    name: "cat in a dogs world",
    image_uri: null,
    usd_market_cap: 200_000_000,
    created_timestamp: 0,
    age_hours: 350,
  },
];
