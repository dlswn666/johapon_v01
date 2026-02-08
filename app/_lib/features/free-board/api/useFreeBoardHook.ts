'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useFreeBoardStore from '@/app/_lib/features/free-board/model/useFreeBoardStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { FreeBoard, NewFreeBoard, UpdateFreeBoard } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { fileApi } from '@/app/_lib/shared/hooks/file/fileApi';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 자유 게시판 목록 조회 (검색, 페이지네이션 포함)
 */
export const useFreeBoards = (
    enabled: boolean = true,
    searchQuery: string = '',
    page: number = 1,
    limit: number = 10,
    sortBy: 'created_at' | 'views' = 'created_at'
) => {
    const setFreeBoards = useFreeBoardStore((state) => state.setFreeBoards);
    const setTotalCount = useFreeBoardStore((state) => state.setTotalCount);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['freeBoards', union?.id, searchQuery, page, limit, sortBy],
        queryFn: async () => {
            if (!union?.id) return { data: [], count: 0 };

            const offset = (page - 1) * limit;

            // 기본 쿼리 빌더
            let query = supabase
                .from('free_boards')
                .select('*, author:users!free_boards_author_id_fkey(id, name)', { count: 'exact' })
                .eq('union_id', union.id)
                .order(sortBy || 'created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            // 검색어가 있으면 필터 추가 (제목, 내용, 작성자)
            if (searchQuery.trim()) {
                const escaped = escapeLikeWildcards(searchQuery.trim());
                // 작성자 이름으로 검색하기 위해 먼저 users에서 일치하는 author_id 조회
                const { data: matchingAuthors } = await supabase
                    .from('users')
                    .select('id')
                    .ilike('name', `%${escaped}%`);

                const authorIds = matchingAuthors?.map(a => a.id) || [];

                if (authorIds.length > 0) {
                    // 제목, 내용, 또는 작성자 ID로 검색
                    query = query.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%,author_id.in.(${authorIds.join(',')})`);
                } else {
                    // 일치하는 작성자가 없으면 제목, 내용으로만 검색
                    query = query.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
                }
            }

            const { data: freeBoardsData, error: freeBoardsError, count } = await query;

            if (freeBoardsError) {
                throw freeBoardsError;
            }

            if (!freeBoardsData || freeBoardsData.length === 0) {
                return { data: [], count: 0 };
            }

            const freeBoardIds = freeBoardsData.map((f) => f.id);

            // 파일 수 조회 (다형성 연관 관계)
            const { data: fileCounts, error: filesError } = await supabase
                .from('files')
                .select('attachable_id')
                .eq('attachable_type', 'free_board')
                .in('attachable_id', freeBoardIds);

            if (filesError) {
                console.error('Failed to fetch file counts:', filesError);
            }

            // 파일 수 집계 (Map 사용으로 성능 최적화)
            const fileCountMap = new Map<number, number>();
            if (fileCounts) {
                for (const f of fileCounts) {
                    if (f.attachable_id) {
                        fileCountMap.set(f.attachable_id, (fileCountMap.get(f.attachable_id) || 0) + 1);
                    }
                }
            }

            // 댓글 수 조회
            const { data: commentCounts, error: commentsError } = await supabase
                .from('comments')
                .select('entity_id')
                .eq('entity_type', 'free_board')
                .in('entity_id', freeBoardIds);

            if (commentsError) {
                console.error('Failed to fetch comment counts:', commentsError);
            }

            // 댓글 수 집계 (Map 사용으로 성능 최적화)
            const commentCountMap = new Map<number, number>();
            if (commentCounts) {
                for (const c of commentCounts) {
                    commentCountMap.set(c.entity_id, (commentCountMap.get(c.entity_id) || 0) + 1);
                }
            }

            // 데이터에 파일 수, 댓글 수 병합 (Map.get() O(1) 조회)
            const freeBoardsWithCounts = freeBoardsData.map((freeBoard) => ({
                ...freeBoard,
                file_count: fileCountMap.get(freeBoard.id) || 0,
                comment_count: commentCountMap.get(freeBoard.id) || 0,
            }));

            return {
                data: freeBoardsWithCounts as (FreeBoard & {
                    author: { id: string; name: string } | null;
                    file_count: number;
                    comment_count: number;
                })[],
                count: count || 0,
            };
        },
        enabled: enabled && !!union?.id,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setFreeBoards(queryResult.data.data as unknown as FreeBoard[]);
            setTotalCount(queryResult.data.count);
        }
    }, [queryResult.data, queryResult.isSuccess, setFreeBoards, setTotalCount]);

    return queryResult;
};

/**
 * 특정 자유 게시글 상세 조회
 */
export const useFreeBoard = (freeBoardId: number | undefined, enabled: boolean = true) => {
    const setSelectedFreeBoard = useFreeBoardStore((state) => state.setSelectedFreeBoard);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['freeBoards', union?.id, freeBoardId],
        queryFn: async () => {
            if (!freeBoardId) throw new Error('FreeBoard ID is required');
            if (!union?.id) throw new Error('Union ID is required');

            const { data, error } = await supabase
                .from('free_boards')
                .select('*, author:users!free_boards_author_id_fkey(id, name)')
                .eq('id', freeBoardId)
                .eq('union_id', union.id)
                .single();

            if (error) {
                throw error;
            }

            return data as FreeBoard & { author: { id: string; name: string } | null };
        },
        enabled: !!freeBoardId && !!union?.id && enabled,
        retry: false,
        meta: {
            skipErrorToast: true,
        },
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedFreeBoard(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedFreeBoard]);

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
    freeBoardId: number
) => {
    let processedContent = content;

    for (const [blobUrl, file] of Object.entries(editorImages)) {
        if (processedContent.includes(blobUrl)) {
            try {
                const { publicUrl } = await fileApi.uploadImage(file, unionSlug, String(freeBoardId));
                processedContent = processedContent.replace(new RegExp(blobUrl, 'g'), publicUrl);
            } catch (e) {
                console.error(`Failed to upload editor image: ${file.name}`, e);
                // Remove the broken blob URL from content
                processedContent = processedContent.replace(
                    new RegExp(`<img[^>]*src=["']${blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*\\/?>`, 'g'),
                    ''
                );
            }
        }
    }
    return processedContent;
};

/**
 * 자유 게시글 등록
 */
export const useAddFreeBoard = () => {
    const router = useRouter();
    const addFreeBoard = useFreeBoardStore((state) => state.addFreeBoard);
    const editorImages = useFreeBoardStore((state) => state.editorImages);
    const clearEditorImages = useFreeBoardStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { confirmFiles, clearTempFiles } = useFileStore();
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async (newFreeBoard: NewFreeBoard) => {
            if (!union?.id) throw new Error('Union context missing');

            // 1. 게시글 우선 생성 (ID 확보)
            const freeBoardWithUnion = {
                ...newFreeBoard,
                union_id: union.id,
            };

            const { data: freeBoardData, error: freeBoardError } = await supabase
                .from('free_boards')
                .insert([freeBoardWithUnion])
                .select()
                .single();

            if (freeBoardError) throw freeBoardError;

            // 2. 에디터 이미지 업로드 및 본문 URL 치환
            const finalContent = await processEditorImages(
                newFreeBoard.content || '',
                editorImages,
                slug,
                freeBoardData.id
            );

            // 3. 본문 업데이트 (이미지 URL 치환된 경우)
            if (finalContent !== newFreeBoard.content) {
                const { error: updateError } = await supabase
                    .from('free_boards')
                    .update({ content: finalContent })
                    .eq('id', freeBoardData.id);

                if (updateError) console.error('Failed to update content with images', updateError);
                else freeBoardData.content = finalContent;
            }

            // 4. 첨부 파일 이관 (임시 -> 영구)
            await confirmFiles({
                targetId: String(freeBoardData.id),
                targetType: 'FREE_BOARD',
                unionSlug: slug,
                uploaderId: newFreeBoard.author_id,
            });

            return freeBoardData as FreeBoard;
        },
        onSuccess: (data) => {
            addFreeBoard(data);
            queryClient.invalidateQueries({ queryKey: ['freeBoards', union?.id] });

            clearTempFiles();
            clearEditorImages();

            openAlertModal({
                title: '등록 완료',
                message: '게시글이 성공적으로 등록되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, '/free-board');
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Add free board error:', error);
            openAlertModal({
                title: '등록 실패',
                message: '게시글 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 자유 게시글 수정
 */
export const useUpdateFreeBoard = () => {
    const router = useRouter();
    const updateFreeBoard = useFreeBoardStore((state) => state.updateFreeBoard);
    const editorImages = useFreeBoardStore((state) => state.editorImages);
    const clearEditorImages = useFreeBoardStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { confirmFiles, clearTempFiles } = useFileStore();
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async ({ id, updates, updatedAt }: { id: number; updates: UpdateFreeBoard; updatedAt?: string }) => {
            const finalUpdates = { ...updates };

            // 1. 에디터 이미지 업로드 및 본문 URL 치환
            if (updates.content) {
                finalUpdates.content = await processEditorImages(updates.content, editorImages, slug, id);
            }

            // 2. 게시글 업데이트
            let query = supabase
                .from('free_boards')
                .update(finalUpdates)
                .eq('id', id)
                .eq('union_id', union!.id);

            if (updatedAt) {
                query = query.eq('updated_at', updatedAt);
            }

            const { data, error } = await query.select().single();

            if (error?.code === 'PGRST116') {
                throw new Error('CONFLICT: 다른 사용자가 이 게시글을 수정했습니다. 페이지를 새로고침하여 최신 내용을 확인해주세요.');
            }
            if (error) throw error;

            // 3. 신규 첨부 파일이 있다면 이관
            await confirmFiles({
                targetId: String(id),
                targetType: 'FREE_BOARD',
                unionSlug: slug,
            });

            return data as FreeBoard;
        },
        onSuccess: (data) => {
            updateFreeBoard(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['freeBoards', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['freeBoards', union?.id, data.id] });

            clearTempFiles();
            clearEditorImages();

            openAlertModal({
                title: '수정 완료',
                message: '게시글이 성공적으로 수정되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, `/free-board/${data.id}`);
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Update free board error:', error);
            openAlertModal({
                title: '수정 실패',
                message: '게시글 수정에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 자유 게시글 삭제
 */
export const useDeleteFreeBoard = () => {
    const router = useRouter();
    const removeFreeBoard = useFreeBoardStore((state) => state.removeFreeBoard);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();
    const { user, isAdmin } = useAuth();

    return useMutation({
        mutationFn: async (freeBoardId: number) => {
            // 0. 삭제 전 관련 쿼리 취소
            await queryClient.cancelQueries({ queryKey: ['freeBoards', union?.id, freeBoardId] });
            await queryClient.cancelQueries({ queryKey: ['freeBoards', union?.id] });

            // 1. 소유권 사전 검증 (비관리자)
            if (!isAdmin && user?.id) {
                const { data: post, error: fetchError } = await supabase
                    .from('free_boards')
                    .select('author_id')
                    .eq('id', freeBoardId)
                    .single();

                if (fetchError || !post) {
                    throw new Error('게시글을 찾을 수 없습니다.');
                }
                if (post.author_id !== user.id) {
                    throw new Error('삭제 권한이 없습니다.');
                }
            }

            // 2. 폴더 및 하위 파일 전체 삭제 (Storage)
            const folderPath = `unions/${slug}/free-boards/${freeBoardId}`;
            await fileApi.deleteFolder(folderPath);

            // 3. DB 파일 레코드 삭제 (다형성 연관 관계)
            const { error: fileError } = await supabase
                .from('files')
                .delete()
                .eq('attachable_type', 'free_board')
                .eq('attachable_id', freeBoardId);

            if (fileError) {
                console.error('Failed to delete file records', fileError);
            }

            // 4. 댓글 삭제
            const { error: commentError } = await supabase
                .from('comments')
                .delete()
                .eq('entity_type', 'free_board')
                .eq('entity_id', freeBoardId);

            if (commentError) {
                console.error('Failed to delete comments', commentError);
            }

            // 5. 게시물 삭제 (비관리자는 본인 글만 삭제 가능 — 이중 안전장치)
            let deleteQuery = supabase.from('free_boards').delete().eq('id', freeBoardId);
            if (!isAdmin && user?.id) {
                deleteQuery = deleteQuery.eq('author_id', user.id);
            }
            const { error } = await deleteQuery;

            if (error) {
                throw error;
            }

            return freeBoardId;
        },
        onSuccess: (freeBoardId) => {
            removeFreeBoard(freeBoardId);

            queryClient.removeQueries({ queryKey: ['freeBoards', union?.id, freeBoardId] });
            queryClient.removeQueries({ queryKey: ['freeBoards', union?.id] });

            const path = getUnionPath(slug, '/free-board');
            router.push(path);

            openAlertModal({
                title: '삭제 완료',
                message: '게시글이 성공적으로 삭제되었습니다.',
                type: 'success',
            });
        },
        onError: (error: Error) => {
            console.error('Delete free board error:', error);
            openAlertModal({
                title: '삭제 실패',
                message: '게시글 삭제에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 조회수 증가
 */
export const useIncrementFreeBoardViews = () => {
    const incrementViews = useFreeBoardStore((state) => state.incrementViews);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async (freeBoardId: number) => {
            const { error } = await supabase.rpc('increment_free_board_views', {
                free_board_id: freeBoardId,
            });

            if (error) {
                throw error;
            }

            return freeBoardId;
        },
        onSuccess: (freeBoardId) => {
            incrementViews(freeBoardId);
            queryClient.invalidateQueries({ queryKey: ['freeBoards', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['freeBoards', union?.id, freeBoardId] });
        },
        onError: (error: Error) => {
            console.error('Increment views error:', error);
        },
    });
};






