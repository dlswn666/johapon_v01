import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function resolveSupabaseUrl(): string {
    if (publicUrl) return publicUrl;
    return `https://${projectId ?? 'project'}.supabase.co`;
}

export function getSupabaseServerClient(): SupabaseClient {
    const url = resolveSupabaseUrl();
    const key = serviceRoleKey || publicAnonKey || 'anon_key_missing';
    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            // never cache server checks
            fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
    });
}

export { projectId, publicAnonKey, serviceRoleKey };
