'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

// Q&A 디테일 정보 타입
export interface QnADetail {
    id: string;
    title: string;
    content: string;
    subcategory_id?: string;
    subcategory_name?: string;
    status: 'pending' | 'answered';
    created_at: string;
    updated_at: string;
    views?: number;
    author_name?: string;
    author_id?: string;
    answer?: string;
    answered_at?: string;
    answered_by?: string;
}

// 서브카테고리 타입
export interface Subcategory {
    id: string;
    name: string;
}

// Q&A 업데이트 데이터 타입
export interface QnAUpdateData {
    title?: string;
    content?: string;
    subcategory_id?: string;
    answer?: string;
}

// 훅 반환 타입
export interface UseQnADetailReturn {
    qna: QnADetail | null;
    subcategories: Subcategory[];
    loading: boolean;
    error: string | null;
    updateQnA: (data: QnAUpdateData) => Promise<boolean>;
    updating: boolean;
    refresh: () => Promise<void>;
}

// DB 데이터를 QnADetail로 변환하는 함수
function transformDbQnAToDetail(dbQnA: any): QnADetail {
    return {
        id: String(dbQnA.id),
        title: dbQnA.title,
        content: dbQnA.content,
        subcategory_id: dbQnA.subcategory_id,
        subcategory_name: dbQnA.subcategory?.name,
        status: dbQnA.status,
        created_at: dbQnA.created_at,
        updated_at: dbQnA.updated_at,
        views: dbQnA.views || 0,
        author_name: dbQnA.author?.name || '익명',
        author_id: dbQnA.author_id,
        answer: dbQnA.answer,
        answered_at: dbQnA.answered_at,
        answered_by: dbQnA.answerer?.name,
    };
}

export function useQnADetail(): UseQnADetailReturn {
    const params = useParams();
    const homepage = params?.homepage as string;
    const qnaId = params?.id as string;

    const [qna, setQnA] = useState<QnADetail | null>(null);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 서브카테고리 조회
    const fetchMeta = useCallback(async () => {
        if (!homepage) return;

        try {
            const response = await fetch(`/api/tenant/${homepage}/subcategories?category=qna`);
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
                { id: 'general', name: '일반문의' },
                { id: 'facility', name: '시설문의' },
                { id: 'management', name: '관리문의' },
            ]);
        }
    }, [homepage]);

    // Q&A 상세 정보 조회
    const fetchQnA = useCallback(async () => {
        if (!homepage || !qnaId) {
            setError('필요한 정보가 없습니다.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/tenant/${homepage}/qna/${qnaId}`);

            if (!response.ok) {
                throw new Error('Q&A를 불러오는데 실패했습니다.');
            }

            const responseData = await response.json();

            if (responseData.success && responseData.data) {
                const transformedData = transformDbQnAToDetail(responseData.data);
                setQnA(transformedData);
            } else {
                throw new Error(responseData.message || 'Q&A를 찾을 수 없습니다.');
            }
        } catch (err) {
            console.error('Q&A 로딩 실패:', err);
            setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            setQnA(null);
        } finally {
            setLoading(false);
        }
    }, [homepage, qnaId]);

    // Q&A 수정
    const updateQnA = useCallback(
        async (updateData: QnAUpdateData): Promise<boolean> => {
            if (!homepage || !qnaId) {
                setError('필요한 정보가 없습니다.');
                return false;
            }

            try {
                setUpdating(true);
                setError(null);

                const response = await fetch(`/api/tenant/${homepage}/qna/${qnaId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer temp-token', // 임시 토큰
                    },
                    body: JSON.stringify(updateData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Q&A 수정에 실패했습니다.');
                }

                const responseData = await response.json();

                if (responseData.success) {
                    // 수정된 데이터로 상태 업데이트
                    await fetchQnA();
                    return true;
                } else {
                    throw new Error(responseData.message || 'Q&A 수정에 실패했습니다.');
                }
            } catch (err) {
                console.error('Q&A 수정 실패:', err);
                setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
                return false;
            } finally {
                setUpdating(false);
            }
        },
        [homepage, qnaId, fetchQnA]
    );

    // 새로고침
    const refresh = useCallback(async () => {
        await Promise.all([fetchMeta(), fetchQnA()]);
    }, [fetchMeta, fetchQnA]);

    // 초기 데이터 로드
    useEffect(() => {
        Promise.all([fetchMeta(), fetchQnA()]);
    }, [fetchMeta, fetchQnA]);

    return {
        qna,
        subcategories,
        loading,
        error,
        updateQnA,
        updating,
        refresh,
    };
}
