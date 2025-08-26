'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

// 정보공유방 디테일 정보 타입
export interface CommunityDetail {
    id: string;
    title: string;
    content: string;
    subcategory_id?: string;
    subcategory_name?: string;
    created_at: string;
    updated_at: string;
    views?: number;
    likes?: number;
    comments?: number;
    author_name?: string;
    author_id?: string;
    isLiked?: boolean;
}

// 서브카테고리 타입
export interface Subcategory {
    id: string;
    name: string;
}

// 정보공유방 업데이트 데이터 타입
export interface CommunityUpdateData {
    title?: string;
    content?: string;
    subcategory_id?: string;
}

// 훅 반환 타입
export interface UseCommunityDetailReturn {
    community: CommunityDetail | null;
    subcategories: Subcategory[];
    loading: boolean;
    error: string | null;
    updateCommunity: (data: CommunityUpdateData) => Promise<boolean>;
    updating: boolean;
    refresh: () => Promise<void>;
}

// DB 데이터를 CommunityDetail로 변환하는 함수
function transformDbCommunityToDetail(dbCommunity: any): CommunityDetail {
    return {
        id: String(dbCommunity.id),
        title: dbCommunity.title,
        content: dbCommunity.content,
        subcategory_id: dbCommunity.subcategory_id,
        subcategory_name: dbCommunity.subcategory?.name,
        created_at: dbCommunity.created_at,
        updated_at: dbCommunity.updated_at,
        views: dbCommunity.views || 0,
        likes: dbCommunity.likes || 0,
        comments: dbCommunity.comments || 0,
        author_name: dbCommunity.author?.name || '익명',
        author_id: dbCommunity.author_id,
        isLiked: dbCommunity.isLiked || false,
    };
}

export function useCommunityDetail(): UseCommunityDetailReturn {
    const params = useParams();
    const homepage = params?.homepage as string;
    const communityId = params?.id as string;

    const [community, setCommunity] = useState<CommunityDetail | null>(null);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 서브카테고리 조회
    const fetchMeta = useCallback(async () => {
        if (!homepage) return;

        try {
            const response = await fetch(`/api/tenant/${homepage}/subcategories?category=community`);
            if (response.ok) {
                const responseData = await response.json();
                setSubcategories(
                    responseData.data?.map((sub: any) => ({
                        id: sub.id,
                        name: sub.name,
                    })) || []
                );
            }
        } catch (err) {
            console.error('서브카테고리 가져오기 실패:', err);
            // 오류 시 기본값 설정
            setSubcategories([
                { id: 'general', name: '일반토론' },
                { id: 'info', name: '정보공유' },
                { id: 'review', name: '모임후기' },
            ]);
        }
    }, [homepage]);

    // 정보공유방 상세 정보 조회
    const fetchCommunity = useCallback(async () => {
        if (!homepage || !communityId) {
            setError('필요한 정보가 없습니다.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/tenant/${homepage}/community/${communityId}`);

            if (!response.ok) {
                throw new Error('게시글을 불러오는데 실패했습니다.');
            }

            const responseData = await response.json();

            if (responseData.success && responseData.data) {
                const transformedData = transformDbCommunityToDetail(responseData.data);
                setCommunity(transformedData);
            } else {
                throw new Error(responseData.message || '게시글을 찾을 수 없습니다.');
            }
        } catch (err) {
            console.error('정보공유방 로딩 실패:', err);
            setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            setCommunity(null);
        } finally {
            setLoading(false);
        }
    }, [homepage, communityId]);

    // 정보공유방 수정
    const updateCommunity = useCallback(
        async (updateData: CommunityUpdateData): Promise<boolean> => {
            if (!homepage || !communityId) {
                setError('필요한 정보가 없습니다.');
                return false;
            }

            try {
                setUpdating(true);
                setError(null);

                const response = await fetch(`/api/tenant/${homepage}/community/${communityId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer temp-token', // 임시 토큰
                    },
                    body: JSON.stringify(updateData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '게시글 수정에 실패했습니다.');
                }

                const responseData = await response.json();

                if (responseData.success) {
                    // 수정된 데이터로 상태 업데이트
                    await fetchCommunity();
                    return true;
                } else {
                    throw new Error(responseData.message || '게시글 수정에 실패했습니다.');
                }
            } catch (err) {
                console.error('정보공유방 수정 실패:', err);
                setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
                return false;
            } finally {
                setUpdating(false);
            }
        },
        [homepage, communityId, fetchCommunity]
    );

    // 새로고침
    const refresh = useCallback(async () => {
        await Promise.all([fetchMeta(), fetchCommunity()]);
    }, [fetchMeta, fetchCommunity]);

    // 초기 데이터 로드
    useEffect(() => {
        Promise.all([fetchMeta(), fetchCommunity()]);
    }, [fetchMeta, fetchCommunity]);

    return {
        community,
        subcategories,
        loading,
        error,
        updateCommunity,
        updating,
        refresh,
    };
}
