"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePoints } from "@/providers/PointsProvider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PillLogo } from "@/components/FloatingPills";
import { Droplet } from "lucide-react";

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
      setTimeout(() => setAirdropStatus("idle"), 15000); // 15 seconds to read popup
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
            <div className="relative">
              <button
                id="airdrop-sol-btn"
                onClick={handleAirdrop}
                disabled={airdropStatus === "loading"}
                className={`appnav-airdrop ${airdropStatus}`}
              >
                {airdropStatus === "idle"    && (
                  <span className="flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-blue-400" />
                    Fund Wallet
                  </span>
                )}
                {airdropStatus === "loading" && "Requesting…"}
                {airdropStatus === "success" && "✓ +1 SOL"}
                {airdropStatus === "error"   && "Rate limited"}
              </button>

              {airdropStatus === "error" && (
                <div className="absolute top-full mt-3 right-0 w-[280px] bg-[#181818] border border-white/10 rounded-xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                  <p className="text-[#FF3B5C] text-sm font-bold mb-1">Auto-Faucet Rate Limited!</p>
                  <p className="text-[#B3B3B3] text-xs leading-relaxed mb-4">
                    The Devnet is busy. You can manually fund your wallet by pasting your address at the official Solana Faucet. 
                    <br/><br/>
                    <strong>1.</strong> Choose "Devnet"<br/>
                    <strong>2.</strong> Enter amount of SOL<br/>
                    <strong>3.</strong> Click Airdrop (no wallet connection required).
                  </p>
                  <a 
                    href="https://faucet.solana.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block w-full text-center bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold py-2.5 rounded-full transition-colors"
                    onClick={() => setAirdropStatus("idle")}
                  >
                    Go to faucet.solana.com
                  </a>
                </div>
              )}
            </div>
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
