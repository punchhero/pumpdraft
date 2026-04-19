import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeDatabase() {
  console.log("Wiping all user stats...");

  // Update all users to reset stats
  const { error: userError } = await supabase
    .from("users")
    .update({
      points: 0,
      win_streak: 0,
      total_wins: 0,
      total_losses: 0,
    })
    .neq("wallet_address", "force_update_all");

  if (userError) {
    console.error("Failed to wipe users:", userError);
  } else {
    console.log("Users stats wiped.");
  }

  // Delete all predictions so that old pending bets don't accidentally resolve
  const { error: predictionError } = await supabase
    .from("predictions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (predictionError) {
    console.error("Failed to delete predictions:", predictionError);
  } else {
    console.log("Predictions wiped.");
  }

  // Optionally delete pools
  const { error: poolError } = await supabase
    .from("pools")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (poolError) {
    console.error("Failed to delete pools:", poolError);
  } else {
    console.log("Pools wiped.");
  }

  console.log("Database cleanup complete!");
}

wipeDatabase();
