import {createClient, type SupabaseClient} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

const cloudEnabled = (import.meta.env.VITE_CLOUD_ENABLED ?? import.meta.env.VITE_CLOUD_SYNC_ENABLED) !== 'false';
export const isSupabaseConfigured = Boolean(url && publishableKey && cloudEnabled);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}})
  : null;
