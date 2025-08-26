'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { tenantStore, type TenantInfo } from '@/shared/store/tenantStore';

interface TenantContextValue {
    tenantInfo: TenantInfo | null;
    slug: string | null;
    loading: boolean;
    error: string | null;
    refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

interface TenantProviderProps {
    children: ReactNode;
    initialTenantInfo?: TenantInfo | null;
    initialSlug?: string | null;
}

export function TenantProvider({ children, initialTenantInfo = null, initialSlug = null }: TenantProviderProps) {
    const pathname = usePathname();
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(initialTenantInfo);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 현재 경로에서 slug 추출
    const currentSlug = initialSlug || (pathname ? pathname.split('/')[1] : null);
    const [slug, setSlug] = useState<string | null>(currentSlug);

    // 테넌트 정보 로드 함수
    const loadTenantInfo = async (targetSlug: string) => {
        if (!targetSlug) return;

        try {
            setLoading(true);
            setError(null);

            const tenant = await tenantStore.getOrFetchBySlug(targetSlug);
            setTenantInfo(tenant);

            if (!tenant) {
                setError('테넌트 정보를 찾을 수 없습니다.');
            }
        } catch (err) {
            console.error('[TenantProvider] Failed to load tenant info:', err);
            setError(err instanceof Error ? err.message : '테넌트 정보 로드 중 오류가 발생했습니다.');
            setTenantInfo(null);
        } finally {
            setLoading(false);
        }
    };

    // 경로 변경 시 테넌트 정보 업데이트
    useEffect(() => {
        const newSlug = pathname ? pathname.split('/')[1] : null;

        // slug가 변경되었거나, 초기 로드시에만 실행
        if (newSlug !== slug) {
            setSlug(newSlug);

            if (newSlug && newSlug !== 'admin' && newSlug !== 'api') {
                loadTenantInfo(newSlug);
            } else {
                // 관리자 페이지나 API 경로에서는 테넌트 정보 초기화
                setTenantInfo(null);
                setError(null);
                setLoading(false);
            }
        }
    }, [pathname, slug]);

    // 초기 데이터가 없고 유효한 slug가 있는 경우 로드
    useEffect(() => {
        if (!initialTenantInfo && currentSlug && currentSlug !== 'admin' && currentSlug !== 'api') {
            loadTenantInfo(currentSlug);
        }
    }, [initialTenantInfo, currentSlug]);

    const refreshTenant = async () => {
        if (slug) {
            // 캐시 삭제 후 재로드
            tenantStore.delete(slug);
            await loadTenantInfo(slug);
        }
    };

    const value: TenantContextValue = {
        tenantInfo,
        slug,
        loading,
        error,
        refreshTenant,
    };

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}

// 편의를 위한 추가 훅들
export function useTenantInfo(): TenantInfo | null {
    const { tenantInfo } = useTenant();
    return tenantInfo;
}

export function useTenantSlug(): string | null {
    const { slug } = useTenant();
    return slug;
}

export function useTenantLoading(): boolean {
    const { loading } = useTenant();
    return loading;
}
