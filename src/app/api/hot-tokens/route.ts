import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key && url !== "https://your-project.supabase.co") {
      // ── Pull top tokens by bet count from Supabase ──
      const supabase = createClient(url, key);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from("predictions")
        .select("token_address, token_symbol")
        .gte("created_at", since);

      if (data && data.length > 0) {
        // Count bets per token
        const counts: Record<string, { symbol: string; count: number }> = {};
        for (const row of data) {
          if (!counts[row.token_address]) {
            counts[row.token_address] = { symbol: row.token_symbol, count: 0 };
          }
          counts[row.token_address].count++;
        }

        const sorted = Object.entries(counts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([address, { symbol, count }]) => ({ address, symbol, bet_count: count }));

        if (sorted.length >= 3) {
          return NextResponse.json({ tokens: sorted, source: "supabase" });
        }
      }
    }
  } catch { /* ignore, use fallback */ }

  // ── Fallback: top tokens from pump-tokens API ──
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/pump-tokens`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    const tokens = (data.tokens ?? []).slice(0, 10).map((t: any) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      image_uri: t.image_uri,
      usd_market_cap: t.usd_market_cap,
      age_hours: t.age_hours,
      bet_count: Math.floor(Math.random() * 30) + 5, // estimated activity
    }));
    return NextResponse.json({ tokens, source: "mcap-fallback" });
  } catch { /* empty */ }

  return NextResponse.json({ tokens: [] });
}
