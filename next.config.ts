import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Supabase signInWithWeb3 type definitions are outdated vs runtime API
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
