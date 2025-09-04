// 광고 게재 위치
export type AdPlacement = 'SIDE' | 'HOME' | 'BOARD';

// 청구 주기
export type BillingCycle = 'MONTHLY' | 'YEARLY';

// 계약 상태
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

// 청구서 상태
export type InvoiceStatus = 'DUE' | 'PAID' | 'OVERDUE' | 'CANCELLED';

// 기본 광고 정보
export interface Ad {
    id: string;
    union_id: string | null; // null이면 공통 광고
    title: string;
    partner_name: string;
    phone: string;
    thumbnail_url: string | null;
    detail_image_url: string | null;
    desktop_image_url: string | null;
    mobile_image_url: string | null;
    desktop_enabled: boolean;
    mobile_enabled: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    placements: AdPlacement[]; // 게재 위치 배열
}

// 광고 생성 데이터
export interface AdCreateData {
    union_id?: string | null;
    title: string;
    partner_name: string;
    phone: string;
    thumbnail_url?: string | null;
    detail_image_url?: string | null;
    desktop_image_url?: string | null;
    mobile_image_url?: string | null;
    desktop_enabled?: boolean;
    mobile_enabled?: boolean;
    placements: AdPlacement[];
    is_active?: boolean;
}

// 광고 수정 데이터
export interface AdUpdateData {
    title?: string;
    partner_name?: string;
    phone?: string;
    thumbnail_url?: string | null;
    detail_image_url?: string | null;
    desktop_image_url?: string | null;
    mobile_image_url?: string | null;
    desktop_enabled?: boolean;
    mobile_enabled?: boolean;
    placements?: AdPlacement[];
    is_active?: boolean;
}

// 광고 목록 아이템 (리스트용)
export interface AdListItem {
    id: string;
    union_id: string | null;
    title: string;
    partner_name: string;
    phone: string;
    thumbnail_url: string | null;
    is_active: boolean;
    placements: AdPlacement[];
    created_at: string;
    // 계약 정보 요약
    active_contracts_count: number;
    latest_contract_end_date: string | null;
}

// 광고 계약
export interface AdContract {
    id: string;
    ad_id: string;
    union_id: string | null;
    start_date: string;
    end_date: string;
    billing_cycle: BillingCycle;
    amount: number;
    status: ContractStatus;
    auto_invoice: boolean;
    memo: string | null;
    created_at: string;
    updated_at: string;
    // 조인된 정보
    ad_title?: string;
    ad_partner_name?: string;
    union_name?: string;
}

// 계약 생성 데이터
export interface AdContractCreateData {
    ad_id: string;
    union_id?: string | null;
    start_date: string;
    end_date: string;
    billing_cycle: BillingCycle;
    amount: number;
    status?: ContractStatus;
    auto_invoice?: boolean;
    memo?: string | null;
}

// 계약 수정 데이터
export interface AdContractUpdateData {
    start_date?: string;
    end_date?: string;
    billing_cycle?: BillingCycle;
    amount?: number;
    status?: ContractStatus;
    auto_invoice?: boolean;
    memo?: string | null;
}

// 청구서
export interface AdInvoice {
    id: string;
    contract_id: string;
    period_start: string;
    period_end: string;
    due_date: string;
    amount: number;
    status: InvoiceStatus;
    paid_at: string | null;
    created_at: string;
    // 조인된 정보
    contract?: AdContract;
    ad_title?: string;
    ad_partner_name?: string;
    union_name?: string;
}

// 청구서 수정 데이터 (입금 처리용)
export interface AdInvoiceUpdateData {
    status: InvoiceStatus;
    paid_at?: string | null;
}

// 대시보드 요약 정보
export interface AdDashboardSummary {
    // 이번달 재무 정보
    monthly_stats: {
        paid_amount: number; // 이번달 입금된 금액
        due_amount: number; // 이번달 입금 예정 금액
        overdue_amount: number; // 연체 금액
        overdue_partners_count: number; // 연체 업체 수
    };

    // 계약 상태 분포
    contract_stats: {
        active: number;
        pending: number;
        expired: number;
        cancelled: number;
        expiring_soon: number; // 30일 이내 만료 예정
    };

    // 연체 업체 목록
    overdue_partners: Array<{
        partner_name: string;
        phone: string;
        overdue_amount: number;
        overdue_days: number;
        latest_due_date: string;
    }>;

    // 만료 임박 계약 목록
    expiring_contracts: Array<{
        id: string;
        ad_title: string;
        partner_name: string;
        end_date: string;
        days_until_expiry: number;
    }>;
}

// API 응답 타입들
export interface FetchAdsParams {
    unionId?: string | null;
    placement?: AdPlacement;
    active?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface FetchAdsResponse {
    items: AdListItem[];
    total: number;
    hasMore: boolean;
}

export interface FetchContractsParams {
    unionId?: string | null;
    status?: ContractStatus;
    adId?: string;
    page?: number;
    pageSize?: number;
}

export interface FetchContractsResponse {
    items: AdContract[];
    total: number;
    hasMore: boolean;
}

export interface FetchInvoicesParams {
    unionId?: string | null;
    status?: InvoiceStatus;
    month?: string; // YYYY-MM 형식
    page?: number;
    pageSize?: number;
}

export interface FetchInvoicesResponse {
    items: AdInvoice[];
    total: number;
    hasMore: boolean;
}

// 데이터베이스 원본 타입들 (서버 사이드용)
export interface DbAd {
    id: string;
    union_id: string | null;
    title: string;
    partner_name: string;
    phone: string;
    thumbnail_url: string | null;
    detail_image_url: string | null;
    desktop_image_url: string | null;
    mobile_image_url: string | null;
    desktop_enabled: boolean;
    mobile_enabled: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DbAdPlacement {
    ad_id: string;
    placement: AdPlacement;
}

export interface DbAdContract {
    id: string;
    ad_id: string;
    union_id: string | null;
    start_date: string;
    end_date: string;
    billing_cycle: BillingCycle;
    amount: string; // numeric from DB
    status: ContractStatus;
    auto_invoice: boolean;
    memo: string | null;
    created_at: string;
    updated_at: string;
}

export interface DbAdInvoice {
    id: string;
    contract_id: string;
    period_start: string;
    period_end: string;
    due_date: string;
    amount: string; // numeric from DB
    status: InvoiceStatus;
    paid_at: string | null;
    created_at: string;
}

// 조인된 DB 결과 타입들
export interface DbAdWithPlacements extends DbAd {
    placements: DbAdPlacement[];
}

export interface DbAdWithContractSummary extends DbAd {
    placements: DbAdPlacement[];
    active_contracts_count: number;
    latest_contract_end_date: string | null;
}

export interface DbContractWithAdInfo extends DbAdContract {
    ad_title: string;
    ad_partner_name: string;
    union_name: string | null;
}

export interface DbInvoiceWithDetails extends DbAdInvoice {
    ad_title: string;
    ad_partner_name: string;
    union_name: string | null;
    contract_start_date: string;
    contract_end_date: string;
    contract_billing_cycle: BillingCycle;
}
