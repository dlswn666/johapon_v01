export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';

export async function POST(req: Request) {
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data'))
        return withNoStore(fail('BAD_REQUEST', 'multipart required', 400));

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return withNoStore(fail('BAD_REQUEST', 'file required', 400));

    // 간단 CSV 파서 (헤더: user_id,name,role)
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines.shift();
    if (!header || !/user_id\s*,\s*name\s*,\s*role/i.test(header)) {
        return withNoStore(fail('BAD_REQUEST', 'invalid csv header', 400));
    }

    const supabase = getSupabaseClient();
    const rows = lines.map((line) => {
        const [user_id, name, role] = line.split(',').map((s) => s.trim());
        return { user_id, name, role: role || 'member', created_at: new Date().toISOString() };
    });
    const { error } = await supabase.from('users').insert(rows);
    if (error) return withNoStore(fail('DB_ERROR', 'bulk insert failed', 500));
    return withNoStore(ok({ inserted: rows.length }));
}
