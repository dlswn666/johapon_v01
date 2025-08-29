import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/shared/lib/supabaseServer';
import { ok, fail, requireAuth } from '@/shared/lib/api';
import type {
    AdInvoice,
    FetchInvoicesResponse,
    InvoiceStatus,
    BillingCycle,
} from '@/entities/advertisement/model/types';

// GET /api/admin/ad-invoices - 청구서 목록 조회
export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { searchParams } = new URL(request.url);
        const unionId = searchParams.get('unionId');
        const status = searchParams.get('status') as InvoiceStatus | null;
        const month = searchParams.get('month'); // YYYY-MM 형식
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '10');

        const supabase = getSupabaseServerClient();

        // 기본 쿼리 구성
        let query = supabase.from('ad_invoices').select(
            `
                *,
                ad_contracts!inner(
                    ad_id,
                    union_id,
                    start_date,
                    end_date,
                    billing_cycle,
                    ads!inner(
                        title,
                        partner_name
                    ),
                    unions(
                        name
                    )
                )
            `,
            { count: 'exact' }
        );

        // 필터 적용
        if (unionId !== null) {
            if (unionId === 'common') {
                query = query.is('ad_contracts.union_id', null);
            } else if (unionId) {
                query = query.eq('ad_contracts.union_id', unionId);
            }
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (month) {
            const [year, monthNum] = month.split('-');
            const startOfMonth = `${year}-${monthNum}-01`;
            const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
            query = query.gte('due_date', startOfMonth).lte('due_date', endOfMonth);
        }

        // 페이징 적용
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: invoices, error, count } = await query.range(from, to).order('due_date', { ascending: false });

        if (error) {
            console.error('[INVOICES_API] Database error:', error);
            return fail('DATABASE_ERROR', `데이터 조회 실패: ${error.message}`, 500);
        }

        // 데이터 변환
        const items: AdInvoice[] = (invoices || []).map((invoice: any) => ({
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
                amount: parseFloat(invoice.ad_contracts.amount || '0'),
                status: invoice.ad_contracts.status,
                auto_invoice: invoice.ad_contracts.auto_invoice,
                memo: invoice.ad_contracts.memo,
                created_at: invoice.ad_contracts.created_at,
                updated_at: invoice.ad_contracts.updated_at,
            },
        }));

        const response: FetchInvoicesResponse = {
            items,
            total: count || 0,
            hasMore: items.length === pageSize,
        };

        return ok(response);
    } catch (error) {
        console.error('[INVOICES_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// POST /api/admin/ad-invoices/generate - 자동 청구서 생성
export async function POST(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // YYYY-MM 형식

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return fail('VALIDATION_ERROR', '올바른 월 형식(YYYY-MM)을 입력해 주세요.', 400);
        }

        const [year, monthNum] = month.split('-');
        const targetDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const periodStart = targetDate.toISOString().split('T')[0];

        // 월말 계산
        const nextMonth = new Date(parseInt(year), parseInt(monthNum), 0);
        const periodEnd = nextMonth.toISOString().split('T')[0];

        // 청구 마감일 (다음달 말일)
        const dueDate = new Date(parseInt(year), parseInt(monthNum) + 1, 0).toISOString().split('T')[0];

        const supabase = getSupabaseServerClient();

        // 해당 월에 활성 상태인 계약 조회
        const { data: activeContracts, error: contractError } = await supabase
            .from('ad_contracts')
            .select(
                `
                id,
                billing_cycle,
                amount,
                start_date,
                end_date,
                auto_invoice,
                ads!inner(
                    title,
                    partner_name
                )
            `
            )
            .eq('status', 'ACTIVE')
            .eq('auto_invoice', true)
            .lte('start_date', periodEnd)
            .gte('end_date', periodStart);

        if (contractError) {
            console.error('[INVOICES_API] Contract query error:', contractError);
            return fail('DATABASE_ERROR', `활성 계약 조회 실패: ${contractError.message}`, 500);
        }

        if (!activeContracts || activeContracts.length === 0) {
            return ok({
                message: '해당 월에 청구할 활성 계약이 없습니다.',
                generated_count: 0,
            });
        }

        // 이미 생성된 청구서가 있는지 확인
        const { data: existingInvoices, error: existingError } = await supabase
            .from('ad_invoices')
            .select('contract_id')
            .in(
                'contract_id',
                activeContracts.map((c) => c.id)
            )
            .eq('period_start', periodStart)
            .eq('period_end', periodEnd);

        if (existingError) {
            console.error('[INVOICES_API] Existing invoice check error:', existingError);
            return fail('DATABASE_ERROR', `기존 청구서 확인 실패: ${existingError.message}`, 500);
        }

        const existingContractIds = new Set(existingInvoices?.map((inv) => inv.contract_id) || []);

        // 새로 생성할 청구서 목록
        const newInvoices = activeContracts
            .filter((contract) => !existingContractIds.has(contract.id))
            .map((contract) => {
                // 월별/연별 청구 금액 계산
                let invoiceAmount = parseFloat(contract.amount);
                if (contract.billing_cycle === 'YEARLY') {
                    invoiceAmount = invoiceAmount / 12; // 연간 계약의 경우 월할 계산
                }

                return {
                    contract_id: contract.id,
                    period_start: periodStart,
                    period_end: periodEnd,
                    due_date: dueDate,
                    amount: invoiceAmount,
                    status: 'DUE' as InvoiceStatus,
                };
            });

        if (newInvoices.length === 0) {
            return ok({
                message: '해당 월의 청구서가 이미 모두 생성되었습니다.',
                generated_count: 0,
            });
        }

        // 청구서 일괄 생성
        const { data: createdInvoices, error: createError } = await supabase
            .from('ad_invoices')
            .insert(newInvoices)
            .select();

        if (createError) {
            console.error('[INVOICES_API] Invoice creation error:', createError);
            return fail('DATABASE_ERROR', `청구서 생성 실패: ${createError.message}`, 500);
        }

        return ok({
            message: `${month}월 청구서 ${newInvoices.length}건이 성공적으로 생성되었습니다.`,
            generated_count: newInvoices.length,
            invoices: createdInvoices,
        });
    } catch (error) {
        console.error('[INVOICES_API] Exception in POST:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
