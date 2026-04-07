"use client";

import React, { useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import the wallet adapter default styles
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * SolanaProvider
 *
 * Wraps the app with Solana connection, wallet, and modal providers.
 * Connects to Solana mainnet-beta by default.
 */
export default function SolanaProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // PumpDraft runs on Devnet — zero real SOL risk
    const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
