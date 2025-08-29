import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/shared/lib/supabaseServer';
import { ok, fail, requireAuth } from '@/shared/lib/api';
import type {
    AdContractCreateData,
    AdContract,
    FetchContractsResponse,
    ContractStatus,
    DbContractWithAdInfo,
} from '@/entities/advertisement/model/types';

// GET /api/admin/ad-contracts - 계약 목록 조회
export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { searchParams } = new URL(request.url);
        const unionId = searchParams.get('unionId');
        const status = searchParams.get('status') as ContractStatus | null;
        const adId = searchParams.get('adId');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '10');

        const supabase = getSupabaseServerClient();

        // 기본 쿼리 구성
        let query = supabase.from('ad_contracts').select(
            `
                *,
                ads!inner(
                    title,
                    partner_name
                ),
                unions(
                    name
                )
            `,
            { count: 'exact' }
        );

        // 필터 적용
        if (unionId !== null) {
            if (unionId === 'common') {
                query = query.is('union_id', null);
            } else if (unionId) {
                query = query.eq('union_id', unionId);
            }
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (adId) {
            query = query.eq('ad_id', adId);
        }

        // 페이징 적용
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: contracts, error, count } = await query.range(from, to).order('created_at', { ascending: false });

        if (error) {
            console.error('[CONTRACTS_API] Database error:', error);
            return fail('DATABASE_ERROR', `데이터 조회 실패: ${error.message}`, 500);
        }

        // 데이터 변환
        const items: AdContract[] = (contracts || []).map((contract: any) => ({
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
        }));

        const response: FetchContractsResponse = {
            items,
            total: count || 0,
            hasMore: items.length === pageSize,
        };

        return ok(response);
    } catch (error) {
        console.error('[CONTRACTS_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// POST /api/admin/ad-contracts - 계약 생성
export async function POST(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const data: AdContractCreateData = await request.json();

        // 필수 필드 검증
        if (!data.ad_id || !data.start_date || !data.end_date || !data.billing_cycle || !data.amount) {
            return fail('VALIDATION_ERROR', '필수 필드가 누락되었습니다.', 400);
        }

        // 날짜 유효성 검증
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        if (startDate >= endDate) {
            return fail('VALIDATION_ERROR', '종료일은 시작일보다 늦어야 합니다.', 400);
        }

        // 금액 유효성 검증
        if (data.amount <= 0) {
            return fail('VALIDATION_ERROR', '계약 금액은 0보다 커야 합니다.', 400);
        }

        const supabase = getSupabaseServerClient();

        // 광고 존재 확인
        const { data: ad, error: adError } = await supabase
            .from('ads')
            .select('id, title, partner_name')
            .eq('id', data.ad_id)
            .single();

        if (adError) {
            if (adError.code === 'PGRST116') {
                return fail('NOT_FOUND', '광고를 찾을 수 없습니다.', 404);
            }
            return fail('DATABASE_ERROR', `광고 확인 실패: ${adError.message}`, 500);
        }

        // 기간 중복 확인 (같은 광고의 활성 계약과 겹치는지)
        const { data: overlappingContracts, error: overlapError } = await supabase
            .from('ad_contracts')
            .select('id')
            .eq('ad_id', data.ad_id)
            .eq('status', 'ACTIVE')
            .or(`start_date.lte.${data.end_date},end_date.gte.${data.start_date}`);

        if (overlapError) {
            console.error('[CONTRACTS_API] Overlap check error:', overlapError);
            return fail('DATABASE_ERROR', `기간 중복 확인 실패: ${overlapError.message}`, 500);
        }

        if (overlappingContracts && overlappingContracts.length > 0) {
            return fail('VALIDATION_ERROR', '해당 기간에 이미 활성 계약이 존재합니다.', 400);
        }

        // 계약 생성
        const { data: contract, error: createError } = await supabase
            .from('ad_contracts')
            .insert({
                ad_id: data.ad_id,
                union_id: data.union_id || null,
                start_date: data.start_date,
                end_date: data.end_date,
                billing_cycle: data.billing_cycle,
                amount: data.amount,
                status: data.status || 'PENDING',
                auto_invoice: data.auto_invoice ?? true,
                memo: data.memo || null,
            })
            .select()
            .single();

        if (createError) {
            console.error('[CONTRACTS_API] Contract creation error:', createError);
            return fail('DATABASE_ERROR', `계약 생성 실패: ${createError.message}`, 500);
        }

        return ok({
            id: contract.id,
            message: `${ad.partner_name}의 광고 계약이 성공적으로 생성되었습니다.`,
        });
    } catch (error) {
        console.error('[CONTRACTS_API] Exception in POST:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
