import { NextResponse } from "next/server";

export const revalidate = 60; // cache for 60 seconds

const MIN_MCAP = 200_000;      // $200k USD
const MIN_AGE_HOURS = 24;
const MIN_AGE_SECONDS = MIN_AGE_HOURS * 60 * 60;

// Top 30 popular Solana/Pump.fun tokens to fetch live data for
const SOLANA_TOP_TOKENS = [
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", // WIF
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", // POPCAT
  "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", // MEW
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82", // BOME
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  "HeLp6NuQcgWcb8PNXCZiu4GicpJDCAQQwNgc28BiTWe", // TRUMP
  "C5gR63GbzmdyKegkFZyPAZkfWqn4tR7it8RTWakepump", // FAUCET
  "ARbvFZqhtbSnHhq7c7fva8bU67GnUr14RdxpDkWUpump", // STREAMER
  "DUr5rZAfYduvihaiyMnfqgnhqYWbPWJXvK954qyTpump", // SOLINU
  "FLJYGHpCCcfYUdzhcfHSeSd2peb5SMajNWaCsRnhpump", // STORE
  "3HFVVmGGto5h3LG6C9yMVJ1XgGR6jynDfK8umKkPpump", // POW
  "7Fjpt8tx4ZNcyhBG7qK8kzXjpEQY7WgtCGmCzWS6pump", // Faucet
  "BoRiiSZ4hqtbCnQc7cWaEYTEtxmzRXyy5xaKCt7Ppump", // UNTAXED
  "BjqH7c7Zqu9Pwdim8fveZiF7UDiT7ktBVnUrXvuRpump", // USDPT
  "Eu87H1unFc8QuM3HtDE53hciT5ipfMMEYQpv2THWpump", // SCC
  "J3mTHLJ3GMcz9ycfvUji5HzeuTvmUQjQSdzChsS5pump", // SOLBISCUIT
  "DRLNhjM7jusYFPF1qade1dBD1qhgds7oAfdKs51Vpump", // SOL
  "5tFRno9GXBP5gt2Kjx2MeEaFL8zGBMw4cujTLGerpump", // AGENT
  "PiGEguwVkcy9ed3to9Wpm9cLRPiq8P3tZdVWxjApump", // SIM
  "54meDtup2K7pqyhUK24AymoLzMPtrkhNTbEzQ6gSpump", // BABYSOL
  "AZZyEKLE288XgF795nkktMC9poBgsq93mkcZQxRrpump", // XRP
  "CPcf58MNikQw2G23kTVWQevRDeFDpdxMH7KkR7Lhpump", // DOBBY
  "4rcN9Zpx6sAba39S722CwrVoA9BDmVZ5KdQDdVsSpump", // WHALLY
  "GJqCjtgEwqdFWVRsDs8JXKFoTeRVZeHs1RL4ccvrpump", // OILINU
  "2fWhwz3187tvX8HgUCALbZy5FD2DRBx7stt9HqSbQdTk", // RHOADES
  "BPNmEQxQpSt3K9j6zDToUvVtz7aEDNtd4mF9c6SUpump", // example
  "2Xv3zT7zbRj7xgm3L7hhtyZQb4ZSCuXSyqwWDxHBpump", // aSOL
  "De4ULouuU2cAQkhKuYrsrFtJGRRmcSwQD5esmnAUpump", // PIGMY
  "H4phNbsqjV5rqk8u6FUACTLB6rNZRTAPGnBb8KXJpump"  // SSE
];

export async function GET() {
  try {
    // We strictly use DexScreener to fetch tokens because pump.fun enforces Cloudflare Turnstile checks which blocks all Vercel servers
    const tokenAddresses = SOLANA_TOP_TOKENS.join(",");
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses}`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`DexScreener API returned ${res.status}`);
    }

    const data = await res.json();
    const pairs = data.pairs ?? [];

    const nowSeconds = Math.floor(Date.now() / 1000);
    const cutoff = nowSeconds - MIN_AGE_SECONDS;

    // Use a Map to deduplicate pairs (DexScreener returns multiple pairs per token)
    const uniqueTokens = new Map<string, PumpCoin>();

    for (const pair of pairs) {
      // Look for our target mint address either as the base or quote
      const tokenAddress = SOLANA_TOP_TOKENS.includes(pair.baseToken.address) ? pair.baseToken.address : pair.quoteToken.address;
      const symbol = SOLANA_TOP_TOKENS.includes(pair.baseToken.address) ? pair.baseToken.symbol : pair.quoteToken.symbol;
      const name = SOLANA_TOP_TOKENS.includes(pair.baseToken.address) ? pair.baseToken.name : pair.quoteToken.name;
      
      const mcap = pair.marketCap ?? pair.fdv ?? 0;
      const createdAt = pair.pairCreatedAt ? Math.floor(pair.pairCreatedAt / 1000) : 0;
      
      if (!uniqueTokens.has(tokenAddress)) {
        uniqueTokens.set(tokenAddress, {
          address: tokenAddress,
          symbol,
          name,
          image_uri: pair.info?.imageUrl ?? null,
          usd_market_cap: mcap,
          created_timestamp: createdAt,
          age_hours: Math.floor((nowSeconds - createdAt) / 3600),
        });
      }
    }

    // Filter by >200k MCap and >24h age
    const filtered = Array.from(uniqueTokens.values()).filter((coin) => {
      const created = coin.created_timestamp > 0 ? coin.created_timestamp : cutoff - 1; // If unknown, assume older than 24h
      return coin.usd_market_cap >= MIN_MCAP && created <= cutoff;
    }).sort((a, b) => b.usd_market_cap - a.usd_market_cap);

    return NextResponse.json({ tokens: filtered, count: filtered.length });
  } catch (err) {
    console.error("DexScreener API error:", err);
    // If all else fails, fallback to hardcoded guarantees
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
