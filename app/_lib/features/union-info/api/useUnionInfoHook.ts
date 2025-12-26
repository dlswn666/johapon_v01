'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useUnionInfoStore from '@/app/_lib/features/union-info/model/useUnionInfoStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { UnionInfo, NewUnionInfo, UpdateUnionInfo, UnionInfoWithFiles, UnionInfoWithAuthor } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { fileApi } from '@/app/_lib/shared/hooks/file/fileApi';

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 조합 정보 목록 조회 (필터링, 페이징)
 */
export const useUnionInfos = (enabled: boolean = true) => {
    const setPosts = useUnionInfoStore((state) => state.setPosts);
    const setTotalCount = useUnionInfoStore((state) => state.setTotalCount);
    const keyword = useUnionInfoStore((state) => state.filters.keyword);
    const author = useUnionInfoStore((state) => state.filters.author);
    const page = useUnionInfoStore((state) => state.filters.page);
    const pageSize = useUnionInfoStore((state) => state.filters.pageSize);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['union-info', 'list', union?.id, keyword, author, page, pageSize],
        queryFn: async () => {
            if (!union?.id) return { data: [], count: 0 };

            let query = supabase
                .from('union_info')
                .select('*, author:users!union_info_author_id_fkey(id, name)', { count: 'exact' })
                .eq('union_id', union.id);

            // 키워드 검색 (제목/내용)
            if (keyword && keyword.trim()) {
                const search = `%${keyword.trim()}%`;
                query = query.or(`title.ilike.${search},content.ilike.${search}`);
            }

            // 정렬
            query = query.order('created_at', { ascending: false });

            // 페이징
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return { data: [], count: 0 };
            }

            const postIds = data.map((p) => p.id);

            // 파일 수 조회 (다형성 연관 관계)
            const { data: fileCounts, error: filesError } = await supabase
                .from('files')
                .select('attachable_id')
                .eq('attachable_type', 'union_info')
                .in('attachable_id', postIds);

            if (filesError) {
                console.error('Failed to fetch file counts:', filesError);
            }

            // 파일 수 집계
            const fileCountMap: Record<number, number> = {};
            if (fileCounts) {
                fileCounts.forEach((f) => {
                    if (f.attachable_id) {
                        fileCountMap[f.attachable_id] = (fileCountMap[f.attachable_id] || 0) + 1;
                    }
                });
            }

            // 댓글 수 조회
            const { data: commentCounts, error: commentsError } = await supabase
                .from('comments')
                .select('entity_id')
                .eq('entity_type', 'union_info')
                .in('entity_id', postIds);

            if (commentsError) {
                console.error('Failed to fetch comment counts:', commentsError);
            }

            // 댓글 수 집계
            const commentCountMap: Record<number, number> = {};
            if (commentCounts) {
                commentCounts.forEach((c) => {
                    commentCountMap[c.entity_id] = (commentCountMap[c.entity_id] || 0) + 1;
                });
            }

            let filteredData = data.map((post) => ({
                ...post,
                file_count: fileCountMap[post.id] || 0,
                comment_count: commentCountMap[post.id] || 0,
            }));

            // 작성자 검색 (프론트에서 추가 필터링)
            if (author && author.trim()) {
                const authorSearch = author.trim().toLowerCase();
                filteredData = filteredData.filter((item) => {
                    const authorName = (item.author as { name: string } | null)?.name?.toLowerCase() || '';
                    return authorName.includes(authorSearch);
                });
            }

            return {
                data: filteredData as (UnionInfoWithAuthor & {
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
            setPosts(queryResult.data.data as unknown as UnionInfo[]);
            setTotalCount(queryResult.data.count);
        }
    }, [queryResult.data, queryResult.isSuccess, setPosts, setTotalCount]);

    return queryResult;
};

/**
 * 특정 조합 정보 상세 조회 (파일 포함)
 */
export const useUnionInfo = (postId: number | undefined, enabled: boolean = true) => {
    const setSelectedPost = useUnionInfoStore((state) => state.setSelectedPost);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['union-info', 'detail', postId],
        queryFn: async () => {
            if (!postId) throw new Error('Post ID is required');
            if (!union?.id) throw new Error('Union ID is required');

            // 1. 게시글 조회
            const { data: post, error: postError } = await supabase
                .from('union_info')
                .select('*, author:users!union_info_author_id_fkey(id, name)')
                .eq('id', postId)
                .eq('union_id', union.id)
                .single();

            if (postError) {
                throw postError;
            }

            // 2. 첨부파일 조회 (다형성 연관 관계)
            const { data: files, error: filesError } = await supabase
                .from('files')
                .select('*')
                .eq('attachable_type', 'union_info')
                .eq('attachable_id', postId)
                .order('created_at', { ascending: true });

            if (filesError) {
                console.error('Files fetch error:', filesError);
            }

            return {
                ...post,
                files: files || [],
            } as UnionInfoWithFiles & { author: { id: string; name: string } | null };
        },
        enabled: !!postId && !!union?.id && enabled,
        retry: false,
        meta: {
            skipErrorToast: true,
        },
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedPost(queryResult.data as UnionInfoWithFiles);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedPost]);

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
    postId: number
) => {
    let processedContent = content;

    for (const [blobUrl, file] of Object.entries(editorImages)) {
        if (processedContent.includes(blobUrl)) {
            try {
                const { publicUrl } = await fileApi.uploadImage(file, unionSlug, `union_info_${postId}`);
                processedContent = processedContent.replace(new RegExp(blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), publicUrl);
            } catch (e) {
                console.error(`Failed to upload editor image: ${file.name}`, e);
            }
        }
    }
    return processedContent;
};

/**
 * 조합 정보 등록
 */
export const useAddUnionInfo = () => {
    const router = useRouter();
    const addPost = useUnionInfoStore((state) => state.addPost);
    const editorImages = useUnionInfoStore((state) => state.editorImages);
    const { confirmFiles, clearTempFiles } = useFileStore();
    const clearEditorImages = useUnionInfoStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (newPost: NewUnionInfo) => {
            if (!union?.id) throw new Error('Union context missing');
            if (!user?.id) throw new Error('User context missing');

            const postWithUnion = {
                ...newPost,
                union_id: union.id,
                author_id: user.id,
            };

            // 1. 게시글 우선 생성 (ID 확보)
            const { data: postData, error: postError } = await supabase
                .from('union_info')
                .insert([postWithUnion])
                .select()
                .single();

            if (postError) throw postError;

            // 2. 에디터 이미지 업로드 및 본문 URL 치환
            const finalContent = await processEditorImages(newPost.content || '', editorImages, slug, postData.id);

            // 3. 첨부파일 확정 (임시 -> 영구)
            await confirmFiles({
                targetId: String(postData.id),
                targetType: 'UNION_INFO',
                unionSlug: slug,
                uploaderId: user.id,
            });

            // 4. 본문 업데이트
            const needsUpdate = finalContent !== newPost.content;
            if (needsUpdate) {
                const { error: updateError } = await supabase
                    .from('union_info')
                    .update({
                        content: finalContent,
                    })
                    .eq('id', postData.id);

                if (updateError) console.error('Failed to update content', updateError);
                else {
                    postData.content = finalContent;
                }
            }

            return postData as UnionInfo;
        },
        onSuccess: (data) => {
            addPost(data);
            queryClient.invalidateQueries({ queryKey: ['union-info', 'list', union?.id] });

            clearEditorImages();
            clearTempFiles();

            openAlertModal({
                title: '등록 완료',
                message: '게시글이 성공적으로 등록되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, '/communication/union-info');
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Add union info error:', error);
            openAlertModal({
                title: '등록 실패',
                message: '게시글 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 조합 정보 수정
 */
export const useUpdateUnionInfo = () => {
    const router = useRouter();
    const updatePost = useUnionInfoStore((state) => state.updatePost);
    const editorImages = useUnionInfoStore((state) => state.editorImages);
    const { confirmFiles, clearTempFiles } = useFileStore();
    const clearEditorImages = useUnionInfoStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: UpdateUnionInfo }) => {
            const finalUpdates = { ...updates };

            // 1. 에디터 이미지 업로드 및 본문 URL 치환
            if (updates.content) {
                finalUpdates.content = await processEditorImages(updates.content, editorImages, slug, id);
            }

            // 2. 새 첨부파일 확정 (임시 -> 영구)
            await confirmFiles({
                targetId: String(id),
                targetType: 'UNION_INFO',
                unionSlug: slug,
                uploaderId: user?.id,
            });

            // Note: has_attachments flag could be updated via a trigger or manually if needed, 
            // but for consistency with free-board, we might not need to manually check here if we refresh detail.

            // 4. 게시글 업데이트
            const { data, error } = await supabase
                .from('union_info')
                .update(finalUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data as UnionInfo;
        },
        onSuccess: (data) => {
            updatePost(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['union-info', 'list', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['union-info', 'detail', data.id] });

            clearEditorImages();
            clearTempFiles();

            openAlertModal({
                title: '수정 완료',
                message: '게시글이 성공적으로 수정되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, `/communication/union-info/${data.id}`);
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Update union info error:', error);
            openAlertModal({
                title: '수정 실패',
                message: '게시글 수정에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 조합 정보 삭제
 */
export const useDeleteUnionInfo = () => {
    const router = useRouter();
    const removePost = useUnionInfoStore((state) => state.removePost);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async (postId: number) => {
            // 진행 중인 쿼리 취소
            await queryClient.cancelQueries({ queryKey: ['union-info', 'detail', postId] });
            await queryClient.cancelQueries({ queryKey: ['union-info', 'list', union?.id] });

            // 1. 첨부파일 삭제 (DB + Storage) - 다형성 연관 관계
            const { data: files } = await supabase
                .from('files')
                .select('id, path')
                .eq('attachable_type', 'union_info')
                .eq('attachable_id', postId);

            if (files && files.length > 0) {
                for (const file of files) {
                    try {
                        await fileApi.deleteFile(file.id, file.path);
                    } catch (e) {
                        console.error('File delete error:', e);
                    }
                }
            }

            // 2. 스토리지에서 관련 이미지 파일 삭제
            const folderPath = `unions/${slug}/union_info/${postId}`;
            await fileApi.deleteFolder(folderPath);

            // 3. 게시글 삭제
            const { error } = await supabase.from('union_info').delete().eq('id', postId);

            if (error) {
                throw error;
            }

            return postId;
        },
        onSuccess: (postId) => {
            removePost(postId);

            queryClient.removeQueries({ queryKey: ['union-info', 'detail', postId] });
            queryClient.removeQueries({ queryKey: ['union-info', 'list', union?.id] });

            const path = getUnionPath(slug, '/communication/union-info');
            router.push(path);

            openAlertModal({
                title: '삭제 완료',
                message: '게시글이 성공적으로 삭제되었습니다.',
                type: 'success',
            });
        },
        onError: (error: Error) => {
            console.error('Delete union info error:', error);
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
export const useIncrementUnionInfoViews = () => {
    const incrementViews = useUnionInfoStore((state) => state.incrementViews);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async (postId: number) => {
            const { error } = await supabase.rpc('increment_union_info_views', {
                p_union_info_id: postId,
            });

            if (error) {
                throw error;
            }

            return postId;
        },
        onSuccess: (postId) => {
            incrementViews(postId);
            queryClient.invalidateQueries({ queryKey: ['union-info', 'list', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['union-info', 'detail', postId] });
        },
        onError: (error: Error) => {
            console.error('Increment views error:', error);
        },
    });
};

/**
 * 첨부파일 삭제
 */
export const useDeleteUnionInfoFile = () => {
    const openAlertModal = useModalStore((state) => state.openAlertModal);

    return useMutation({
        mutationFn: async ({ fileId, filePath, postId }: { fileId: string; filePath: string; postId: number }) => {
            // 1. 파일 삭제
            await fileApi.deleteFile(fileId, filePath);

            // 2. 남은 파일 수 확인 후 has_attachments 업데이트 (다형성 연관 관계)
            const { count } = await supabase
                .from('files')
                .select('*', { count: 'exact', head: true })
                .eq('attachable_type', 'union_info')
                .eq('attachable_id', postId);

            if (count === 0) {
                await supabase.from('union_info').update({ has_attachments: false }).eq('id', postId);
            }

            return { fileId, postId };
        },
        onSuccess: ({ postId }) => {
            queryClient.invalidateQueries({ queryKey: ['union-info', 'detail', postId] });
        },
        onError: (error: Error) => {
            console.error('Delete file error:', error);
            openAlertModal({
                title: '파일 삭제 실패',
                message: '파일 삭제에 실패했습니다.',
                type: 'error',
            });
        },
    });
};

