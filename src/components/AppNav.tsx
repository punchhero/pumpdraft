"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePoints } from "@/providers/PointsProvider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PillLogo } from "@/components/FloatingPills";

export default function AppNav() {
  const pathname = usePathname();
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { points, solBalance, winStreak } = usePoints();

  const [airdropStatus, setAirdropStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleWalletClick = () => {
    if (connected) disconnect();
    else setVisible(true);
  };

  const handleAirdrop = useCallback(async () => {
    if (!publicKey) return;
    setAirdropStatus("loading");
    try {
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      setAirdropStatus("success");
      setTimeout(() => setAirdropStatus("idle"), 3000);
    } catch {
      setAirdropStatus("error");
      setTimeout(() => setAirdropStatus("idle"), 3000);
    }
  }, [publicKey, connection]);

  const navLinks = [
    { href: "/app",          label: "Terminal"     },
    { href: "/leaderboard",  label: "Leaderboard"  },
    { href: "/profile",      label: "Profile"      },
    { href: "/about",        label: "About"        },
  ];

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <nav className="appnav">
      <div className="appnav-inner">
        {/* Logo */}
        <Link href="/" className="appnav-logo">
          <PillLogo style={{ width: 20, height: 20, flexShrink: 0 }} />
          <span className="appnav-logo-text">PumpDraft</span>
        </Link>

        {/* Nav links */}
        <div className="appnav-links">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`appnav-link ${pathname === link.href ? "appnav-link-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="appnav-right">
          {/* Points badge */}
          {points > 0 && (
            <div className="appnav-badge">
              <span className="appnav-badge-dot" />
              {points.toLocaleString()} pts
              {winStreak >= 3 && (
                <span className="appnav-streak">🔥{winStreak}</span>
              )}
            </div>
          )}

          {/* SOL balance */}
          {connected && (
            <div className="appnav-balance">
              {solBalance.toFixed(2)} SOL
            </div>
          )}

          {/* Network indicator */}
          <div className="appnav-network">
            <span className="appnav-network-dot" />
            Devnet
          </div>

          {/* Airdrop button — only when connected */}
          {connected && solBalance < 1 && (
            <button
              id="airdrop-sol-btn"
              onClick={handleAirdrop}
              disabled={airdropStatus === "loading"}
              className={`appnav-airdrop ${airdropStatus}`}
            >
              {airdropStatus === "idle"    && "💧 Fund Wallet"}
              {airdropStatus === "loading" && "Requesting…"}
              {airdropStatus === "success" && "✓ +1 SOL"}
              {airdropStatus === "error"   && "Rate limited"}
            </button>
          )}

          {/* Wallet button */}
          <button
            id="connect-wallet-btn"
            onClick={handleWalletClick}
            className={`appnav-wallet ${connected ? "appnav-wallet-connected" : ""}`}
          >
            {connected ? shortKey : "Connect Wallet"}
          </button>
        </div>
      </div>
    </nav>
  );
}
