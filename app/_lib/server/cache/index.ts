import { cache } from 'react';
import { createClient } from '@/app/_lib/shared/supabase/server';

/**
 * 조합 정보 캐시
 * 동일 요청 내에서 같은 slug에 대한 중복 DB 쿼리 방지
 */
export const getCachedUnion = cache(async (slug: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase.from('unions').select('*').eq('slug', slug).single();

    if (error) {
        console.error('[Cache] Error fetching union:', error);
        return null;
    }

    return data;
});

/**
 * 조합 ID로 조합 정보 캐시
 */
export const getCachedUnionById = cache(async (unionId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase.from('unions').select('*').eq('id', unionId).single();

    if (error) {
        console.error('[Cache] Error fetching union by id:', error);
        return null;
    }

    return data;
});

/**
 * 사용자 프로필 캐시 (auth_user_id 기반)
 */
export const getCachedUserByAuthId = cache(async (authUserId: string, unionId?: string) => {
    const supabase = await createClient();

    // 1. user_auth_links에서 연결된 user_id들 조회
    const { data: links, error: linksError } = await supabase
        .from('user_auth_links')
        .select('user_id')
        .eq('auth_user_id', authUserId);

    if (linksError || !links || links.length === 0) {
        return null;
    }

    const userIds = links.map((l) => l.user_id);

    // 2. 해당 조합의 사용자 조회
    let query = supabase.from('users').select('*').in('id', userIds);

    if (unionId) {
        query = query.eq('union_id', unionId);
    }

    const { data: user, error: userError } = await query.maybeSingle();

    if (userError) {
        console.error('[Cache] Error fetching user:', userError);
        return null;
    }

    return user;
});

/**
 * 동의 단계 목록 캐시
 */
export const getCachedConsentStages = cache(async (unionId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('consent_stages')
        .select('*')
        .eq('union_id', unionId)
        .order('order', { ascending: true });

    if (error) {
        console.error('[Cache] Error fetching consent stages:', error);
        return [];
    }

    return data || [];
});

/**
 * 공지사항 카테고리 캐시
 */
export const getCachedNoticeCategories = cache(async (unionId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('notice_categories')
        .select('*')
        .eq('union_id', unionId)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[Cache] Error fetching categories:', error);
        return [];
    }

    return data || [];
});
