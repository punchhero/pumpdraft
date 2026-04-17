"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import HotTokensTicker from "@/components/HotTokensTicker";

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
    <div className="bg-[#181818] rounded-xl overflow-hidden shadow-2xl border border-white/5 flex flex-col h-full font-sans">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#121212]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-xl tracking-wide">
            {selected ? `$${selected.symbol}` : "Select a Token"}
          </span>
          {selected && <span className="text-[#B3B3B3] text-sm font-medium">{selected.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${isValid ? "bg-[#242424] text-[#1DB954]" : "bg-[#2A1010] text-[#FF3B5C]"}`}>
                {formatMcap(selected.usd_market_cap)} MCap
                {!isValid && " ⚠️"}
              </div>
              <div className="bg-[#242424] text-[#B3B3B3] px-3 py-1.5 rounded-full text-xs font-semibold">
                {formatAge(selected.age_hours)} old
              </div>
              <button
                onClick={handleCopy}
                className="bg-[#242424] hover:bg-[#333] text-[#B3B3B3] hover:text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                title={selected.address}
              >
                {copied ? "✓ Copied!" : "📋 CA"}
              </button>
            </>
          )}
          <button className="bg-[#242424] hover:bg-[#333] text-[#B3B3B3] hover:text-white w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ml-1" onClick={fetchDefaultTokens} title="Refresh">↻</button>
        </div>
      </div>

      {/* ── Hot Tokens Ticker ── */}
      <HotTokensTicker onTokenSelect={handleSelect} />

      {/* ── Search + Dropdown ── */}
      <div className="p-4 border-b border-white/5 bg-[#121212]" ref={wrapRef}>
        <div style={{ position: "relative" }}>
          <input
            className="w-full bg-[#282828] text-white text-sm font-medium px-5 py-3 outline-none placeholder:text-white/30 transition-colors focus:bg-[#3E3E3E]"
            style={{ borderRadius: open ? "12px 12px 0 0" : "12px" }}
            placeholder="🔍  Paste contract address or search by name / symbol…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {lookupLoading && (
            <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#1DB954", fontWeight: 600 }}>
              Searching…
            </span>
          )}

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full left-0 right-0 max-h-[300px] overflow-y-auto bg-[#242424] border border-[#3E3E3E] rounded-b-xl shadow-2xl z-50">
              {loading && search.trim().length === 0 && (
                <div className="p-4 text-center text-[#B3B3B3] text-sm">Loading tokens…</div>
              )}
              {lookupError && (
                <div className="p-4 text-center text-[#FF3B5C] font-semibold text-sm bg-[#2A1010]">{lookupError}</div>
              )}
              {!loading && displayList.length === 0 && search.trim().length >= 2 && !lookupLoading && (
                <div className="p-4 text-center text-[#B3B3B3] text-sm italic">No tokens found for &ldquo;{search}&rdquo;</div>
              )}
              {displayList.map((token) => {
                const valid = tokenIsValid(token);
                return (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-white/5 hover:bg-[#333] transition-colors ${selected?.address === token.address ? "bg-[#333] border-l-4 border-l-[#1DB954]" : "border-l-4 border-l-transparent"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full overflow-hidden bg-[#181818] flex items-center justify-center flex-shrink-0 border border-white/10">
                        {token.image_uri
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={token.image_uri} alt={token.symbol} className="w-full h-full object-cover" />
                          : <span className="text-[#B3B3B3] text-xs font-bold uppercase">{token.symbol.slice(0, 2)}</span>
                        }
                      </span>
                      <div className="flex flex-col flex-1">
                        <span className="font-bold text-white tracking-wide">${token.symbol}</span>
                        <span className="text-[#B3B3B3] text-[11px] truncate max-w-[150px]">{token.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${valid ? "bg-[#1DB954]/10 text-[#1DB954]" : "bg-[#FF3B5C]/10 text-[#FF3B5C]"}`}>
                          {formatMcap(token.usd_market_cap)}
                        </span>
                        {!valid && <span title="Below $200K MCap or <24h old — betting disabled" className="text-[10px]">🔒</span>}
                      </div>
                      <span className="text-[#B3B3B3] text-[10px] font-medium">{formatAge(token.age_hours)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Chart iframe ── */}
      <div className="flex-1 bg-[#121212] min-h-[500px]">
        {embedUrl ? (
          <iframe
            key={selected?.address}
            src={embedUrl}
            title={`${selected?.symbol} Chart`}
            className="w-full h-full border-none"
            allow="clipboard-write"
          />
        ) : (
          <div className="flex flex-col text-center items-center justify-center h-full text-[#B3B3B3]">
            <span className="text-4xl mb-4 opacity-50">📈</span>
            <div className="text-sm font-medium tracking-wide text-white mb-1">Select a token to view chart</div>
            <div className="text-xs">Paste a contract address or search above to start</div>
          </div>
        )}
      </div>
    </div>
  );
}

export const TOKENS: TokenInfo[] = [];
