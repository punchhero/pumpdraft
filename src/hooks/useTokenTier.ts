"use client";

import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

/**
 * PumpDraft Token Holder Tier System
 *
 * Checks the connected wallet's PumpDraft token balance via Solana RPC.
 * Returns the user's tier, multiplier, and display info.
 *
 * Set PUMPDRAFT_TOKEN_CA to the real mint address once token is launched.
 * Until then, all wallets default to NONE tier.
 */

export const PUMPDRAFT_TOKEN_CA = process.env.NEXT_PUBLIC_PUMPDRAFT_TOKEN_CA ?? "";

export interface Tier {
    id: "NONE" | "INITIATE" | "OPERATIVE" | "SOVEREIGN" | "DAEMON" | "APEX";
    label: string;
    minTokens: number;
    multiplier: number;   // points multiplier
    color: string;        // tailwind class
    badge: string;        // displayed badge text
    emoji: string;
}

export const TIERS: Tier[] = [
    {
        id: "NONE",
        label: "NO HOLDINGS",
        minTokens: 0,
        multiplier: 1,
        color: "text-terminal-green-dark",
        badge: "DEGEN",
        emoji: "",
    },
    {
        id: "INITIATE",
        label: "INITIATE",
        minTokens: 100_000,
        multiplier: 1.25,
        color: "text-terminal-green",
        badge: "INITIATE",
        emoji: "◈",
    },
    {
        id: "OPERATIVE",
        label: "OPERATIVE",
        minTokens: 250_000,
        multiplier: 1.5,
        color: "text-terminal-amber",
        badge: "OPERATIVE",
        emoji: "◆",
    },
    {
        id: "SOVEREIGN",
        label: "SOVEREIGN",
        minTokens: 500_000,
        multiplier: 2,
        color: "text-yellow-400",
        badge: "SOVEREIGN",
        emoji: "★",
    },
    {
        id: "DAEMON",
        label: "DAEMON",
        minTokens: 1_000_000,
        multiplier: 2.5,
        color: "text-purple-400",
        badge: "DAEMON",
        emoji: "⬡",
    },
    {
        id: "APEX",
        label: "APEX",
        minTokens: 2_000_000,
        multiplier: 3,
        color: "text-red-400",
        badge: "APEX",
        emoji: "▲",
    },
];

function getTierForBalance(balance: number): Tier {
    // Walk tiers from highest to lowest
    for (let i = TIERS.length - 1; i >= 0; i--) {
        if (balance >= TIERS[i].minTokens) return TIERS[i];
    }
    return TIERS[0];
}

export interface TokenTierResult {
    tier: Tier;
    tokenBalance: number;
    loading: boolean;
}

export function useTokenTier(): TokenTierResult {
    const { publicKey, connected } = useWallet();
    const { connection } = useConnection();
    const [tokenBalance, setTokenBalance] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!connected || !publicKey || !PUMPDRAFT_TOKEN_CA) {
            setTokenBalance(0);
            return;
        }

        let cancelled = false;
        setLoading(true);

        async function fetchBalance() {
            try {
                const mintPubkey = new PublicKey(PUMPDRAFT_TOKEN_CA);
                const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey!, {
                    mint: mintPubkey,
                });

                if (cancelled) return;

                if (tokenAccounts.value.length === 0) {
                    setTokenBalance(0);
                } else {
                    // Sum all token accounts for this mint (usually just one)
                    let total = 0;
                    for (const { account } of tokenAccounts.value) {
                        // Token balance is stored at offset 64, as a 64-bit LE integer
                        const data = account.data;
                        const amount = Number(data.readBigUInt64LE(64));
                        total += amount;
                    }
                    // Divide by decimals (assume 6 decimals for SPL token)
                    setTokenBalance(total / 1_000_000);
                }
            } catch {
                if (!cancelled) setTokenBalance(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchBalance();
        return () => { cancelled = true; };
    }, [publicKey, connected, connection]);

    return {
        tier: getTierForBalance(tokenBalance),
        tokenBalance,
        loading,
    };
}
