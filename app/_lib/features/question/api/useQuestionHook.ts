'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useQuestionStore from '@/app/_lib/features/question/model/useQuestionStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { Question, NewQuestion, UpdateQuestion } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { fileApi } from '@/app/_lib/shared/hooks/file/fileApi';
import { sendQuestionRegisteredAlimTalk, sendQuestionAnsweredAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 질문 목록 조회 (내 글 최상단, 비밀글 필터링, 검색 기능)
 */
export const useQuestions = (
    enabled: boolean = true,
    searchQuery?: string
) => {
    const setQuestions = useQuestionStore((state) => state.setQuestions);
    const { union } = useSlug();
    const { user, isAdmin } = useAuth();

    const queryResult = useQuery({
        queryKey: ['questions', union?.id, searchQuery],
        queryFn: async () => {
            if (!union?.id) return [];

            let query = supabase
                .from('questions')
                .select('*, author:users!questions_author_id_fkey(id, name), answer_author:users!questions_answer_author_id_fkey(id, name)')
                .eq('union_id', union.id);

            // 검색 조건 적용 (제목, 내용, 작성자명)
            if (searchQuery && searchQuery.trim()) {
                const search = `%${searchQuery.trim()}%`;
                query = query.or(`title.ilike.${search},content.ilike.${search}`);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            // 비밀글 필터링 (관리자이거나 본인 글만 표시)
            let filteredData = data;
            if (!isAdmin) {
                filteredData = data.filter((q) => {
                    if (!q.is_secret) return true; // 공개글은 모두 표시
                    return q.author_id === user?.id; // 비밀글은 본인 글만
                });
            }

            // 검색어로 작성자명 검색 시 추가 필터링
            if (searchQuery && searchQuery.trim()) {
                const search = searchQuery.trim().toLowerCase();
                filteredData = filteredData.filter((q) => {
                    const authorName = (q.author as { name: string } | null)?.name?.toLowerCase() || '';
                    return (
                        q.title.toLowerCase().includes(search) ||
                        q.content.toLowerCase().includes(search) ||
                        authorName.includes(search)
                    );
                });
            }

            // 내 글 최상단 정렬 (로그인 시)
            if (user?.id) {
                filteredData.sort((a, b) => {
                    const aIsMine = a.author_id === user.id ? 1 : 0;
                    const bIsMine = b.author_id === user.id ? 1 : 0;
                    if (aIsMine !== bIsMine) {
                        return bIsMine - aIsMine; // 내 글 먼저
                    }
                    // 같은 그룹 내에서는 최신순
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
            }

            return filteredData as (Question & {
                author: { id: string; name: string } | null;
                answer_author: { id: string; name: string } | null;
            })[];
        },
        enabled: enabled && !!union?.id,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setQuestions(queryResult.data as unknown as Question[]);
        }
    }, [queryResult.data, queryResult.isSuccess, setQuestions]);

    return queryResult;
};

/**
 * 특정 질문 상세 조회 (권한 체크 포함)
 */
export const useQuestion = (questionId: number | undefined, enabled: boolean = true) => {
    const setSelectedQuestion = useQuestionStore((state) => state.setSelectedQuestion);
    const { union } = useSlug();
    const { user, isAdmin } = useAuth();

    const queryResult = useQuery({
        queryKey: ['questions', union?.id, questionId],
        queryFn: async () => {
            if (!questionId) throw new Error('Question ID is required');
            if (!union?.id) throw new Error('Union ID is required');

            const { data, error } = await supabase
                .from('questions')
                .select('*, author:users!questions_author_id_fkey(id, name), answer_author:users!questions_answer_author_id_fkey(id, name)')
                .eq('id', questionId)
                .eq('union_id', union.id)
                .single();

            if (error) {
                throw error;
            }

            // 비밀글 접근 권한 체크
            if (data.is_secret) {
                const canAccess = isAdmin || data.author_id === user?.id;
                if (!canAccess) {
                    throw new Error('비밀글에 대한 접근 권한이 없습니다.');
                }
            }

            return data as Question & {
                author: { id: string; name: string } | null;
                answer_author: { id: string; name: string } | null;
            };
        },
        enabled: !!questionId && !!union?.id && enabled,
        retry: false,
        meta: {
            skipErrorToast: true,
        },
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedQuestion(queryResult.data as unknown as Question);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedQuestion]);

    return queryResult;
};

// ============================================
// Mutation Hooks (변경)
// ============================================

// Helper: 에디터 이미지 업로드 및 본문 치환
const processEditorImages = async (
    content: string,
    editorImages: Record<string, File>,
    unionSlug: string,
    questionId: number
) => {
    let processedContent = content;

    for (const [blobUrl, file] of Object.entries(editorImages)) {
        if (processedContent.includes(blobUrl)) {
            try {
                const { publicUrl } = await fileApi.uploadImage(file, unionSlug, `question_${questionId}`);
                processedContent = processedContent.replace(new RegExp(blobUrl, 'g'), publicUrl);
            } catch (e) {
                console.error(`Failed to upload editor image: ${file.name}`, e);
            }
        }
    }
    return processedContent;
};

/**
 * 질문 등록 + 관리자에게 알림톡 발송
 */
export const useAddQuestion = () => {
    const router = useRouter();
    const addQuestion = useQuestionStore((state) => state.addQuestion);
    const editorImages = useQuestionStore((state) => state.editorImages);
    const clearEditorImages = useQuestionStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (newQuestion: NewQuestion) => {
            if (!union?.id) throw new Error('Union context missing');

            const questionWithUnion = {
                ...newQuestion,
                union_id: union.id,
            };

            // 1. 질문 우선 생성 (ID 확보)
            const { data: questionData, error: questionError } = await supabase
                .from('questions')
                .insert([questionWithUnion])
                .select()
                .single();

            if (questionError) throw questionError;

            // 2. 에디터 이미지 업로드 및 본문 URL 치환
            const finalContent = await processEditorImages(newQuestion.content || '', editorImages, slug, questionData.id);

            // 3. 본문 업데이트 (이미지 URL 치환된 경우)
            if (finalContent !== newQuestion.content) {
                const { error: updateError } = await supabase
                    .from('questions')
                    .update({ content: finalContent })
                    .eq('id', questionData.id);

                if (updateError) console.error('Failed to update content with images', updateError);
                else questionData.content = finalContent;
            }

            // 4. 관리자들에게 알림톡 발송
            try {
                await sendQuestionRegisteredAlimTalk({
                    unionId: union.id,
                    unionSlug: slug,
                    unionName: union.name,
                    questionId: questionData.id,
                    questionTitle: questionData.title,
                    authorName: user?.name || '회원',
                    createdAt: questionData.created_at,
                });
            } catch (alimTalkError) {
                console.error('알림톡 발송 실패 (질문 등록):', alimTalkError);
                // 알림톡 발송 실패해도 질문 등록은 성공으로 처리
            }

            return questionData as Question;
        },
        onSuccess: (data) => {
            addQuestion(data);
            queryClient.invalidateQueries({ queryKey: ['questions', union?.id] });

            clearEditorImages();

            openAlertModal({
                title: '등록 완료',
                message: '질문이 성공적으로 등록되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, '/news/qna');
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Add question error:', error);
            openAlertModal({
                title: '등록 실패',
                message: '질문 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 질문 수정
 */
export const useUpdateQuestion = () => {
    const router = useRouter();
    const updateQuestion = useQuestionStore((state) => state.updateQuestion);
    const editorImages = useQuestionStore((state) => state.editorImages);
    const clearEditorImages = useQuestionStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: UpdateQuestion }) => {
            const finalUpdates = { ...updates };

            // 1. 에디터 이미지 업로드 및 본문 URL 치환
            if (updates.content) {
                finalUpdates.content = await processEditorImages(updates.content, editorImages, slug, id);
            }

            // 2. 질문 업데이트
            const { data, error } = await supabase
                .from('questions')
                .update(finalUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data as Question;
        },
        onSuccess: (data) => {
            updateQuestion(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['questions', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['questions', union?.id, data.id] });

            clearEditorImages();

            openAlertModal({
                title: '수정 완료',
                message: '질문이 성공적으로 수정되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, `/news/qna/${data.id}`);
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Update question error:', error);
            openAlertModal({
                title: '수정 실패',
                message: '질문 수정에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 질문 삭제
 */
export const useDeleteQuestion = () => {
    const router = useRouter();
    const removeQuestion = useQuestionStore((state) => state.removeQuestion);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async (questionId: number) => {
            // 진행 중인 쿼리 취소
            await queryClient.cancelQueries({ queryKey: ['questions', union?.id, questionId] });
            await queryClient.cancelQueries({ queryKey: ['questions', union?.id] });

            // 1. 스토리지에서 관련 이미지 파일 삭제
            const folderPath = `unions/${slug}/questions/${questionId}`;
            await fileApi.deleteFolder(folderPath);

            // 2. 질문 삭제
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', questionId);

            if (error) {
                throw error;
            }

            return questionId;
        },
        onSuccess: (questionId) => {
            removeQuestion(questionId);

            queryClient.removeQueries({ queryKey: ['questions', union?.id, questionId] });
            queryClient.removeQueries({ queryKey: ['questions', union?.id] });

            const path = getUnionPath(slug, '/news/qna');
            router.push(path);

            openAlertModal({
                title: '삭제 완료',
                message: '질문이 성공적으로 삭제되었습니다.',
                type: 'success',
            });
        },
        onError: (error: Error) => {
            console.error('Delete question error:', error);
            openAlertModal({
                title: '삭제 실패',
                message: '질문 삭제에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 관리자 답변 등록 + 질문자에게 알림톡 발송
 */
export const useAnswerQuestion = () => {
    const updateQuestion = useQuestionStore((state) => state.updateQuestion);
    const answerEditorImages = useQuestionStore((state) => state.answerEditorImages);
    const clearAnswerEditorImages = useQuestionStore((state) => state.clearAnswerEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ questionId, answerContent }: { questionId: number; answerContent: string }) => {
            if (!user?.id) throw new Error('로그인이 필요합니다.');
            if (!union?.id) throw new Error('Union context missing');

            // 1. 에디터 이미지 업로드 및 본문 URL 치환
            const finalContent = await processEditorImages(answerContent, answerEditorImages, slug, questionId);

            const answeredAt = new Date().toISOString();

            // 2. 답변 저장
            const { data, error } = await supabase
                .from('questions')
                .update({
                    answer_content: finalContent,
                    answer_author_id: user.id,
                    answered_at: answeredAt,
                })
                .eq('id', questionId)
                .select()
                .single();

            if (error) throw error;

            // 3. 질문자에게 알림톡 발송
            try {
                await sendQuestionAnsweredAlimTalk({
                    unionId: union.id,
                    unionSlug: slug,
                    unionName: union.name,
                    questionId: data.id,
                    questionTitle: data.title,
                    authorId: data.author_id,
                    answeredAt: answeredAt,
                });
            } catch (alimTalkError) {
                console.error('알림톡 발송 실패 (답변 등록):', alimTalkError);
                // 알림톡 발송 실패해도 답변 등록은 성공으로 처리
            }

            return data as Question;
        },
        onSuccess: (data) => {
            updateQuestion(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['questions', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['questions', union?.id, data.id] });

            clearAnswerEditorImages();

            openAlertModal({
                title: '답변 완료',
                message: '답변이 성공적으로 등록되었습니다.',
                type: 'success',
            });
        },
        onError: (error: Error) => {
            console.error('Answer question error:', error);
            openAlertModal({
                title: '답변 실패',
                message: '답변 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 조회수 증가
 */
export const useIncrementQuestionViews = () => {
    const incrementViews = useQuestionStore((state) => state.incrementViews);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async (questionId: number) => {
            const { error } = await supabase.rpc('increment_question_views', {
                question_id: questionId,
            });

            if (error) {
                throw error;
            }

            return questionId;
        },
        onSuccess: (questionId) => {
            incrementViews(questionId);
            queryClient.invalidateQueries({ queryKey: ['questions', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['questions', union?.id, questionId] });
        },
        onError: (error: Error) => {
            console.error('Increment views error:', error);
        },
    });
};

