import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import type {AppRuntimeConfig} from '../types/app';

let cachedClient: SupabaseClient | null = null;
let cachedConfig: AppRuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<AppRuntimeConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = (await res.json()) as AppRuntimeConfig;
      cachedConfig = data;
      return data;
    }
  } catch {
    // Fallback to Vite env if server route is unavailable
  }

  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const missingVars: string[] = [];
  if (!url) missingVars.push('VITE_SUPABASE_URL');
  if (!anonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  cachedConfig = {
    configured: Boolean(url && anonKey),
    hasServiceRole: false,
    supabaseUrl: url || null,
    supabaseAnonKey: anonKey || null,
    missingVars,
  };
  return cachedConfig;
}

export async function getSupabaseClient(): Promise<{
  client: SupabaseClient | null;
  config: AppRuntimeConfig;
}> {
  const config = await loadRuntimeConfig();
  if (!config.configured || !config.supabaseUrl || !config.supabaseAnonKey) {
    return {client: null, config};
  }

  if (!cachedClient) {
    cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return {client: cachedClient, config};
}
