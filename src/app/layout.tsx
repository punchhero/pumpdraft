import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaProvider from "@/providers/SolanaProvider";
import AuthProvider from "@/providers/AuthProvider";
import PointsProvider from "@/providers/PointsProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PumpDraft — Practice Pump.fun Predictions on Devnet",
  description:
    "Predict and trade Pump.fun memecoins on Solana Testnet. Zero real SOL at risk. Sharpen your instincts and climb the leaderboard.",
  keywords: ["pump.fun", "solana", "memecoin", "prediction", "devnet", "testnet", "crypto", "defi"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SolanaProvider>
          <AuthProvider>
            <PointsProvider>
              {children}
            </PointsProvider>
          </AuthProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}
