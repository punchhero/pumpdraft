"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  image_uri: string | null;
  usd_market_cap: number;
  age_hours: number;
  valid?: boolean; // true = meets $200K + 24h requirements
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

function isSolanaAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(s.trim());
}

const MIN_MCAP = 200_000;
const MIN_AGE_H = 24;

function tokenIsValid(t: TokenInfo): boolean {
  if (t.valid !== undefined) return t.valid;
  return t.usd_market_cap >= MIN_MCAP && t.age_hours >= MIN_AGE_H;
}

export default function DexScreenerChart({ onTokenChange }: DexScreenerChartProps) {
  const [defaults, setDefaults]       = useState<TokenInfo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lookupLoading, setLookup]    = useState(false);
  const [selected, setSelected]       = useState<TokenInfo | null>(null);
  const [search, setSearch]           = useState("");
  const [searchResults, setResults]   = useState<TokenInfo[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [open, setOpen]               = useState(false);
  const [copied, setCopied]           = useState(false);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load default token list
  const fetchDefaultTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pump-tokens");
      const data = await res.json();
      const list: TokenInfo[] = (data.tokens ?? []).map((t: any) => ({
        ...t,
        valid: t.usd_market_cap >= MIN_MCAP && t.age_hours >= MIN_AGE_H,
      }));
      setDefaults(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
        onTokenChange?.(list[0]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDefaultTokens();
    const iv = setInterval(fetchDefaultTokens, 120_000);
    return () => clearInterval(iv);
  }, [fetchDefaultTokens]);

  // Live search / address lookup as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLookupError(null);

    const q = search.trim();
    if (!q) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLookup(true);
      try {
        let url = isSolanaAddress(q)
          ? `/api/token-lookup?address=${encodeURIComponent(q)}`
          : `/api/token-lookup?q=${encodeURIComponent(q)}`;

        const res  = await fetch(url);
        const data = await res.json();

        if (data.error) { setLookupError(data.error); setResults([]); return; }

        if (data.token) {
          const t: TokenInfo = {
            address: data.token.address,
            symbol:  data.token.symbol,
            name:    data.token.name,
            image_uri: data.token.image_uri,
            usd_market_cap: data.token.usd_market_cap,
            age_hours: data.token.age_hours,
            valid: data.valid,
          };
          if (!data.valid && data.warnings?.length) {
            setLookupError("⚠️ " + data.warnings.join(" | "));
          }
          setResults([t]);
          // Auto-select (even if invalid — blocking happens in PredictionConsole)
          handleSelect(t);
          return;
        }

        if (data.tokens) {
          setResults(data.tokens.map((t: any): TokenInfo => ({
            address: t.address, symbol: t.symbol, name: t.name,
            image_uri: t.image_uri,
            usd_market_cap: t.usd_market_cap,
            age_hours: t.age_hours,
            valid: t.usd_market_cap >= MIN_MCAP && t.age_hours >= MIN_AGE_H,
          })));
        }
      } catch { setLookupError("Lookup failed."); }
      finally   { setLookup(false); }
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSelect = (token: TokenInfo) => {
    setSelected(token);
    onTokenChange?.(token);
    setSearch("");
    setResults([]);
    setLookupError(null);
    setOpen(false);
  };

  const handleCopy = (e: React.MouseEvent) => {
    if (!selected) return;
    e.stopPropagation();
    navigator.clipboard.writeText(selected.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayList = search.trim().length >= 2 ? searchResults : defaults;
  const isValid     = selected ? tokenIsValid(selected) : true;

  const embedUrl = selected
    ? `https://dexscreener.com/solana/${selected.address}?embed=1&theme=dark&info=0&trades=0`
    : null;

  return (
    <div className="chart-card">
      {/* ── Header ── */}
      <div className="chart-header">
        <div className="chart-header-left">
          <span className="chart-title">
            {selected ? `$${selected.symbol}` : "Select a Token"}
          </span>
          {selected && <span className="chart-subtitle">{selected.name}</span>}
        </div>
        <div className="chart-header-right">
          {selected && (
            <>
              <div className={`chart-meta-pill ${isValid ? "chart-meta-mcap" : "chart-meta-warn"}`}>
                {formatMcap(selected.usd_market_cap)} MCap
                {!isValid && " ⚠️"}
              </div>
              <div className="chart-meta-pill chart-meta-age">
                {formatAge(selected.age_hours)} old
              </div>
              <button
                onClick={handleCopy}
                className="chart-meta-pill chart-meta-age"
                style={{ cursor: "pointer" }}
                title={selected.address}
              >
                {copied ? "✓ Copied!" : "📋 CA"}
              </button>
            </>
          )}
          <button className="chart-refresh-btn" onClick={fetchDefaultTokens} title="Refresh">↻</button>
        </div>
      </div>

      {/* ── Search + Dropdown ── */}
      <div className="chart-search-section" ref={wrapRef}>
        <div style={{ position: "relative" }}>
          <input
            className="chart-search"
            style={{ width: "100%", borderRadius: open ? "8px 8px 0 0" : "8px" }}
            placeholder="🔍  Paste contract address or search by name / symbol…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {lookupLoading && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--green)" }}>
              Searching…
            </span>
          )}

          {/* Dropdown */}
          {open && (
            <div className="chart-dropdown">
              {loading && search.trim().length === 0 && (
                <div className="chart-dropdown-loading">Loading tokens…</div>
              )}
              {lookupError && (
                <div className="chart-dropdown-warn">{lookupError}</div>
              )}
              {!loading && displayList.length === 0 && search.trim().length >= 2 && !lookupLoading && (
                <div className="chart-dropdown-empty">No tokens found for &ldquo;{search}&rdquo;</div>
              )}
              {displayList.map((token) => {
                const valid = tokenIsValid(token);
                return (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token)}
                    className={`chart-dropdown-item ${selected?.address === token.address ? "chart-dropdown-item-active" : ""}`}
                  >
                    <span className="chart-token-img">
                      {token.image_uri
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={token.image_uri} alt={token.symbol} className="chart-token-img-inner" />
                        : <span className="chart-token-img-placeholder">{token.symbol.slice(0, 2)}</span>
                      }
                    </span>
                    <span className="chart-token-info" style={{ flex: 1 }}>
                      <span className="chart-token-symbol">${token.symbol}</span>
                      <span className="chart-token-name">{token.name}</span>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      <span className="chart-token-mcap">{formatMcap(token.usd_market_cap)}</span>
                      <span className="chart-token-age">{formatAge(token.age_hours)}</span>
                    </span>
                    {!valid && (
                      <span title="Below $200K MCap or <24h old — betting disabled" style={{ marginLeft: 6, fontSize: 14 }}>🔒</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Chart iframe ── */}
      <div className="chart-iframe-wrap" style={{ background: "#050505" }}>
        {embedUrl ? (
          <iframe
            key={selected?.address}
            src={embedUrl}
            title={`${selected?.symbol} Chart`}
            className="chart-iframe"
            allow="clipboard-write"
            style={{ filter: "hue-rotate(-10deg) saturate(1.3) contrast(1.08)", opacity: 0.88, border: "none", background: "transparent" }}
          />
        ) : (
          <div className="chart-iframe-placeholder">
            <span>Paste a contract address or search above to start</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const TOKENS: TokenInfo[] = [];
