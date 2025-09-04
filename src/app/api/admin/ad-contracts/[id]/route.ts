import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail, requireAuth } from '@/shared/lib/api';
import type { AdContract, AdContractUpdateData } from '@/entities/advertisement/model/types';

// GET /api/admin/ad-contracts/[id] - 계약 상세 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const supabase = getSupabaseClient();

        const { data: contract, error } = await supabase
            .from('ad_contracts')
            .select(
                `
                *,
                ads!inner(
                    title,
                    partner_name
                ),
                unions(
                    name
                )
            `
            )
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return fail('NOT_FOUND', '계약을 찾을 수 없습니다.', 404);
            }
            console.error('[CONTRACTS_API] Database error:', error);
            return fail('DATABASE_ERROR', `데이터 조회 실패: ${error.message}`, 500);
        }

        // 데이터 변환
        const result: AdContract = {
            id: contract.id,
            ad_id: contract.ad_id,
            union_id: contract.union_id,
            start_date: contract.start_date,
            end_date: contract.end_date,
            billing_cycle: contract.billing_cycle,
            amount: parseFloat(contract.amount),
            status: contract.status,
            auto_invoice: contract.auto_invoice,
            memo: contract.memo,
            created_at: contract.created_at,
            updated_at: contract.updated_at,
            ad_title: contract.ads?.title,
            ad_partner_name: contract.ads?.partner_name,
            union_name: contract.unions?.name,
        };

        return ok(result);
    } catch (error) {
        console.error('[CONTRACTS_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// PUT /api/admin/ad-contracts/[id] - 계약 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const data: AdContractUpdateData = await request.json();

        const supabase = getSupabaseClient();

        // 계약 존재 확인
        const { data: existingContract, error: checkError } = await supabase
            .from('ad_contracts')
            .select('id, ad_id, start_date, end_date, status')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return fail('NOT_FOUND', '계약을 찾을 수 없습니다.', 404);
            }
            return fail('DATABASE_ERROR', `계약 확인 실패: ${checkError.message}`, 500);
        }

        // 날짜 유효성 검증
        if (data.start_date && data.end_date) {
            const startDate = new Date(data.start_date);
            const endDate = new Date(data.end_date);
            if (startDate >= endDate) {
                return fail('VALIDATION_ERROR', '종료일은 시작일보다 늦어야 합니다.', 400);
            }
        } else if (data.start_date) {
            const startDate = new Date(data.start_date);
            const endDate = new Date(existingContract.end_date);
            if (startDate >= endDate) {
                return fail('VALIDATION_ERROR', '시작일은 기존 종료일보다 빨라야 합니다.', 400);
            }
        } else if (data.end_date) {
            const startDate = new Date(existingContract.start_date);
            const endDate = new Date(data.end_date);
            if (startDate >= endDate) {
                return fail('VALIDATION_ERROR', '종료일은 기존 시작일보다 늦어야 합니다.', 400);
            }
        }

        // 금액 유효성 검증
        if (data.amount !== undefined && data.amount <= 0) {
            return fail('VALIDATION_ERROR', '계약 금액은 0보다 커야 합니다.', 400);
        }

        // 기간 중복 확인 (날짜가 변경되는 경우)
        if (data.start_date || data.end_date) {
            const newStartDate = data.start_date || existingContract.start_date;
            const newEndDate = data.end_date || existingContract.end_date;

            const { data: overlappingContracts, error: overlapError } = await supabase
                .from('ad_contracts')
                .select('id')
                .eq('ad_id', existingContract.ad_id)
                .eq('status', 'ACTIVE')
                .neq('id', id) // 현재 계약 제외
                .or(`start_date.lte.${newEndDate},end_date.gte.${newStartDate}`);

            if (overlapError) {
                console.error('[CONTRACTS_API] Overlap check error:', overlapError);
                return fail('DATABASE_ERROR', `기간 중복 확인 실패: ${overlapError.message}`, 500);
            }

            if (overlappingContracts && overlappingContracts.length > 0) {
                return fail('VALIDATION_ERROR', '해당 기간에 이미 다른 활성 계약이 존재합니다.', 400);
            }
        }

        // 업데이트 데이터 구성
        const updateData: any = {};
        if (data.start_date !== undefined) updateData.start_date = data.start_date;
        if (data.end_date !== undefined) updateData.end_date = data.end_date;
        if (data.billing_cycle !== undefined) updateData.billing_cycle = data.billing_cycle;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.auto_invoice !== undefined) updateData.auto_invoice = data.auto_invoice;
        if (data.memo !== undefined) updateData.memo = data.memo;

        if (Object.keys(updateData).length === 0) {
            return fail('VALIDATION_ERROR', '수정할 데이터가 없습니다.', 400);
        }

        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase.from('ad_contracts').update(updateData).eq('id', id);

        if (updateError) {
            console.error('[CONTRACTS_API] Contract update error:', updateError);
            return fail('DATABASE_ERROR', `계약 수정 실패: ${updateError.message}`, 500);
        }

        return ok({ message: '계약이 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('[CONTRACTS_API] Exception in PUT:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// DELETE /api/admin/ad-contracts/[id] - 계약 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const supabase = getSupabaseClient();

        // 관련 청구서가 있는지 확인
        const { data: invoices, error: invoiceCheckError } = await supabase
            .from('ad_invoices')
            .select('id, status')
            .eq('contract_id', id);

        if (invoiceCheckError) {
            console.error('[CONTRACTS_API] Invoice check error:', invoiceCheckError);
            return fail('DATABASE_ERROR', `청구서 확인 실패: ${invoiceCheckError.message}`, 500);
        }

        if (invoices && invoices.length > 0) {
            const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');
            if (paidInvoices.length > 0) {
                return fail('VALIDATION_ERROR', '입금 완료된 청구서가 있는 계약은 삭제할 수 없습니다.', 400);
            }
        }

        // 계약 삭제 (CASCADE로 관련 청구서도 자동 삭제)
        const { error: deleteError } = await supabase.from('ad_contracts').delete().eq('id', id);

        if (deleteError) {
            console.error('[CONTRACTS_API] Delete error:', deleteError);
            return fail('DATABASE_ERROR', `계약 삭제 실패: ${deleteError.message}`, 500);
        }

        return ok({ message: '계약이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('[CONTRACTS_API] Exception in DELETE:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
