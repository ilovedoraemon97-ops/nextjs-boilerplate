import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isValidUrl = typeof supabaseUrl === 'string' && /^https?:\/\//.test(supabaseUrl);

let supabase: SupabaseClient | null = null;

if (isValidUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabaseClient = supabase;
export const isSupabaseConfigured = Boolean(isValidUrl && supabaseAnonKey);
