import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const projectId = process.env.SUPABASE_PROJECT_ID;
const publicAnonKey = process.env.SUPABASE_PUBLIC_ANON_KEY;

export const hasSupabaseEnv = Boolean(projectId && publicAnonKey);

export function getSupabaseClient(): SupabaseClient {
    const url = `https://${projectId ?? 'project'}.supabase.co`;
    const key = publicAnonKey ?? 'anon_key_missing';

    return createClient(url, key);
}

// Backward compatibility export (avoid breaking existing imports)
export const supabase = getSupabaseClient();

export { projectId, publicAnonKey };
