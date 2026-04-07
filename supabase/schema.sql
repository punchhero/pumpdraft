-- ══════════════════════════════════════════════════════════════
-- POLYNATOR — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- ── Users Table ───────────────────────────────────────────────
-- Stores each connected wallet as a user with win/loss tracking
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_earned NUMERIC(20, 9) DEFAULT 0,
  points INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  sol_balance NUMERIC(10, 2) DEFAULT 50.00   -- Starting virtual SOL balance
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users (wallet_address);
-- Index for leaderboard queries (ordered by points DESC)
CREATE INDEX IF NOT EXISTS idx_users_points ON users (points DESC);

-- ── Migration Note ────────────────────────────────────────────
-- If you already ran schema.sql before, run these migration queries:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS sol_balance NUMERIC(10,2) DEFAULT 50.00;
-- CREATE INDEX IF NOT EXISTS idx_users_points ON users (points DESC);

-- ── Token Submissions ────────────────────────────────────────────
-- Users can suggest memecoins for the platform to add
CREATE TABLE IF NOT EXISTS token_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by TEXT,               -- wallet address
  token_ca TEXT NOT NULL,          -- contract address or symbol
  note TEXT,                       -- user's reason for submitting
  status TEXT DEFAULT 'pending',   -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Predictions Table ─────────────────────────────────────────
-- Stores every bet placed by users
CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  token_address TEXT NOT NULL,
  token_symbol TEXT,                       -- e.g. "WIF", "BONK"
  direction TEXT NOT NULL CHECK (direction IN ('UP', 'DOWN')),
  bet_amount NUMERIC(20, 9) NOT NULL,      -- Amount in SOL
  entry_price NUMERIC(20, 9) NOT NULL,     -- Price at time of bet
  exit_price NUMERIC(20, 9),               -- Price when resolved
  entry_time TIMESTAMPTZ DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '30m', '1h')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'cancelled')),
  result TEXT CHECK (result IN ('win', 'loss', NULL)),
  payout NUMERIC(20, 9) DEFAULT 0,         -- Payout amount in SOL
  pool_id UUID                              -- Links to the pool this bet belongs to
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_predictions_wallet ON predictions (wallet_address);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions (status);
CREATE INDEX IF NOT EXISTS idx_predictions_token ON predictions (token_address);

-- ── Pools Table (Pari-Mutuel) ─────────────────────────────────
-- Each pool represents a set of bets on a token for a specific timeframe
CREATE TABLE IF NOT EXISTS pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '30m', '1h')),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  entry_price NUMERIC(20, 9) NOT NULL,
  exit_price NUMERIC(20, 9),
  total_up_bets NUMERIC(20, 9) DEFAULT 0,   -- Sum of all UP bets
  total_down_bets NUMERIC(20, 9) DEFAULT 0,  -- Sum of all DOWN bets
  total_pool NUMERIC(20, 9) DEFAULT 0,       -- total_up + total_down
  platform_fee NUMERIC(20, 9) DEFAULT 0,     -- 5% of total pool
  reward_pool NUMERIC(20, 9) DEFAULT 0,      -- total_pool - platform_fee
  winning_side TEXT CHECK (winning_side IN ('UP', 'DOWN', NULL)),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'locked', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pools_status ON pools (status);
CREATE INDEX IF NOT EXISTS idx_pools_token ON pools (token_address);

-- ── Row Level Security (RLS) ──────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'address'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'address'));

-- Allow inserting new users (for upsert on first auth)
CREATE POLICY "Allow user creation"
  ON users FOR INSERT
  WITH CHECK (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'address'));

-- Users can view their own predictions
CREATE POLICY "Users can view own predictions"
  ON predictions FOR SELECT
  USING (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'address'));

-- Users can create predictions
CREATE POLICY "Users can create predictions"
  ON predictions FOR INSERT
  WITH CHECK (wallet_address = (auth.jwt() -> 'user_metadata' ->> 'address'));

-- Everyone can view pools (public data)
CREATE POLICY "Everyone can view pools"
  ON pools FOR SELECT
  USING (true);

-- Only server can modify pools (via service_role key)
-- No client-side insert/update policies for pools
