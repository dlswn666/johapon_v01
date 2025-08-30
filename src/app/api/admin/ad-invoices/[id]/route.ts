import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/shared/lib/supabaseServer';
import { ok, fail, requireAuth } from '@/shared/lib/api';
import type { AdInvoice, AdInvoiceUpdateData } from '@/entities/advertisement/model/types';

// GET /api/admin/ad-invoices/[id] - 청구서 상세 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const supabase = getSupabaseServerClient();

        const { data: invoice, error } = await supabase
            .from('ad_invoices')
            .select(
                `
                *,
                ad_contracts!inner(
                    *,
                    ads!inner(
                        title,
                        partner_name
                    ),
                    unions(
                        name
                    )
                )
            `
            )
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return fail('NOT_FOUND', '청구서를 찾을 수 없습니다.', 404);
            }
            console.error('[INVOICES_API] Database error:', error);
            return fail('DATABASE_ERROR', `데이터 조회 실패: ${error.message}`, 500);
        }

        // 데이터 변환
        const result: AdInvoice = {
            id: invoice.id,
            contract_id: invoice.contract_id,
            period_start: invoice.period_start,
            period_end: invoice.period_end,
            due_date: invoice.due_date,
            amount: parseFloat(invoice.amount),
            status: invoice.status,
            paid_at: invoice.paid_at,
            created_at: invoice.created_at,
            ad_title: invoice.ad_contracts?.ads?.title,
            ad_partner_name: invoice.ad_contracts?.ads?.partner_name,
            union_name: invoice.ad_contracts?.unions?.name,
            contract: {
                id: invoice.ad_contracts.id,
                ad_id: invoice.ad_contracts.ad_id,
                union_id: invoice.ad_contracts.union_id,
                start_date: invoice.ad_contracts.start_date,
                end_date: invoice.ad_contracts.end_date,
                billing_cycle: invoice.ad_contracts.billing_cycle,
                amount: parseFloat(invoice.ad_contracts.amount),
                status: invoice.ad_contracts.status,
                auto_invoice: invoice.ad_contracts.auto_invoice,
                memo: invoice.ad_contracts.memo,
                created_at: invoice.ad_contracts.created_at,
                updated_at: invoice.ad_contracts.updated_at,
            },
        };

        return ok(result);
    } catch (error) {
        console.error('[INVOICES_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// PUT /api/admin/ad-invoices/[id] - 청구서 수정 (주로 입금 처리)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const data: AdInvoiceUpdateData = await request.json();

        const supabase = getSupabaseServerClient();

        // 청구서 존재 확인
        const { data: existingInvoice, error: checkError } = await supabase
            .from('ad_invoices')
            .select('id, status, paid_at')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return fail('NOT_FOUND', '청구서를 찾을 수 없습니다.', 404);
            }
            return fail('DATABASE_ERROR', `청구서 확인 실패: ${checkError.message}`, 500);
        }

        // 상태 변경 유효성 검증
        if (data.status) {
            // PAID로 변경하는 경우 paid_at 필수
            if (data.status === 'PAID' && !data.paid_at && !existingInvoice.paid_at) {
                data.paid_at = new Date().toISOString();
            }

            // PAID가 아닌 상태로 변경하는 경우 paid_at 제거
            if (data.status !== 'PAID') {
                data.paid_at = null;
            }
        }

        // 업데이트 데이터 구성
        const updateData: any = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.paid_at !== undefined) updateData.paid_at = data.paid_at;

        if (Object.keys(updateData).length === 0) {
            return fail('VALIDATION_ERROR', '수정할 데이터가 없습니다.', 400);
        }

        const { error: updateError } = await supabase.from('ad_invoices').update(updateData).eq('id', id);

        if (updateError) {
            console.error('[INVOICES_API] Invoice update error:', updateError);
            return fail('DATABASE_ERROR', `청구서 수정 실패: ${updateError.message}`, 500);
        }

        let message = '청구서가 성공적으로 수정되었습니다.';
        if (data.status === 'PAID') {
            message = '입금 처리가 완료되었습니다.';
        } else if (data.status === 'CANCELLED') {
            message = '청구서가 취소되었습니다.';
        } else if (data.status === 'DUE') {
            message = '청구서 상태가 미납으로 변경되었습니다.';
        }

        return ok({ message });
    } catch (error) {
        console.error('[INVOICES_API] Exception in PUT:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
