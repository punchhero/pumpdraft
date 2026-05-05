import React from "react";
import AppNav from "@/components/AppNav";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#B3B3B3] flex flex-col">
      <AppNav />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>
            <strong>Last Updated: May 2026</strong>
          </p>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using PumpDraft ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. 
              The Platform is currently operating on the Solana Devnet for testing and entertainment purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Testnet Environment</h2>
            <p>
              The Platform operates strictly on the Solana Devnet. Any tokens, "SOL," or assets represented within the Platform possess absolutely <strong>zero real-world monetary value</strong>. 
              Under no circumstances should you attempt to send Mainnet (real) assets to any wallet addresses associated with this platform. 
              We are not responsible for any loss of funds due to user error.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Eligibility</h2>
            <p>
              You must be of legal age in your jurisdiction to use this platform. Even though the platform uses valueless testnet tokens, 
              local laws regarding simulated gambling or prediction markets may apply to you. It is your responsibility to ensure your use of the Platform is legal in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Prohibited Conduct</h2>
            <p>
              You agree not to exploit, hack, or manipulate the smart contracts or backend systems of the Platform. 
              This includes attempting to artificially inflate leaderboard points, abusing the Devnet faucet, or launching denial-of-service attacks against our infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Disclaimer of Warranties</h2>
            <p>
              The Platform is provided on an "as is" and "as available" basis without any warranties of any kind. 
              We do not guarantee continuous, uninterrupted, or secure access to any part of our services, and operation of our site may be interfered with by numerous factors outside of our control.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
