import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_ANON_KEY;

export const hasSupabaseEnv = Boolean(projectId && publicAnonKey);

export function getSupabaseClient(): SupabaseClient {
    const url = `https://${projectId}.supabase.co`;
    const key = publicAnonKey ?? 'anon_key_missing';

    return createClient(url, key);
}

// Backward compatibility export (avoid breaking existing imports)
export const supabase = getSupabaseClient();

export { projectId, publicAnonKey };
