import { getSupabaseClient } from '@/shared/lib/supabase';

export interface FooterInfo {
    associationName: string;
    associationSubtitle: string;
    contact: {
        phone: string;
        email: string;
        address: string;
    };
    business: {
        businessPhone: string;
        webmasterEmail: string;
    };
    chairman?: string;
    area?: string;
    members?: number;
}

interface SupabaseUnionFooterData {
    id: string;
    homepage: string;
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    union_chairman?: string | null;
    area?: string | null;
    union_members?: number | null;
}

interface CacheEntry {
    data: FooterInfo;
    timestamp: number;
}

class FooterStore {
    private cacheBySlug: Map<string, CacheEntry> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

    private isExpired(entry: CacheEntry): boolean {
        return Date.now() - entry.timestamp > this.CACHE_TTL;
    }

    public get(slug: string): FooterInfo | null {
        const entry = this.cacheBySlug.get(slug);
        if (!entry || this.isExpired(entry)) {
            this.cacheBySlug.delete(slug);
            return null;
        }
        return entry.data;
    }

    public set(slug: string, data: FooterInfo): void {
        this.cacheBySlug.set(slug, {
            data,
            timestamp: Date.now(),
        });
    }

    public delete(slug: string): void {
        this.cacheBySlug.delete(slug);
    }

    public clear(): void {
        this.cacheBySlug.clear();
    }

    public async getOrFetchBySlug(slug: string): Promise<FooterInfo | null> {
        const cached = this.get(slug);
        if (cached) {
            return cached;
        }

        try {
            const supabase = getSupabaseClient();
            console.log('[FOOTER_STORE] Fetching footer data for slug:', slug);

            const { data, error } = await supabase
                .from('unions')
                .select('id, homepage, name, address, phone, email, union_chairman, area, union_members')
                .eq('homepage', slug)
                .maybeSingle<SupabaseUnionFooterData>();

            console.log('[FOOTER_STORE] Query result:', { data, error });

            if (error) {
                console.error('[FOOTER_STORE] Database error:', error);
                return null;
            }

            if (!data) {
                return null;
            }

            const footerInfo: FooterInfo = {
                associationName: data.name || `${slug} 구역`,
                associationSubtitle: '주택재개발정비사업조합',
                contact: {
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                },
                business: {
                    businessPhone: data.phone || '', // unions 테이블에 별도 business phone이 없으면 일반 phone 사용
                    webmasterEmail: data.email || '', // unions 테이블에 별도 webmaster email이 없으면 일반 email 사용
                },
                chairman: data.union_chairman || undefined,
                area: data.area || undefined,
                members: data.union_members || undefined,
            };

            this.set(slug, footerInfo);
            return footerInfo;
        } catch (error) {
            console.error('[FOOTER_STORE] Exception in getOrFetchBySlug:', error);
            return null;
        }
    }
}

declare global {
    // eslint-disable-next-line no-var
    var __footerStore: FooterStore | undefined;
}

export const footerStore = globalThis.__footerStore ?? new FooterStore();

if (process.env.NODE_ENV !== 'production') {
    globalThis.__footerStore = footerStore;
}
