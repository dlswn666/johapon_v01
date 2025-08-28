export const runtime = 'nodejs';

import { ok, fail, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';
import * as XLSX from 'xlsx';

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data'))
        return withNoStore(fail('BAD_REQUEST', 'multipart required', 400));

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return withNoStore(fail('BAD_REQUEST', 'file required', 400));

    let rows: any[] = [];

    // 엑셀 파일인지 CSV 파일인지 확인
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // 엑셀 파일 처리
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
            return withNoStore(fail('BAD_REQUEST', 'empty file', 400));
        }

        const headers = (jsonData[0] as string[]).map((h) => h?.toLowerCase().trim());
        const expectedHeaders = ['user_id', 'name', 'address', 'phone', 'role'];

        // 최소 user_id와 name은 있어야 함
        if (!headers.includes('user_id') || !headers.includes('name')) {
            return withNoStore(fail('BAD_REQUEST', 'user_id and name columns are required', 400));
        }

        // 데이터 행들 처리
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0) continue;

            const rowData: any = {
                created_at: new Date().toISOString(),
                union_id: unionId, // tenant ID 추가
            };

            headers.forEach((header, index) => {
                const value = row[index];
                if (value !== undefined && value !== null && value !== '') {
                    switch (header) {
                        case 'user_id':
                            rowData.user_id = String(value).trim();
                            break;
                        case 'name':
                            rowData.name = String(value).trim();
                            break;
                        case 'address':
                            rowData.property_location = String(value).trim(); // DB 컬럼명으로 변환
                            break;
                        case 'phone':
                            rowData.phone = String(value).trim();
                            break;
                        case 'role':
                            const role = String(value).trim().toLowerCase();
                            rowData.user_type = ['admin', 'systemadmin'].includes(role) ? role : 'member'; // DB 컬럼명으로 변환
                            break;
                    }
                }
            });

            // user_id와 name은 필수
            if (rowData.user_id && rowData.name) {
                if (!rowData.user_type) rowData.user_type = 'member';
                rowData.is_approved = true; // 엑셀 업로드는 기본적으로 승인된 상태로
                rows.push(rowData);
            }
        }
    } else if (file.name.endsWith('.csv')) {
        // CSV 파일 처리 (기존 로직 개선)
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines.shift();

        if (!header) {
            return withNoStore(fail('BAD_REQUEST', 'empty file', 400));
        }

        const headers = header.split(',').map((h) => h.trim().toLowerCase());

        if (!headers.includes('user_id') || !headers.includes('name')) {
            return withNoStore(fail('BAD_REQUEST', 'user_id and name columns are required', 400));
        }

        rows = lines
            .map((line) => {
                const values = line.split(',').map((s) => s.trim());
                const rowData: any = {
                    created_at: new Date().toISOString(),
                    union_id: unionId, // tenant ID 추가
                };

                headers.forEach((header, index) => {
                    const value = values[index];
                    if (value !== undefined && value !== null && value !== '') {
                        switch (header) {
                            case 'user_id':
                                rowData.user_id = value;
                                break;
                            case 'name':
                                rowData.name = value;
                                break;
                            case 'address':
                                rowData.property_location = value; // DB 컬럼명으로 변환
                                break;
                            case 'phone':
                                rowData.phone = value;
                                break;
                            case 'role':
                                const role = value.toLowerCase();
                                rowData.user_type = ['admin', 'systemadmin'].includes(role) ? role : 'member'; // DB 컬럼명으로 변환
                                break;
                        }
                    }
                });

                if (!rowData.user_type) rowData.user_type = 'member';
                rowData.is_approved = true; // 엑셀 업로드는 기본적으로 승인된 상태로
                return rowData;
            })
            .filter((row) => row.user_id && row.name);
    } else {
        return withNoStore(fail('BAD_REQUEST', 'unsupported file format. Please use .xlsx, .xls, or .csv', 400));
    }

    if (rows.length === 0) {
        return withNoStore(fail('BAD_REQUEST', 'no valid data found', 400));
    }

    const { error } = await supabase.from('users').insert(rows);
    if (error) return withNoStore(fail('DB_ERROR', 'bulk insert failed', 500));
    return withNoStore(ok({ inserted: rows.length }));
}
