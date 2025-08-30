import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/shared/lib/supabaseServer';
import { ok, fail, requireAuth } from '@/shared/lib/api';
import type { AdDashboardSummary } from '@/entities/advertisement/model/types';

// GET /api/admin/ads-dashboard - 광고 관리 대시보드 데이터
export async function GET(request: NextRequest) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { searchParams } = new URL(request.url);
        const unionId = searchParams.get('unionId'); // 특정 조합 필터링 (선택사항)

        const supabase = getSupabaseServerClient();

        // 이번달 시작/끝 날짜
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // 30일 후 날짜 (만료 임박 기준)
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 1. 이번달 재무 통계
        let monthlyStatsQuery = supabase.from('ad_invoices').select(`
                amount,
                status,
                due_date,
                paid_at,
                ad_contracts!inner(
                    union_id,
                    ads!inner(partner_name)
                )
            `);

        if (unionId && unionId !== 'all') {
            if (unionId === 'common') {
                monthlyStatsQuery = monthlyStatsQuery.is('ad_contracts.union_id', null);
            } else {
                monthlyStatsQuery = monthlyStatsQuery.eq('ad_contracts.union_id', unionId);
            }
        }

        const { data: invoices, error: invoicesError } = await monthlyStatsQuery;

        if (invoicesError) {
            console.error('[DASHBOARD_API] Invoices query error:', invoicesError);
            return fail('DATABASE_ERROR', `청구서 데이터 조회 실패: ${invoicesError.message}`, 500);
        }

        // 오늘 날짜
        const today = now.toISOString().split('T')[0];

        // 이번달 입금액 계산 (Date 객체로 정확한 비교)
        const paidAmount = (invoices || [])
            .filter((inv) => {
                if (inv.status !== 'PAID' || !inv.paid_at) return false;
                const paidDate = new Date(inv.paid_at);
                const monthStartDate = new Date(monthStart);
                const monthEndDate = new Date(monthEnd + 'T23:59:59');
                return paidDate >= monthStartDate && paidDate <= monthEndDate;
            })
            .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

        // 이번달 입금 예정액 계산
        const dueAmount = (invoices || [])
            .filter((inv) => {
                if (inv.status !== 'DUE') return false;
                return inv.due_date >= monthStart && inv.due_date <= monthEnd;
            })
            .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

        // 연체 금액 및 업체 수 계산 (OVERDUE + DUE이지만 마감일 지난 것)
        const overdueInvoices = (invoices || []).filter((inv) => {
            if (inv.status === 'OVERDUE') return true;
            if (inv.status === 'DUE' && inv.due_date < today) return true;
            return false;
        });

        const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

        const overduePartners = Array.from(
            new Set(overdueInvoices.map((inv) => (inv.ad_contracts as any)?.ads?.partner_name))
        ).filter(Boolean);

        // 2. 계약 상태 통계
        let contractStatsQuery = supabase.from('ad_contracts').select('status, end_date, union_id');

        if (unionId && unionId !== 'all') {
            if (unionId === 'common') {
                contractStatsQuery = contractStatsQuery.is('union_id', null);
            } else {
                contractStatsQuery = contractStatsQuery.eq('union_id', unionId);
            }
        }

        const { data: contracts, error: contractsError } = await contractStatsQuery;

        if (contractsError) {
            console.error('[DASHBOARD_API] Contracts query error:', contractsError);
            return fail('DATABASE_ERROR', `계약 데이터 조회 실패: ${contractsError.message}`, 500);
        }

        const contractStats = {
            active: 0,
            pending: 0,
            expired: 0,
            cancelled: 0,
            expiring_soon: 0,
        };

        (contracts || []).forEach((contract) => {
            contractStats[contract.status.toLowerCase() as keyof typeof contractStats]++;

            if (contract.status === 'ACTIVE' && contract.end_date <= thirtyDaysLater) {
                contractStats.expiring_soon++;
            }
        });

        // 3. 연체 업체 상세 목록 (OVERDUE + DUE이지만 마감일 지난 것)
        let overduePartnersQuery = supabase
            .from('ad_invoices')
            .select(
                `
                amount,
                due_date,
                status,
                ad_contracts!inner(
                    union_id,
                    ads!inner(
                        partner_name,
                        phone
                    )
                )
            `
            )
            .or(`status.eq.OVERDUE,and(status.eq.DUE,due_date.lt.${today})`);

        if (unionId && unionId !== 'all') {
            if (unionId === 'common') {
                overduePartnersQuery = overduePartnersQuery.is('ad_contracts.union_id', null);
            } else {
                overduePartnersQuery = overduePartnersQuery.eq('ad_contracts.union_id', unionId);
            }
        }

        const { data: overdueData, error: overdueError } = await overduePartnersQuery
            .order('due_date', { ascending: true })
            .limit(10);

        if (overdueError) {
            console.error('[DASHBOARD_API] Overdue query error:', overdueError);
            return fail('DATABASE_ERROR', `연체 데이터 조회 실패: ${overdueError.message}`, 500);
        }

        const overduePartnersList = (overdueData || []).map((item: any) => {
            const dueDate = new Date(item.due_date);
            const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            return {
                partner_name: item.ad_contracts?.ads?.partner_name || '알 수 없음',
                phone: item.ad_contracts?.ads?.phone || '',
                overdue_amount: parseFloat(item.amount),
                overdue_days: overdueDays,
                latest_due_date: item.due_date,
            };
        });

        // 4. 만료 임박 계약 목록
        let expiringContractsQuery = supabase
            .from('ad_contracts')
            .select(
                `
                id,
                end_date,
                union_id,
                ads!inner(
                    title,
                    partner_name
                )
            `
            )
            .eq('status', 'ACTIVE')
            .lte('end_date', thirtyDaysLater)
            .gte('end_date', now.toISOString().split('T')[0]);

        if (unionId && unionId !== 'all') {
            if (unionId === 'common') {
                expiringContractsQuery = expiringContractsQuery.is('union_id', null);
            } else {
                expiringContractsQuery = expiringContractsQuery.eq('union_id', unionId);
            }
        }

        const { data: expiringData, error: expiringError } = await expiringContractsQuery
            .order('end_date', { ascending: true })
            .limit(10);

        if (expiringError) {
            console.error('[DASHBOARD_API] Expiring query error:', expiringError);
            return fail('DATABASE_ERROR', `만료 임박 계약 조회 실패: ${expiringError.message}`, 500);
        }

        const expiringContractsList = (expiringData || []).map((contract: any) => {
            const endDate = new Date(contract.end_date);
            const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: contract.id,
                ad_title: contract.ads?.title || '제목 없음',
                partner_name: contract.ads?.partner_name || '알 수 없음',
                end_date: contract.end_date,
                days_until_expiry: daysUntilExpiry,
            };
        });

        // 대시보드 데이터 구성
        const dashboardData: AdDashboardSummary = {
            monthly_stats: {
                paid_amount: Math.round(paidAmount),
                due_amount: Math.round(dueAmount),
                overdue_amount: Math.round(overdueAmount),
                overdue_partners_count: overduePartners.length,
            },
            contract_stats: contractStats,
            overdue_partners: overduePartnersList,
            expiring_contracts: expiringContractsList,
        };

        return ok(dashboardData);
    } catch (error) {
        console.error('[DASHBOARD_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
