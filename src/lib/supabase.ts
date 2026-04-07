import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Browser Client
 *
 * Creates a Supabase client for use in client-side components.
 * Returns null if credentials are not configured (allows local dev).
 */

let supabaseInstance: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key || url === "https://your-project.supabase.co") {
        // Supabase not configured — return null
        return null;
    }

    if (!supabaseInstance) {
        supabaseInstance = createBrowserClient(url, key);
    }

    return supabaseInstance;
}
