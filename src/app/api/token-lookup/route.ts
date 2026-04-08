import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();
  const query   = searchParams.get("q")?.trim();

  // ── Case 1: Contract address lookup ──
  if (address) {
    if (address.length < 32 || address.length > 48) {
      return NextResponse.json({ error: "Invalid contract address length." }, { status: 400 });
    }

    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
        { headers: { Accept: "application/json" }, next: { revalidate: 30 } }
      );
      if (!res.ok) throw new Error("DexScreener returned " + res.status);

      const data = await res.json();
      const pairs: any[] = (data.pairs ?? []).filter((p: any) => p.chainId === "solana");

      if (pairs.length === 0) {
        return NextResponse.json({ error: "Token not found on Solana DexScreener." }, { status: 404 });
      }

      // Pick the pair with most liquidity
      pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      const pair = pairs[0];

      const mcap = pair.marketCap ?? pair.fdv ?? 0;
      const createdMs = pair.pairCreatedAt ?? 0;
      const now = Date.now();
      const ageMs = createdMs > 0 ? now - createdMs : MIN_AGE_MS + 1;
      const ageHours = Math.floor(ageMs / 3600000);

      // Validation checks
      const isPump = address.toLowerCase().endsWith("pump");
      const isOldEnough = ageMs >= MIN_AGE_MS;

      const warnings: string[] = [];
      if (!isPump)      warnings.push("Token address doesn't end in 'pump' — may not be a Pump.fun token.");
      if (!isOldEnough) warnings.push(`Token is only ${ageHours}h old. Minimum required: 24h.`);

      return NextResponse.json({
        token: {
          address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          image_uri: pair.info?.imageUrl ?? null,
          usd_market_cap: mcap,
          created_timestamp: Math.floor(createdMs / 1000),
          age_hours: ageHours,
          price_usd: parseFloat(pair.priceUsd ?? "0"),
          liquidity_usd: pair.liquidity?.usd ?? 0,
          volume_24h: pair.volume?.h24 ?? 0,
        },
        valid: isPump && isOldEnough,
        warnings,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ── Case 2: Text/symbol search ──
  if (query) {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query + " pump")}`,
        { headers: { Accept: "application/json" }, next: { revalidate: 60 } }
      );
      const data = await res.json();
      const pairs: any[] = (data.pairs ?? []).filter(
        (p: any) =>
          p.chainId === "solana" &&
          p.baseToken?.address?.toLowerCase().endsWith("pump")
      );

      const now = Date.now();
      const seen = new Set<string>();
      const tokens: any[] = [];

      for (const pair of pairs) {
        const addr = pair.baseToken.address;
        if (seen.has(addr)) continue;
        seen.add(addr);

        const createdMs = pair.pairCreatedAt ?? 0;
        const ageMs = now - createdMs;

        tokens.push({
          address: addr,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          image_uri: pair.info?.imageUrl ?? null,
          usd_market_cap: pair.marketCap ?? pair.fdv ?? 0,
          created_timestamp: Math.floor(createdMs / 1000),
          age_hours: Math.floor(ageMs / 3600000),
          valid: ageMs >= MIN_AGE_MS,
        });
      }

      tokens.sort((a, b) => b.usd_market_cap - a.usd_market_cap);
      return NextResponse.json({ tokens: tokens.slice(0, 20) });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Provide ?address= or ?q= query param." }, { status: 400 });
}
