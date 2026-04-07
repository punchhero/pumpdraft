-- ══════════════════════════════════════════════════════════════
-- POLYNATOR — Helper Functions for Bet Resolution
-- Run this AFTER schema.sql in the Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Increment wins and earnings for a user
CREATE OR REPLACE FUNCTION increment_wins(p_wallet TEXT, p_earned NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET
    total_wins = total_wins + 1,
    total_earned = total_earned + p_earned
  WHERE wallet_address = p_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment losses for a user
CREATE OR REPLACE FUNCTION increment_losses(p_wallet TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET total_losses = total_losses + 1
  WHERE wallet_address = p_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
