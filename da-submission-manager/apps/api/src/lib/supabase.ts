import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null as any;
  client = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (...args) => fetch(...args) }
  });
  return client;
}

export function getActionNetworkConfig() {
  return config.actionNetwork;
}
