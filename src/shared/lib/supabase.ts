import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const projectId = process.env.SUPABASE_PROJECT_ID;
const publicAnonKey = process.env.SUPABASE_PUBLIC_ANON_KEY;

export const hasSupabaseEnv = Boolean(projectId && publicAnonKey);

export function getSupabaseClient(): SupabaseClient {
    const url = `https://${projectId ?? 'project'}.supabase.co`;
    const key = publicAnonKey ?? 'anon_key_missing';

    console.log('[SUPABASE] Environment check:', {
        projectId: projectId ? `${projectId.slice(0, 8)}...` : 'MISSING',
        anonKey: publicAnonKey ? `${publicAnonKey.slice(0, 20)}...` : 'MISSING',
        url,
        hasSupabaseEnv,
    });

    return createClient(url, key);
}

// Backward compatibility export (avoid breaking existing imports)
export const supabase = getSupabaseClient();

export { projectId, publicAnonKey };
