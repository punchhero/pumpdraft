"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

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
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatAge(h: number): string {
  if (h >= 24 * 30) return `${Math.floor(h / 24 / 30)}mo`;
  if (h >= 24)      return `${Math.floor(h / 24)}d`;
  return `${h}h`;
}

/** Looks like a Solana public key: 32-48 base58 chars */
function isSolanaAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(s.trim());
}

export default function DexScreenerChart({ onTokenChange }: DexScreenerChartProps) {
  const [tokens, setTokens]           = useState<TokenInfo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lookupLoading, setLookup]    = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selected, setSelected]       = useState<TokenInfo | null>(null);
  const [search, setSearch]           = useState("");
  const [searchResults, setResults]   = useState<TokenInfo[]>([]);
  const [copied, setCopied]           = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Initial load of default tokens ──
  const fetchDefaultTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pump-tokens");
      const data = await res.json();
      const list: TokenInfo[] = data.tokens ?? [];
      setTokens(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
        onTokenChange?.(list[0]);
      }
    } catch {
      setError("Failed to load default tokens.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDefaultTokens();
    const interval = setInterval(fetchDefaultTokens, 120_000);
    return () => clearInterval(interval);
  }, [fetchDefaultTokens]);

  // ── Live search / address lookup as user types ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLookupError(null);

    const q = search.trim();
    if (!q) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLookup(true);
      try {
        let url = "";
        if (isSolanaAddress(q)) {
          // Exact contract address lookup
          url = `/api/token-lookup?address=${encodeURIComponent(q)}`;
        } else if (q.length >= 2) {
          // Name / symbol search
          url = `/api/token-lookup?q=${encodeURIComponent(q)}`;
        } else {
          setLookup(false);
          return;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
          setLookupError(data.error);
          setResults([]);
          return;
        }

        // Single token from address lookup
        if (data.token) {
          const t = data.token;
          const token: TokenInfo = {
            address: t.address,
            symbol:  t.symbol,
            name:    t.name,
            image_uri: t.image_uri,
            usd_market_cap: t.usd_market_cap,
            age_hours: t.age_hours,
          };

          if (!data.valid && data.warnings?.length > 0) {
            setLookupError("⚠️ " + data.warnings.join(" | "));
          }

          // Immediately select the token regardless of warnings
          setResults([token]);
          handleSelect(token);
          return;
        }

        // Multiple results from name search
        if (data.tokens) {
          setResults(
            data.tokens.map((t: any): TokenInfo => ({
              address: t.address,
              symbol:  t.symbol,
              name:    t.name,
              image_uri: t.image_uri,
              usd_market_cap: t.usd_market_cap,
              age_hours: t.age_hours,
            }))
          );
        }
      } catch {
        setLookupError("Lookup failed. Check your connection.");
      } finally {
        setLookup(false);
      }
    }, 500); // 500ms debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSelect = (token: TokenInfo) => {
    setSelected(token);
    onTokenChange?.(token);
    setSearch("");
    setResults([]);
    setLookupError(null);
  };

  const handleCopy = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  // Determine which list to show in the sidebar: search results override defaults
  const showResults  = search.trim().length >= 2;
  const displayList  = showResults ? searchResults : tokens;

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
              <button
                onClick={(e) => handleCopy(e, selected.address)}
                className="chart-meta-pill chart-meta-age"
                title="Copy Contract Address"
                style={{ cursor: "pointer" }}
              >
                {copied === selected.address ? "✓ Copied!" : "📋 CA"}
              </button>
            </>
          )}
          <button className="chart-refresh-btn" onClick={fetchDefaultTokens} title="Refresh">
            ↻
          </button>
        </div>
      </div>

      {/* Token browser */}
      <div className="chart-browser">
        {/* Search box */}
        <div className="chart-search-wrap">
          <input
            className="chart-search"
            placeholder="🔍 Paste contract address or search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {lookupLoading && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#0ff" }}>
              Searching…
            </span>
          )}
        </div>

        {/* Lookup error / warning */}
        {lookupError && (
          <div className="chart-token-error" style={{ fontSize: 11, padding: "4px 8px" }}>
            {lookupError}
          </div>
        )}

        {/* Helper hint */}
        {!search && (
          <div style={{ fontSize: 10, color: "#555", padding: "3px 10px" }}>
            Paste any Solana contract address or search by name/symbol
          </div>
        )}

        {/* Token list */}
        <div className="chart-token-list">
          {loading && !showResults && (
            <div className="chart-token-loading">
              <span className="chart-token-loading-dot" />
              Loading Pump.fun tokens…
            </div>
          )}
          {error && !loading && (
            <div className="chart-token-error">{error}</div>
          )}

          {!loading && displayList.length === 0 && search.trim().length >= 2 && !lookupLoading && (
            <div className="chart-token-empty">No tokens found for &ldquo;{search}&rdquo;</div>
          )}

          {displayList.map((token) => (
            <button
              key={token.address}
              onClick={() => handleSelect(token)}
              className={`chart-token-btn ${selected?.address === token.address ? "chart-token-btn-active" : ""}`}
            >
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
              <span className="chart-token-stats">
                <span className="chart-token-mcap">{formatMcap(token.usd_market_cap)}</span>
                <span className="chart-token-age">{formatAge(token.age_hours)}</span>
                <button
                  onClick={(e) => handleCopy(e, token.address)}
                  className="chart-token-copy"
                  title="Copy Contract Address"
                >
                  {copied === token.address ? "✓" : "📋"}
                </button>
              </span>
            </button>
          ))}
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
            <span>Paste a contract address above to start</span>
          </div>
        )}
      </div>
    </div>
  );
}

// For backward compat
export const TOKENS: TokenInfo[] = [];
