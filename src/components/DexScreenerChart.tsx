"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  image_uri: string | null;
  usd_market_cap: number;
  age_hours: number;
}

interface DexScreenerChartProps {
  onTokenChange?: (token: TokenInfo) => void;
}

function formatMcap(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatAge(h: number): string {
  if (h >= 24 * 30) return `${Math.floor(h / 24 / 30)}mo`;
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  return `${h}h`;
}

export default function DexScreenerChart({ onTokenChange }: DexScreenerChartProps) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TokenInfo | null>(null);
  const [search, setSearch] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pump-tokens");
      const data = await res.json();
      const list: TokenInfo[] = data.tokens ?? [];
      setIsFallback(!!data.fallback);
      setTokens(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
        onTokenChange?.(list[0]);
      }
    } catch {
      setError("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTokens();
    // Refresh every 2 minutes
    const interval = setInterval(fetchTokens, 120_000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  const handleSelect = (token: TokenInfo) => {
    setSelected(token);
    onTokenChange?.(token);
  };

  const filtered = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    alert(`Copied Contract Address: \n${address}`);
  };

  const embedUrl = selected
    ? `https://dexscreener.com/solana/${selected.address}?embed=1&theme=dark&info=0&trades=0`
    : null;

  return (
    <div className="chart-card">
      {/* Header */}
      <div className="chart-header">
        <div className="chart-header-left">
          <span className="chart-title">
            {selected ? `$${selected.symbol}` : "Select a Token"}
          </span>
          {selected && (
            <span className="chart-subtitle">{selected.name}</span>
          )}
        </div>
        <div className="chart-header-right">
          {selected && (
            <>
              <div className="chart-meta-pill chart-meta-mcap">
                {formatMcap(selected.usd_market_cap)} MCap
              </div>
              <div className="chart-meta-pill chart-meta-age">
                {formatAge(selected.age_hours)} old
              </div>
            </>
          )}
          {isFallback && (
            <div className="chart-meta-pill chart-meta-warn">Demo data</div>
          )}
          <button className="chart-refresh-btn" onClick={fetchTokens} title="Refresh tokens">
            ↻
          </button>
        </div>
      </div>

      {/* Token browser strip */}
      <div className="chart-browser">
        {/* Search */}
        <div className="chart-search-wrap">
          <input
            className="chart-search"
            placeholder="Search tokens…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Token list */}
        <div className="chart-token-list">
          {loading && (
            <div className="chart-token-loading">
              <span className="chart-token-loading-dot" />
              Loading Pump.fun tokens…
            </div>
          )}
          {error && !loading && (
            <div className="chart-token-error">{error}</div>
          )}
          {!loading && filtered.map((token) => (
            <button
              key={token.address}
              onClick={() => handleSelect(token)}
              className={`chart-token-btn ${selected?.address === token.address ? "chart-token-btn-active" : ""}`}
            >
              {/* Token image or fallback icon */}
              <span className="chart-token-img">
                {token.image_uri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={token.image_uri} alt={token.symbol} className="chart-token-img-inner" />
                ) : (
                  <span className="chart-token-img-placeholder">
                    {token.symbol.slice(0, 2)}
                  </span>
                )}
              </span>
              <span className="chart-token-info">
                <span className="chart-token-symbol">${token.symbol}</span>
                <span className="chart-token-name">{token.name}</span>
              </span>
              <span className="chart-token-stats flex items-center gap-2">
                <span className="chart-token-mcap">{formatMcap(token.usd_market_cap)}</span>
                <span className="chart-token-age">{formatAge(token.age_hours)}</span>
                <button 
                  onClick={(e) => handleCopy(e, token.address)}
                  className="ml-2 hover:text-terminal-green transition-colors text-[10px] text-terminal-green-dark border border-terminal-green-dark px-1 rounded"
                  title="Copy Contract Address"
                >
                  📋
                </button>
              </span>
            </button>
          ))}
          {!loading && filtered.length === 0 && !error && (
            <div className="chart-token-empty">No tokens match &ldquo;{search}&rdquo;</div>
          )}
        </div>
      </div>

      {/* Chart iframe */}
      <div className="chart-iframe-wrap" style={{ background: "#050505" }}>
        {embedUrl ? (
          <iframe
            key={selected?.address}
            src={embedUrl}
            title={`${selected?.symbol} Chart`}
            className="chart-iframe"
            allow="clipboard-write"
            style={{ 
              filter: "hue-rotate(-10deg) saturate(1.3) contrast(1.08)",
              opacity: 0.88,
              border: "none",
              background: "transparent"
            }}
          />
        ) : (
          <div className="chart-iframe-placeholder">
            <span>Select a token to view the chart</span>
          </div>
        )}
      </div>
    </div>
  );
}

// For backward compat — export TOKENS as empty array since we're now dynamic
export const TOKENS: TokenInfo[] = [];
