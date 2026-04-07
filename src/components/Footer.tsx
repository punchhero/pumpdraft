"use client";

import React, { useState } from "react";

/**
 * Footer — Retro Terminal Info Bar
 *
 * Displays:
 * - Token Contract Address (CA) with a Copy button
 * - Link to token on Pump.fun
 * - Links to X (Twitter) and GitHub
 */

// ──────────────────────────────────────────────────────────────
// REPLACE THESE WITH YOUR ACTUAL VALUES
// ──────────────────────────────────────────────────────────────
const TOKEN_CA = "9dyfyn7sscAmY8dko3UGj2FvoNgoSdThC689uA2Dpump";
const PUMP_FUN_URL = "https://pump.fun/coin/9dyfyn7sscAmY8dko3UGj2FvoNgoSdThC689uA2Dpump";
const TWITTER_URL = "https://x.com/PolynaOS";
const GITHUB_URL = "https://github.com/olliegrimes123/polynaos";

export default function Footer() {
    const [copied, setCopied] = useState(false);

    const copyCA = async () => {
        try {
            await navigator.clipboard.writeText(TOKEN_CA);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = TOKEN_CA;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <footer className="w-full border-t border-terminal-green-dark bg-[#050505]">
            {/* Main footer content */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                {/* Token CA Section */}
                <div className="mb-4 p-3 terminal-border bg-[#0a0a0a]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-terminal-green-dark text-[10px] tracking-wider shrink-0">
                            TOKEN CA:
                        </span>
                        <code className="text-terminal-green text-glow text-xs break-all flex-1 font-bold">
                            {TOKEN_CA}
                        </code>
                        <button
                            onClick={copyCA}
                            className="
                shrink-0 px-3 py-1
                border border-terminal-green-dark
                text-[10px] tracking-wider
                transition-all duration-200
                hover:border-terminal-green hover:text-terminal-green
                active:scale-95
              "
                            style={{
                                color: copied
                                    ? "var(--terminal-green)"
                                    : "var(--terminal-green-dark)",
                            }}
                        >
                            {copied ? "✓ COPIED" : "⧉ COPY"}
                        </button>
                    </div>
                </div>

                {/* Links row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Navigation links */}
                    <div className="flex items-center gap-4 text-xs">
                        {/* Pump.fun */}
                        <a
                            href={PUMP_FUN_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                flex items-center gap-1.5 px-3 py-1.5
                border border-terminal-green
                text-terminal-green font-bold
                tracking-wider
                transition-all duration-200
                hover:bg-terminal-green hover:text-black
                hover:shadow-[0_0_15px_rgba(0,255,65,0.3)]
                active:scale-95
              "
                        >
                            <span className="text-base">🚀</span>
                            BUY ON PUMP.FUN
                        </a>

                        {/* X / Twitter */}
                        <a
                            href={TWITTER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                flex items-center gap-1.5
                text-terminal-green-dark
                transition-colors duration-200
                hover:text-terminal-green
              "
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="shrink-0"
                            >
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span className="text-xs tracking-wider hidden sm:inline">
                                TWITTER
                            </span>
                        </a>

                        {/* GitHub — hidden until repo is public */}
                        {GITHUB_URL && (
                            <a
                                href={GITHUB_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="
                flex items-center gap-1.5
                text-terminal-green-dark
                transition-colors duration-200
                hover:text-terminal-green
              "
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                <span className="text-xs tracking-wider hidden sm:inline">GITHUB</span>
                            </a>
                        )}
                    </div>

                    {/* Right: Copyright */}
                    <div className="text-[10px] text-terminal-green-dark">
                        <span className="text-terminal-green">PolynaOS</span> © 2026 —
                        ALL RIGHTS RESERVED
                    </div>
                </div>
            </div>

            {/* Bottom edge line */}
            <div className="h-px bg-gradient-to-r from-transparent via-terminal-green-dark to-transparent" />
        </footer>
    );
}
