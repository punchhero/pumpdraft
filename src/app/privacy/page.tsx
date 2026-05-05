import React from "react";
import AppNav from "@/components/AppNav";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#B3B3B3] flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            <strong>Last Updated: May 2026</strong>
          </p>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>
              Given the decentralized nature of our Platform, we collect very limited information. We do not require an email address, name, or password. 
              The only information we actively track and store is your public Solana wallet address and the history of predictions (bets) made using that address.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>
              Your public wallet address is used strictly to identify your account, assign points for the global leaderboard, and verify your predictions on-chain. 
              Because the blockchain is a public ledger, this information is inherently visible to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Private Keys & Security</h2>
            <p>
              <strong>We never have access to your private keys.</strong> All transactions are signed locally in your wallet extension (e.g., Phantom). 
              We cannot withdraw funds from your wallet. You are entirely responsible for the security of your own private keys and seed phrases.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p>
              Our infrastructure is hosted on Vercel and our database is hosted on Supabase. These providers may temporarily log IP addresses for DDoS protection and performance analytics. 
              We also fetch market data from third-party APIs like DexScreener. None of these services receive your private cryptographic data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cookies</h2>
            <p>
              We may use local storage or strictly necessary cookies to keep your wallet session active and store your preferred UI settings. We do not use third-party tracking cookies for advertising purposes.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
