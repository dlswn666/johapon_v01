import { getSupabaseClient } from '@/shared/lib/supabase';

export interface TenantInfo {
    id: string;
    homepage: string;
    name?: string | null;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
}

interface SupabaseUnionData {
    id: string;
    homepage: string;
    name: string | null;
    logo_url: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
}

interface CacheEntry {
    value: TenantInfo;
    expiresAt: number; // epoch ms
}

class TenantStore {
    private cacheBySlug: Map<string, CacheEntry> = new Map();
    private defaultTtlMs = 1000 * 60 * 30; // 30 minutes

    public set(slug: string, info: TenantInfo, ttlMs?: number): void {
        const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
        this.cacheBySlug.set(slug, { value: info, expiresAt });
    }

    public get(slug: string): TenantInfo | null {
        const entry = this.cacheBySlug.get(slug);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cacheBySlug.delete(slug);
            return null;
        }
        return entry.value;
    }

    public delete(slug: string): void {
        this.cacheBySlug.delete(slug);
    }

    public clear(): void {
        this.cacheBySlug.clear();
    }

    public async getOrFetchBySlug(slug: string): Promise<TenantInfo | null> {
        const cached = this.get(slug);
        if (cached) {
            return cached;
        }

        try {
            const supabase = getSupabaseClient();
            console.log('[TENANT_STORE] Fetching tenant data for slug:', slug);

            const { data, error } = await supabase
                .from('unions')
                .select('id, homepage, name, logo_url, address, phone, email')
                .eq('homepage', slug)
                .maybeSingle<SupabaseUnionData>();

            console.log('[TENANT_STORE] Query result:', { data, error });

            if (error) {
                console.error('[TENANT_STORE] Database error:', error);
                return null;
            }

            if (!data) {
                return null;
            }

            const info: TenantInfo = {
                id: data.id,
                homepage: data.homepage,
                name: data.name,
                logo_url: data.logo_url,
                address: data.address,
                phone: data.phone,
                email: data.email,
            };

            this.set(slug, info);
            return info;
        } catch (error) {
            console.error('[TENANT_STORE] Exception in getOrFetchBySlug:', error);
            return null;
        }
    }
}

declare global {
    // eslint-disable-next-line no-var
    var __tenantStore: TenantStore | undefined;
}

export const tenantStore: TenantStore = global.__tenantStore ?? new TenantStore();
if (!global.__tenantStore) {
    global.__tenantStore = tenantStore;
}

export async function getTenantIdBySlug(slug: string): Promise<string | null> {
    const info = await tenantStore.getOrFetchBySlug(slug);
    return info?.id ?? null;
}
