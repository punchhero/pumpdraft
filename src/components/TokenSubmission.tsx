"use client";

import React, { useState } from "react";

/**
 * TokenSubmission — Let users suggest tokens for the prediction pool
 */

const RESPONSES = [
  "Submission received. We'll review it shortly.",
  "Token noted. If it passes our filters, it'll appear in the feed.",
  "Interesting pick. Pending review.",
  "Added to the queue.",
  "Got it. Our filter bot will check the market cap and age.",
  "Submitted. Check back in 24-48h.",
  "Logged. If it meets the criteria, it's in.",
  "Noted — minimum $250K market cap and 24h age required to qualify.",
];

export default function TokenSubmission() {
  const [tokenInput, setTokenInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lines, setLines] = useState<{ text: string; color: string }[]>([
    { text: "> Suggest a token for the prediction pool", color: "text-terminal-green-dark" },
  ]);

  const addLine = (text: string, color = "text-terminal-green") => {
    setLines(prev => [...prev.slice(-10), { text, color }]);
  };

  const handleSubmit = async () => {
    const ca = tokenInput.trim();
    if (!ca) {
      addLine("> ERROR: Enter a token address or symbol.", "text-terminal-red");
      return;
    }

    setIsSubmitting(true);
    addLine(`> Submitting: ${ca}`, "text-terminal-amber");

    await new Promise(r => setTimeout(r, 1200));

    try {
      const existing = JSON.parse(localStorage.getItem("pumpdraft_submissions") || "[]");
      existing.push({ ca, note: noteInput.trim(), timestamp: Date.now() });
      localStorage.setItem("pumpdraft_submissions", JSON.stringify(existing));
    } catch { /* ignore */ }

    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    addLine(`> ${response}`, "text-terminal-green");
    addLine(`> Status: PENDING REVIEW`, "text-terminal-green-dark");

    setTokenInput("");
    setNoteInput("");
    setIsSubmitting(false);
  };

  return (
    <div className="terminal-border bg-[#181818] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#121212]">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--green)", fontSize: 10 }}>●</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
            Suggest a Token
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          Min $250K MCap · 24h Age Required
        </span>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Form */}
        <div className="flex-1 p-4 space-y-3">
          {/* Token CA input */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>
              TOKEN ADDRESS OR SYMBOL
            </div>
            <div className="flex items-center gap-2 bg-[#242424] px-3 py-2 rounded-lg border border-white/[0.08]">
              <span style={{ color: "var(--green)", fontSize: 14 }}>$</span>
              <input
                type="text"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="e.g. BONK or 7GCih..."
                className="flex-1 bg-transparent outline-none"
                style={{ color: "var(--text-1)", fontSize: 13 }}
              />
            </div>
          </div>

          {/* Note input */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>
              WHY THIS TOKEN? (OPTIONAL)
            </div>
            <div className="bg-[#242424] px-3 py-2 rounded-lg border border-white/[0.08]">
              <input
                type="text"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Strong chart, breakout incoming..."
                className="w-full bg-transparent outline-none"
                style={{ color: "var(--text-1)", fontSize: 13 }}
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "10px 0",
              background: isSubmitting ? "var(--bg-elevated)" : "var(--green-dim)",
              border: "1px solid var(--green-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--green)",
              fontSize: 13,
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
              transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}
          >
            {isSubmitting ? "Submitting…" : "Submit Token"}
          </button>
        </div>

        {/* Console output */}
        <div className="lg:w-[360px] border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#121212] p-4">
          <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 8, letterSpacing: "0.04em" }}>
            CONSOLE OUTPUT
          </div>
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {lines.map((line, i) => (
              <div key={i} className={`text-xs ${line.color} leading-relaxed`}>
                {line.text}
              </div>
            ))}
            <div className="text-xs" style={{ color: "var(--green)" }}>
              {">"} <span className="cursor-blink">█</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex justify-between px-4 py-2 border-t border-white/[0.08]" style={{ fontSize: 11, color: "var(--text-3)" }}>
        <span>Review time: <span style={{ color: "var(--text-2)" }}>24–48h</span></span>
        <span>Submissions: <span style={{ color: "var(--green)" }}>Open</span></span>
      </div>
    </div>
  );
}
