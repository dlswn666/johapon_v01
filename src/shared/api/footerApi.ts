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

export const footerApi = {
    async fetchFooterInfo(slug: string): Promise<FooterInfo | null> {
        try {
            const supabase = getSupabaseClient();
            console.log('[FOOTER_API] Fetching footer data for slug:', slug);

            const { data, error } = await supabase
                .from('unions')
                .select('id, homepage, name, address, phone, email, union_chairman, area, union_members')
                .eq('homepage', slug)
                .maybeSingle<SupabaseUnionFooterData>();

            console.log('[FOOTER_API] Query result:', { data, error });

            if (error) {
                console.error('[FOOTER_API] Database error:', error);
                throw new Error(`Footer 정보 조회 실패: ${error.message}`);
            }

            if (!data) {
                return null;
            }

            // 데이터 변환 로직
            const footerInfo: FooterInfo = {
                associationName: data.name || `${slug} 구역`,
                associationSubtitle: '주택재개발정비사업조합',
                contact: {
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                },
                business: {
                    businessPhone: data.phone || '',
                    webmasterEmail: data.email || '',
                },
                chairman: data.union_chairman || undefined,
                area: data.area || undefined,
                members: data.union_members || undefined,
            };

            return footerInfo;
        } catch (error) {
            console.error('[FOOTER_API] Exception in fetchFooterInfo:', error);
            throw error;
        }
    },
};