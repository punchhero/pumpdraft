"use client";

import React from "react";

/**
 * PolynaTerminal — Full-Body Mascot Component
 *
 * Renders "Polyna" full-body with breathing animation and neon glow.
 * Uses an <img> tag with cache-bust to avoid stale image caching.
 */

export default function PolynaTerminal() {
    return (
        <div className="relative select-none">
            {/* Terminal window frame */}
            <div className="terminal-border bg-[#050505] rounded-sm overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-terminal-green-dark bg-[#0a0a0a]">
                    <span className="text-terminal-green text-[10px]">●</span>
                    <span className="text-terminal-green-dark text-[10px]">
                        POLYNA.exe
                    </span>
                    <span className="text-terminal-green-dark text-[10px] ml-auto">
                        [ACTIVE]
                    </span>
                </div>

                {/* Mascot image container */}
                <div className="p-3 flex items-center justify-center relative overflow-hidden">
                    {/* Glow backdrop */}
                    <div
                        className="absolute inset-0 opacity-25"
                        style={{
                            background:
                                "radial-gradient(ellipse at center, rgba(0,255,65,0.4) 0%, transparent 70%)",
                        }}
                    />

                    {/* Scanline effect over the image */}
                    <div
                        className="absolute inset-0 pointer-events-none z-10 opacity-10"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.08) 2px, rgba(0,255,65,0.08) 4px)",
                        }}
                    />

                    {/* Polyna image with breathing animation */}
                    <div className="relative polyna-breathe">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`/polyna-v3.png?v=${Date.now()}`}
                            alt="Polyna — PolynaOS Mascot"
                            className="
                                w-[250px] h-[250px] lg:w-[300px] lg:h-[300px]
                                object-contain
                                polyna-glow
                            "
                        />
                    </div>
                </div>

                {/* Status line */}
                <div className="px-3 py-1.5 border-t border-terminal-green-dark text-[10px] text-terminal-green-dark flex justify-between">
                    <span>
                        <span className="text-terminal-green">SYS</span> &gt; Mascot module
                        loaded
                        <span className="cursor-blink ml-1">_</span>
                    </span>
                    <span className="text-terminal-green animate-pulse">♥ ONLINE</span>
                </div>
            </div>
        </div>
    );
}
