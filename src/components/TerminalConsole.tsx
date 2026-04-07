"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TerminalConsole — Typewriter Dialogue Component
 *
 * Prints pre-scripted lines one character at a time, simulating
 * a retro terminal boot sequence. Uses Framer Motion for smooth
 * character-by-character animation.
 */

interface TerminalLine {
    text: string;
    /** Optional color override: "green" (default), "dim", "amber", "red" */
    color?: "green" | "dim" | "amber" | "red";
    /** Delay in ms before this line starts typing */
    delay?: number;
}

// ──────────────────────────────────────────────────────────────
// PRE-SCRIPTED BOOT DIALOGUE
// Edit these lines to change what Polyna says on load.
// ──────────────────────────────────────────────────────────────
const BOOT_LINES: TerminalLine[] = [
    { text: "> INITIALIZING PolynaOS...", color: "dim", delay: 500 },
    { text: "> CONNECTION ESTABLISHED.", color: "dim", delay: 300 },
    { text: "", delay: 400 }, // blank line pause
    {
        text: '> SYSTEM ALO: I\'m Polyna. Welcome to the grid, degen.',
        color: "green",
        delay: 200,
    },
    {
        text: "> We bet on meme-streams here. Up or down. 1m to 1h.",
        color: "green",
        delay: 100,
    },
    {
        text: "> Sharp instincts get you rich. Weak ones get you liquidated.",
        color: "green",
        delay: 100,
    },
    { text: "", delay: 300 },
    {
        text: "> Connect your wallet if you dare.",
        color: "amber",
        delay: 200,
    },
];

const COLOR_MAP = {
    green: "text-terminal-green",
    dim: "text-terminal-green-dim",
    amber: "text-terminal-amber",
    red: "text-terminal-red",
};

/** Speed of the typewriter in ms per character */
const CHAR_SPEED = 30;

export default function TerminalConsole() {
    // Track which lines are fully typed, and the current typing progress
    const [completedLines, setCompletedLines] = useState<string[]>([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentText, setCurrentText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const typeLine = useCallback(
        (line: TerminalLine) => {
            if (!line.text) {
                // Empty line = just a pause
                setCompletedLines((prev) => [...prev, ""]);
                setCurrentLineIndex((prev) => prev + 1);
                return;
            }

            setIsTyping(true);
            setCurrentText("");
            let charIndex = 0;

            const interval = setInterval(() => {
                if (charIndex < line.text.length) {
                    setCurrentText(line.text.slice(0, charIndex + 1));
                    charIndex++;
                } else {
                    clearInterval(interval);
                    setIsTyping(false);
                    setCompletedLines((prev) => [...prev, line.text]);
                    setCurrentText("");
                    setCurrentLineIndex((prev) => prev + 1);
                }
            }, CHAR_SPEED);

            return () => clearInterval(interval);
        },
        []
    );

    useEffect(() => {
        if (currentLineIndex >= BOOT_LINES.length) {
            setIsComplete(true);
            return;
        }

        const line = BOOT_LINES[currentLineIndex];
        const timeout = setTimeout(() => {
            typeLine(line);
        }, line.delay || 0);

        return () => clearTimeout(timeout);
    }, [currentLineIndex, typeLine]);

    return (
        <div className="terminal-border bg-[#050505] rounded-sm overflow-hidden w-full">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-terminal-green-dark bg-[#0a0a0a]">
                <span className="text-terminal-green text-[10px]">●</span>
                <span className="text-terminal-green-dark text-[10px]">
                    PolynaOS_CONSOLE.sh
                </span>
                <span className="text-terminal-green-dark text-[10px] ml-auto">
                    {isComplete ? "[READY]" : "[BOOTING...]"}
                </span>
            </div>

            {/* Console output */}
            <div className="p-4 min-h-[200px] text-sm leading-relaxed">
                <AnimatePresence>
                    {/* Already-typed lines */}
                    {completedLines.map((line, i) => {
                        const lineData = BOOT_LINES[i];
                        const colorClass = COLOR_MAP[lineData?.color || "green"];
                        return (
                            <motion.div
                                key={`line-${i}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`${colorClass} ${lineData?.color === "green" || lineData?.color === "amber"
                                    ? "text-glow"
                                    : ""
                                    }`}
                            >
                                {line || "\u00A0"}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Currently typing line */}
                {isTyping && currentLineIndex < BOOT_LINES.length && (
                    <div
                        className={`${COLOR_MAP[BOOT_LINES[currentLineIndex]?.color || "green"]
                            } text-glow`}
                    >
                        {currentText}
                        <span className="cursor-blink">█</span>
                    </div>
                )}

                {/* Final cursor after everything is typed */}
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-terminal-green mt-2"
                    >
                        <span className="text-glow">&gt; _</span>
                        <span className="cursor-blink">█</span>
                    </motion.div>
                )}
            </div>

            {/* Bottom status bar */}
            <div className="flex justify-between px-3 py-1 border-t border-terminal-green-dark text-[10px] text-terminal-green-dark">
                <span>
                    LINES: {completedLines.length}/{BOOT_LINES.length}
                </span>
                <span>
                    MODE:{" "}
                    <span className="text-terminal-green">
                        {isComplete ? "INTERACTIVE" : "BOOT"}
                    </span>
                </span>
            </div>
        </div>
    );
}
