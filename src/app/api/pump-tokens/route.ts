import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 120; // Cache 2 minutes

// Pump.fun v3 API — works server-side (no Cloudflare browser check)
const PUMP_V3 = "https://frontend-api-v3.pump.fun/coins";

// DexScreener batch token lookup
const DEX_TOKENS = "https://api.dexscreener.com/latest/dex/tokens";
const DEX_SEARCH  = "https://api.dexscreener.com/latest/dex/search";

// ---- Filters for the DEFAULT token list ----
const MIN_MCAP = 200_000; // Only show tokens with MCap >= $200K in default list

// ---- Criteria ----
// The user wants tokens that are pump.fun based:
// - Any Market Cap (show everything, let the user decide)
// - Older than 24 hours
// We show up to 100. Filter is relaxed so results actually show.
const MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24h in milliseconds

export async function GET() {
  // ── Strategy 1: pump.fun v3 API (server-side, doesn't hit Cloudflare bot check) ──
  try {
    const res = await fetch(
      `${PUMP_V3}?offset=0&limit=100&sort=last_trade_timestamp&order=DESC&includeNsfw=false`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; PumpDraft/1.0)",
        },
        next: { revalidate: 120 },
      }
    );

    if (res.ok) {
      const raw = await res.json();
      const coins = Array.isArray(raw) ? raw : raw?.coins ?? [];

      if (coins.length > 0) {
        const now = Date.now();
        const filtered = coins
          .filter((c: any) => {
            const created = (c.created_timestamp ?? 0) * 1000;
            const mcap = c.usd_market_cap ?? 0;
            return created > 0 && now - created >= MIN_AGE_MS && mcap >= MIN_MCAP;
          })
          .slice(0, 100)
          .map((c: any) => ({
            address: c.mint,
            symbol: c.symbol ?? "???",
            name: c.name ?? "Unknown",
            image_uri: c.image_uri ?? null,
            usd_market_cap: c.usd_market_cap ?? 0,
            created_timestamp: c.created_timestamp ?? 0,
            age_hours: Math.floor((now / 1000 - (c.created_timestamp ?? 0)) / 3600),
          }));

        if (filtered.length > 0) {
          return NextResponse.json({ tokens: filtered, count: filtered.length, source: "pumpfun" });
        }
      }
    }
  } catch (e) {
    console.warn("pump.fun v3 failed:", e);
  }

  // ── Strategy 2: DexScreener wide-net search for pump.fun tokens ──
  try {
    const searchQueries = [
      "pump solana", "pepe pump", "dog pump", "cat pump",
      "baby pump", "ai pump", "sol pump", "moon pump",
      "elon pump", "inu pump", "wojak pump", "meme pump",
    ];

    const allPairs: any[] = [];
    // Parallel fetch all queries
    const results = await Promise.allSettled(
      searchQueries.map((q) =>
        fetch(`${DEX_SEARCH}?q=${encodeURIComponent(q)}`, {
          headers: { Accept: "application/json" },
          next: { revalidate: 120 },
        }).then((r) => r.json())
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const pairs = result.value?.pairs ?? [];
        allPairs.push(...pairs);
      }
    }

    const now = Date.now();
    const seen = new Set<string>();
    const tokens: any[] = [];

    for (const pair of allPairs) {
      if (pair.chainId !== "solana") continue;
      const addr = pair.baseToken?.address ?? "";
      if (!addr.toLowerCase().endsWith("pump")) continue;
      if (seen.has(addr)) continue;
      seen.add(addr);

      const createdMs = pair.pairCreatedAt ?? 0;
      if (!createdMs || now - createdMs < MIN_AGE_MS) continue;

      const mcap = pair.marketCap ?? pair.fdv ?? 0;
      if (mcap < MIN_MCAP) continue; // Skip tokens below $200K MCap

      tokens.push({
        address: addr,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        image_uri: pair.info?.imageUrl ?? null,
        usd_market_cap: mcap,
        created_timestamp: Math.floor(createdMs / 1000),
        age_hours: Math.floor((now - createdMs) / 3600000),
      });
    }

    tokens.sort((a, b) => b.usd_market_cap - a.usd_market_cap);
    const top = tokens.slice(0, 100);

    if (top.length > 0) {
      return NextResponse.json({ tokens: top, count: top.length, source: "dexscreener" });
    }
  } catch (e) {
    console.warn("DexScreener search failed:", e);
  }

  // ── Strategy 3: DexScreener batch lookup of known pump addresses ──
  try {
    const KNOWN_PUMPS = [
      "C5gR63GbzmdyKegkFZyPAZkfWqn4tR7it8RTWakepump",
      "ARbvFZqhtbSnHhq7c7fva8bU67GnUr14RdxpDkWUpump",
      "DUr5rZAfYduvihaiyMnfqgnhqYWbPWJXvK954qyTpump",
      "FLJYGHpCCcfYUdzhcfHSeSd2peb5SMajNWaCsRnhpump",
      "3HFVVmGGto5h3LG6C9yMVJ1XgGR6jynDfK8umKkPpump",
      "BjqH7c7Zqu9Pwdim8fveZiF7UDiT7ktBVnUrXvuRpump",
      "Eu87H1unFc8QuM3HtDE53hciT5ipfMMEYQpv2THWpump",
      "J3mTHLJ3GMcz9ycfvUji5HzeuTvmUQjQSdzChsS5pump",
      "DRLNhjM7jusYFPF1qade1dBD1qhgds7oAfdKs51Vpump",
      "5tFRno9GXBP5gt2Kjx2MeEaFL8zGBMw4cujTLGerpump",
      "PiGEguwVkcy9ed3to9Wpm9cLRPiq8P3tZdVWxjApump",
      "54meDtup2K7pqyhUK24AymoLzMPtrkhNTbEzQ6gSpump",
      "AZZyEKLE288XgF795nkktMC9poBgsq93mkcZQxRrpump",
      "CPcf58MNikQw2G23kTVWQevRDeFDpdxMH7KkR7Lhpump",
      "4rcN9Zpx6sAba39S722CwrVoA9BDmVZ5KdQDdVsSpump",
      "GJqCjtgEwqdFWVRsDs8JXKFoTeRVZeHs1RL4ccvrpump",
      "BPNmEQxQpSt3K9j6zDToUvVtz7aEDNtd4mF9c6SUpump",
      "De4ULouuU2cAQkhKuYrsrFtJGRRmcSwQD5esmnAUpump",
      "H4phNbsqjV5rqk8u6FUACTLB6rNZRTAPGnBb8KXJpump",
      "BoRiiSZ4hqtbCnQc7cWaEYTEtxmzRXyy5xaKCt7Ppump",
    ];
    const res = await fetch(`${DEX_TOKENS}/${KNOWN_PUMPS.join(",")}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });
    const data = await res.json();
    const pairs = data.pairs ?? [];
    const now = Date.now();
    const seen = new Set<string>();
    const tokens: any[] = [];

    for (const pair of pairs) {
      if (pair.chainId !== "solana") continue;
      const addr = pair.baseToken?.address ?? "";
      if (seen.has(addr)) continue;
      seen.add(addr);

      const mcap = pair.marketCap ?? pair.fdv ?? 0;
      const createdMs = pair.pairCreatedAt ?? 0;
      tokens.push({
        address: addr,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        image_uri: pair.info?.imageUrl ?? null,
        usd_market_cap: mcap,
        created_timestamp: Math.floor(createdMs / 1000),
        age_hours: Math.floor((now - createdMs) / 3600000),
      });
    }

    if (tokens.length > 0) {
      tokens.sort((a, b) => b.usd_market_cap - a.usd_market_cap);
      return NextResponse.json({ tokens, count: tokens.length, source: "dexscreener-batch" });
    }
  } catch (e) {
    console.warn("DexScreener batch failed:", e);
  }

  // ── Final Fallback ──
  return NextResponse.json({
    tokens: FALLBACK_TOKENS,
    count: FALLBACK_TOKENS.length,
    fallback: true,
  });
}

const FALLBACK_TOKENS = [
  { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF",    name: "dogwifhat",           image_uri: null, usd_market_cap: 1_200_000_000, created_timestamp: 0, age_hours: 400 },
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK",   name: "Bonk",                  image_uri: null, usd_market_cap: 800_000_000,   created_timestamp: 0, age_hours: 600 },
  { address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", symbol: "POPCAT", name: "Popcat",                image_uri: null, usd_market_cap: 300_000_000,   created_timestamp: 0, age_hours: 300 },
  { address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",  symbol: "MEW",    name: "cat in a dogs world",  image_uri: null, usd_market_cap: 200_000_000,   created_timestamp: 0, age_hours: 350 },
];
