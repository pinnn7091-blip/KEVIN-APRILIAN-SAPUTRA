import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import type {Session, SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseClient} from '../lib/supabase';
import type {AppRuntimeConfig, UserProfile} from '../types/app';

interface AuthContextValue {
  supabase: SupabaseClient | null;
  config: AppRuntimeConfig | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  syncError: string | null;
  signIn: (email: string, password: string) => Promise<{error: string | null}>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [config, setConfig] = useState<AppRuntimeConfig | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncUserProfile = useCallback(
    async (client: SupabaseClient, activeSession: Session | null) => {
      if (!activeSession) {
        setProfile(null);
        setSyncError(null);
        return;
      }

      try {
        // Call server sync-profile first so the first user in Supabase Auth is guaranteed 'admin'
        const res = await fetch('/api/auth/sync-profile', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeSession.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile as UserProfile);
            setSyncError(null);
            return;
          }
        } else {
          const errPayload = await res.json().catch(() => ({}));
          if (res.status !== 503 && errPayload?.error) {
            setSyncError(errPayload.error);
          }
        }

        // Fallback: query profile directly via Supabase client if service role is absent
        const {data: directProfile, error: directErr} = await client
          .from('profiles')
          .select('*')
          .eq('id', activeSession.user.id)
          .maybeSingle();

        if (directErr) {
          setSyncError(directErr.message);
          setProfile(null);
          return;
        }

        if (directProfile) {
          setProfile(directProfile as UserProfile);
          setSyncError(null);
        } else {
          setSyncError(
            'Profil pengguna belum ditemukan di tabel profiles. Pastikan supabase/schema.sql sudah dijalankan.',
          );
          setProfile(null);
        }
      } catch (err: any) {
        setSyncError(err?.message || 'Gagal menyinkronkan profil pengguna.');
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function init() {
      const {client, config: runtimeConfig} = await getSupabaseClient();
      if (!isMounted) return;

      setConfig(runtimeConfig);
      setSupabase(client);

      if (!client) {
        setLoading(false);
        return;
      }

      const {data} = await client.auth.getSession();
      if (!isMounted) return;

      const currentSession = data.session ?? null;
      setSession(currentSession);
      await syncUserProfile(client, currentSession);

      if (!isMounted) return;
      setLoading(false);

      const {data: listener} = client.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        await syncUserProfile(client, nextSession);
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    }

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [syncUserProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return {error: 'Koneksi Supabase belum dikonfigurasi.'};
      }

      const {data, error} = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return {error: error.message};
      }

      if (data.session) {
        setSession(data.session);
        await syncUserProfile(supabase, data.session);
      }

      return {error: null};
    },
    [supabase, syncUserProfile],
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setSyncError(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (supabase && session) {
      await syncUserProfile(supabase, session);
    }
  }, [supabase, session, syncUserProfile]);

  return (
    <AuthContext.Provider
      value={{
        supabase,
        config,
        session,
        profile,
        loading,
        syncError,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
