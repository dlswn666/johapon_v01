import { supabase } from '@/app/_lib/shared/supabase/client';
import { Union } from '@/app/_lib/shared/type/database.types';

export const validateSlug = (slug: string): boolean => {
    // 영문 소문자, 숫자, 하이픈만 허용, 길이는 2자 이상
    const regex = /^[a-z0-9-]{2,}$/;
    return regex.test(slug);
};

export const getUnionBySlug = async (slug: string): Promise<Union | null> => {
    if (!slug) return null;

    const { data, error } = await supabase
        .from('unions')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error(`[slug.ts] ❌ Error fetching union for slug "${slug}":`, error);
        return null;
    }

    if (!data) {
        console.warn(`[slug.ts] ⚠️ No union found for slug "${slug}"`);
    }

    return data;
};

export const getUnionPath = (slug: string, path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${slug}${cleanPath}`;
};
