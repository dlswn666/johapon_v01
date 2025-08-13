import { headers } from 'next/headers';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function getTenantFromHeaders(): Promise<string | null> {
    const hdrs = await headers();
    const slug = hdrs.get('x-tenant');
    return slug && /^[a-z0-9-_.]+$/i.test(slug) ? slug : null;
}

export async function assertTenantExists(slug: string): Promise<boolean> {
    if (!slug) return false;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('unions').select('homepage').eq('homepage', slug).maybeSingle();
    if (error) return false;
    return Boolean(data);
}
