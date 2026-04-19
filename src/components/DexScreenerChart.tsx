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
    <div className="bg-[#121212] rounded-xl overflow-hidden shadow-2xl border border-white/5 flex flex-col h-full font-sans relative">
      
      {/* ── Top Header / Search Navbar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-4 px-6 flex items-center justify-end">

        {/* Spotify Pill Search */}
        <div className="max-w-[280px] w-full relative" ref={wrapRef}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" aria-hidden="true"><path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1833 14.7874 19.94 12.762 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path></svg>
            </div>
            <input
              className="w-full bg-[#242424] hover:bg-[#2A2A2A] text-white text-sm font-medium pl-10 pr-4 py-3 outline-none placeholder:text-white/50 transition-colors shadow-lg"
              style={{ borderRadius: open ? "24px 24px 0 0" : "24px" }}
              placeholder="What do you want to chart?"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
            />
            {lookupLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          {/* Search Dropdown / "Track List" */}
          {open && (
            <div className="absolute top-full left-0 right-0 max-h-[400px] overflow-y-auto bg-[#181818] border border-white/5 rounded-b-2xl shadow-2xl z-50 py-2">
              {loading && search.trim().length === 0 && (
                <div className="p-6 text-center text-[#B3B3B3] text-sm">Loading tracks...</div>
              )}
              {lookupError && (
                <div className="p-4 text-center text-[#FF3B5C] font-semibold text-sm">{lookupError}</div>
              )}
              {!loading && displayList.length === 0 && search.trim().length >= 2 && !lookupLoading && (
                <div className="p-6 text-center text-[#B3B3B3] text-sm italic">No results found for &ldquo;{search}&rdquo;</div>
              )}
              {displayList.length > 0 && (
                <div className="px-4 pb-2 text-[11px] font-bold tracking-widest text-[#B3B3B3] uppercase flex items-center border-b border-white/5">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1">Title</div>
                  <div className="hidden sm:block w-24 text-right">Album</div>
                  <div className="w-16 text-right flex justify-end"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"></path><path d="M8 3.25a.75.75 0 01.75.75v3.25H11a.75.75 0 010 1.5H7.25V4A.75.75 0 018 3.25z"></path></svg></div>
                </div>
              )}
              {displayList.map((token, idx) => {
                const valid = tokenIsValid(token);
                const isActive = selected?.address === token.address;
                return (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token)}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-white/10 transition-colors group ${isActive ? "bg-white/5" : ""}`}
                  >
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                      <div className="w-8 flex justify-center flex-shrink-0">
                        {isActive ? (
                          <svg className="fill-[#1DB954]" width="14" height="14" viewBox="0 0 24 24"><path d="M5.5 3.5h2v17h-2zm11 0h2v17h-2z" /></svg>
                        ) : (
                          <span className="text-[#B3B3B3] text-sm font-medium group-hover:hidden">{idx + 1}</span>
                        )}
                        {!isActive && (
                          <svg className="fill-white hidden group-hover:block" width="14" height="14" viewBox="0 0 24 24"><path d="M6 3.5l14 8.5-14 8.5z" /></svg>
                        )}
                      </div>
                      
                      <span className="w-10 h-10 rounded shadow-md overflow-hidden bg-[#242424] flex items-center justify-center flex-shrink-0">
                        {token.image_uri
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={token.image_uri} alt={token.symbol} className="w-full h-full object-cover" />
                          : <span className="text-[#B3B3B3] text-[10px] font-bold uppercase">{token.symbol.slice(0, 2)}</span>
                        }
                      </span>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`font-medium tracking-tight truncate ${isActive ? "text-[#1DB954]" : "text-white"}`}>{token.name}</span>
                        <span className="text-[#B3B3B3] text-[13px] hover:underline cursor-pointer truncate">${token.symbol}</span>
                      </div>
                    </div>
                    
                    <div className="hidden sm:block w-24 text-right text-[#B3B3B3] text-[13px]">
                      {formatMcap(token.usd_market_cap)}
                    </div>
                    
                    <div className="w-16 text-right text-[#B3B3B3] text-[13px] flex items-center justify-end gap-2">
                       {!valid && <span title="Betting Disabled" className="text-xs">🔒</span>}
                       {formatAge(token.age_hours)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Album Header ── */}
      <div 
        className="pt-24 px-6 pb-6"
        style={{
          background: "linear-gradient(180deg, #3E3E3E 0%, #121212 100%)"
        }}
      >
        <div className="flex items-end gap-6 mt-4">
          <div className="w-40 h-40 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden bg-[#282828] flex items-center justify-center flex-shrink-0 relative group">
            {selected?.image_uri ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={selected.image_uri} alt="" className="w-full h-full object-cover" />
            ) : (
               <span className="text-4xl text-[#B3B3B3] opacity-30 font-bold uppercase">{selected?.symbol.slice(0, 2) || "?"}</span>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={handleCopy}>
               <span className="bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold px-3 py-1.5 rounded-full transition-colors shadow-lg">
                 {copied ? "✓ Copied!" : "Copy CA"}
               </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-white text-xs font-bold uppercase tracking-widest hidden sm:block">Verified Token</span>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter hover:underline cursor-pointer line-clamp-2 leading-tight">
              {selected ? selected.name : "Select a Token"}
            </h1>
            
            {selected && (
              <div className="flex items-center gap-2 mt-2 text-sm text-[#B3B3B3] font-medium">
                <span className="w-6 h-6 rounded-full overflow-hidden bg-black flex-shrink-0 flex items-center justify-center shadow-lg">
                  <span className="text-[8px]">🦅</span>
                </span>
                <span className="font-bold text-white hover:underline cursor-pointer">DexScreener</span>
                <span>•</span>
                <span>{formatMcap(selected.usd_market_cap)} MC</span>
                <span>•</span>
                <span>{selected.age_hours > 24 ? `${Math.floor(selected.age_hours/24)} days` : `${Math.floor(selected.age_hours)} hours`}</span>
                {!tokenIsValid(selected) && (
                   <>
                    <span>•</span>
                    <span className="text-[#FF3B5C]">🔒 Lock</span>
                   </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ── Chart iframe ("Lyrics" area) ── */}
      <div className="flex-1 relative bg-[#121212] min-h-[500px]">
        {embedUrl ? (
          <>
            <div className="absolute inset-x-6 inset-y-2 rounded-xl overflow-hidden border border-white/5">
              <iframe
                key={selected?.address}
                src={embedUrl}
                title={`${selected?.symbol} Chart`}
                className="absolute inset-0 w-full h-full border-none"
                allow="clipboard-write"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col text-center items-center justify-center h-full text-[#B3B3B3]">
            <span className="text-4xl mb-4 opacity-30">🎵</span>
            <div className="text-sm font-medium tracking-wide text-white mb-1">It&apos;s quiet here.</div>
            <div className="text-xs">Search for a token to view the chart.</div>
          </div>
        )}
      </div>

    </div>
  );
}

export const TOKENS: TokenInfo[] = [];
