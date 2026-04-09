"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createSupabaseClient } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

/**
 * AuthContext — Supabase Wallet Authentication
 *
 * Handles the flow:
 * 1. User connects wallet (via Solana wallet adapter)
 * 2. User signs a message to prove ownership
 * 3. Supabase creates a session via signInWithWeb3()
 * 4. Session persists across refreshes
 *
 * Gracefully degrades if Supabase is not configured.
 */

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signingIn: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    error: string | null;
    /** Whether Supabase is configured */
    supabaseReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signingIn: false,
    signIn: async () => { },
    signOut: async () => { },
    error: null,
    supabaseReady: false,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { publicKey, signMessage, disconnect, connected } = useWallet();
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [signingIn, setSigningIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createSupabaseClient();
    const supabaseReady = supabase !== null;

    // Check for existing session on mount
    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        const getSession = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);
            } catch {
                console.error("Failed to get session");
            } finally {
                setLoading(false);
            }
        };

        getSession();

        // Listen for auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto sign-in when wallet connects ──
    // Triggers signMessage request immediately after wallet connects
    useEffect(() => {
        if (connected && publicKey && !user && !loading && !signingIn) {
            signIn();
        }
    }, [connected, publicKey]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Sign in with Solana wallet
     */
    const signIn = useCallback(async () => {
        if (!supabase) {
            setError("Supabase is not configured. Add credentials to .env.local");
            return;
        }

        if (!publicKey || !signMessage) {
            setError("Please connect your wallet first");
            return;
        }

        setSigningIn(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithWeb3({
                address: publicKey.toBase58(),
                signMessage: async (message: string) => {
                    const encodedMessage = new TextEncoder().encode(message);
                    const signature = await signMessage(encodedMessage);
                    return btoa(String.fromCharCode(...signature));
                },
            });

            if (authError) {
                throw authError;
            }

            if (data.session) {
                setSession(data.session);
                setUser(data.session.user);

                // Upsert user record in our custom users table
                await supabase.from("users").upsert(
                    {
                        wallet_address: publicKey.toBase58(),
                    },
                    {
                        onConflict: "wallet_address",
                    }
                );
            }
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Authentication failed";
            setError(message);
            console.error("Sign in error:", err);
        } finally {
            setSigningIn(false);
        }
    }, [publicKey, signMessage, supabase]);

    /**
     * Sign out — clears Supabase session and disconnects wallet
     */
    const signOut = useCallback(async () => {
        try {
            if (supabase) {
                await supabase.auth.signOut();
            }
            await disconnect();
            setUser(null);
            setSession(null);
            setError(null);
        } catch (err) {
            console.error("Sign out error:", err);
        }
    }, [supabase, disconnect]);

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                signingIn,
                signIn,
                signOut,
                error,
                supabaseReady,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
