"use client";

import React, { useState, useEffect, useRef } from "react";
import type { TokenInfo } from "@/components/DexScreenerChart";

interface HotToken extends Partial<TokenInfo> {
  address: string;
  symbol: string;
  bet_count?: number;
  name?: string;
  image_uri?: string | null;
  usd_market_cap?: number;
  age_hours?: number;
}

interface HotTokensTickerProps {
  onTokenSelect?: (token: TokenInfo) => void;
}

function formatMcap(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export default function HotTokensTicker({ onTokenSelect }: HotTokensTickerProps) {
  const [tokens, setTokens] = useState<HotToken[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/hot-tokens")
      .then(r => r.json())
      .then(d => { if (d.tokens?.length > 0) setTokens(d.tokens); })
      .catch(() => {});
  }, []);

  if (tokens.length === 0) return null;

  const handleClick = (t: HotToken) => {
    if (!onTokenSelect) return;
    onTokenSelect({
      address: t.address,
      symbol: t.symbol,
      name: t.name ?? t.symbol,
      image_uri: t.image_uri ?? null,
      usd_market_cap: t.usd_market_cap ?? 0,
      age_hours: t.age_hours ?? 999,
    });
  };

  // Duplicate for seamless infinite scroll
  const items = [...tokens, ...tokens];

  return (
    <div className="hot-ticker-wrap">
      <div className="hot-ticker-label">
        🔥 <span>HOT</span>
      </div>
      <div className="hot-ticker-rail" ref={trackRef}>
        <div className="hot-ticker-track">
          {items.map((t, i) => (
            <button
              key={`${t.address}-${i}`}
              className="hot-ticker-item"
              onClick={() => handleClick(t)}
              title={`$${t.symbol} — ${t.bet_count ?? "?"} bets`}
            >
              {t.image_uri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.image_uri} alt={t.symbol} className="hot-ticker-img" />
              ) : (
                <span className="hot-ticker-placeholder">{t.symbol.slice(0, 2)}</span>
              )}
              <span className="hot-ticker-symbol">${t.symbol}</span>
              {t.usd_market_cap && t.usd_market_cap > 0 && (
                <span className="hot-ticker-mcap">{formatMcap(t.usd_market_cap)}</span>
              )}
              <span className="hot-ticker-flame">🔥</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
