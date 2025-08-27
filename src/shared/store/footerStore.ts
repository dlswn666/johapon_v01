import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { footerApi, type FooterInfo } from '@/shared/api/footerApi';

export type { FooterInfo } from '@/shared/api/footerApi';

interface CacheEntry {
    data: FooterInfo;
    timestamp: number;
}

interface FooterState {
    // 캐시 데이터
    cacheBySlug: Map<string, CacheEntry>;
    // 상태
    currentFooterInfo: FooterInfo | null;
    loading: boolean;
    error: string | null;
    
    // 액션
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setCurrentFooterInfo: (info: FooterInfo | null) => void;
    
    // 캐시 관련 액션
    getCached: (slug: string) => FooterInfo | null;
    setCached: (slug: string, data: FooterInfo) => void;
    deleteCached: (slug: string) => void;
    clearCache: () => void;
    
    // API 호출 액션
    fetchFooterInfo: (slug: string) => Promise<FooterInfo | null>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5분

const isExpired = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp > CACHE_TTL;
};

export const useFooterStore = create<FooterState>()(
    devtools(
        (set, get) => ({
            // 초기 상태
            cacheBySlug: new Map(),
            currentFooterInfo: null,
            loading: false,
            error: null,
            
            // 기본 액션
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setCurrentFooterInfo: (info) => set({ currentFooterInfo: info }),
            
            // 캐시 관련 액션
            getCached: (slug: string) => {
                const { cacheBySlug } = get();
                const entry = cacheBySlug.get(slug);
                
                if (!entry || isExpired(entry)) {
                    if (entry) {
                        // 만료된 캐시 삭제
                        const newCache = new Map(cacheBySlug);
                        newCache.delete(slug);
                        set({ cacheBySlug: newCache });
                    }
                    return null;
                }
                return entry.data;
            },
            
            setCached: (slug: string, data: FooterInfo) => {
                const { cacheBySlug } = get();
                const newCache = new Map(cacheBySlug);
                newCache.set(slug, {
                    data,
                    timestamp: Date.now(),
                });
                set({ cacheBySlug: newCache });
            },
            
            deleteCached: (slug: string) => {
                const { cacheBySlug } = get();
                const newCache = new Map(cacheBySlug);
                newCache.delete(slug);
                set({ cacheBySlug: newCache });
            },
            
            clearCache: () => {
                set({ cacheBySlug: new Map() });
            },
            
            // API 호출 액션
            fetchFooterInfo: async (slug: string) => {
                const { getCached, setCached } = get();
                
                // 캐시 확인
                const cached = getCached(slug);
                if (cached) {
                    set({ currentFooterInfo: cached });
                    return cached;
                }
                
                set({ loading: true, error: null });
                
                try {
                    const footerInfo = await footerApi.fetchFooterInfo(slug);
                    
                    if (footerInfo) {
                        setCached(slug, footerInfo);
                        set({ currentFooterInfo: footerInfo, loading: false });
                        return footerInfo;
                    } else {
                        set({ 
                            currentFooterInfo: null, 
                            loading: false,
                            error: 'Footer 정보를 찾을 수 없습니다.'
                        });
                        return null;
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error 
                        ? error.message 
                        : 'Footer 정보를 불러올 수 없습니다.';
                    
                    set({ 
                        loading: false, 
                        error: errorMessage,
                        currentFooterInfo: null
                    });
                    
                    console.error('[FOOTER_STORE] Failed to fetch footer info:', error);
                    return null;
                }
            },
        }),
        {
            name: 'footer-store',
        }
    )
);
