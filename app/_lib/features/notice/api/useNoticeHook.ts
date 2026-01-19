'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useNoticeStore from '@/app/_lib/features/notice/model/useNoticeStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { Notice, NewNotice, UpdateNotice } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { fileApi } from '@/app/_lib/shared/hooks/file/fileApi';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 전체 공지사항 목록 조회 (댓글 수 포함, 검색 기능)
 * @param enabled - 쿼리 활성화 여부
 * @param searchQuery - 검색어 (제목, 내용, 작성자명으로 검색)
 */
export const useNotices = (enabled: boolean = true, searchQuery?: string) => {
    const setNotices = useNoticeStore((state) => state.setNotices);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['notices', union?.id, searchQuery],
        queryFn: async () => {
            if (!union?.id) return [];

            // 1. 공지사항 목록 조회 (다형성 패턴으로 인해 files 관계 쿼리 제거)
            let query = supabase
                .from('notices')
                .select('*, author:users!notices_author_id_fkey(id, name), alimtalk_logs(count)')
                .eq('union_id', union.id);

            // 검색 조건 적용 (제목, 내용)
            if (searchQuery && searchQuery.trim()) {
                const search = `%${searchQuery.trim()}%`;
                query = query.or(`title.ilike.${search},content.ilike.${search}`);
            }

            query = query.order('created_at', { ascending: false });

            const { data: noticesData, error: noticesError } = await query;

            if (noticesError) {
                throw noticesError;
            }

            if (!noticesData || noticesData.length === 0) {
                return [];
            }

            // 검색어로 작성자명 검색 시 추가 필터링 (DB에서 join 후 필터링 불가능하므로 클라이언트에서 처리)
            let filteredData = noticesData;
            if (searchQuery && searchQuery.trim()) {
                const search = searchQuery.trim().toLowerCase();
                filteredData = noticesData.filter((n) => {
                    const authorName = (n.author as { name: string } | null)?.name?.toLowerCase() || '';
                    return (
                        n.title.toLowerCase().includes(search) ||
                        n.content.toLowerCase().includes(search) ||
                        authorName.includes(search)
                    );
                });
            }

            if (filteredData.length === 0) {
                return [];
            }

            const noticeIds = filteredData.map((n) => n.id);

            // 2. 파일 수 조회 (다형성 연관 관계)
            const { data: fileCounts, error: filesError } = await supabase
                .from('files')
                .select('attachable_id')
                .eq('attachable_type', 'notice')
                .in('attachable_id', noticeIds);

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

            // 3. 댓글 수 조회
            const { data: commentCounts, error: commentsError } = await supabase
                .from('comments')
                .select('entity_id')
                .eq('entity_type', 'notice')
                .in('entity_id', noticeIds);

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

            // 4. 공지사항 데이터에 파일 수, 댓글 수 병합
            const noticesWithCounts = filteredData.map((notice) => ({
                ...notice,
                file_count: fileCountMap[notice.id] || 0,
                comment_count: commentCountMap[notice.id] || 0,
            }));

            return noticesWithCounts as (Notice & {
                author: { id: string; name: string } | null;
                alimtalk_logs: { count: number }[];
                file_count: number;
                comment_count: number;
            })[];
        },
        enabled: enabled && !!union?.id,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setNotices(queryResult.data as unknown as Notice[]);
        }
    }, [queryResult.data, queryResult.isSuccess, setNotices]);

    return queryResult;
};

/**
 * 특정 공지사항 상세 조회
 */
export const useNotice = (noticeId: number | undefined, enabled: boolean = true) => {
    const setSelectedNotice = useNoticeStore((state) => state.setSelectedNotice);
    const { union } = useSlug();

    const queryResult = useQuery({
        queryKey: ['notices', union?.id, noticeId],
        queryFn: async () => {
            if (!noticeId) throw new Error('Notice ID is required');
            if (!union?.id) throw new Error('Union ID is required');

            const { data, error } = await supabase
                .from('notices')
                .select('*, author:users!notices_author_id_fkey(id, name)')
                .eq('id', noticeId)
                .eq('union_id', union.id) // 조합 ID로 필터링 (보안 강화)
                .single();

            if (error) {
                throw error;
            }

            return data as Notice & { author: { id: string; name: string } | null };
        },
        enabled: !!noticeId && !!union?.id && enabled,
        retry: false, // 상세 조회는 재시도하지 않음 (삭제된 데이터 조회 방지)
        meta: {
            skipErrorToast: true, // 상세 조회 실패 시 전역 토스트 방지
        },
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedNotice(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedNotice]);

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
    noticeId: number
) => {
    let processedContent = content;

    // editorImages keys are blob URLs
    for (const [blobUrl, file] of Object.entries(editorImages)) {
        if (processedContent.includes(blobUrl)) {
            try {
                const { publicUrl } = await fileApi.uploadImage(file, unionSlug, String(noticeId));
                // Blob URL을 Public URL로 치환 (모든 발생 부분)
                processedContent = processedContent.replace(new RegExp(blobUrl, 'g'), publicUrl);
            } catch (e) {
                console.error(`Failed to upload editor image: ${file.name}`, e);
            }
        }
    }
    return processedContent;
};

/**
 * 공지사항 등록
 */
/**
 * 공지사항 등록
 */
export const useAddNotice = () => {
    const router = useRouter();
    const addNotice = useNoticeStore((state) => state.addNotice);
    const editorImages = useNoticeStore((state) => state.editorImages);
    const clearEditorImages = useNoticeStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { confirmFiles, clearTempFiles } = useFileStore();
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async (newNotice: NewNotice & {
            send_alimtalk?: boolean;
            alimtalk_schedule_type?: 'immediate' | 'scheduled';
            scheduled_at?: string | null;
        }) => {
            if (!union?.id) throw new Error('Union context missing');

            const { send_alimtalk, alimtalk_schedule_type, scheduled_at, ...noticeDataToInsert } = newNotice;

            // 1. 공지사항 우선 생성 (ID 확보)
            const noticeWithUnion = {
                ...noticeDataToInsert,
                union_id: union.id,
            };

            const { data: noticeData, error: noticeError } = await supabase
                .from('notices')
                .insert([noticeWithUnion])
                .select()
                .single();

            if (noticeError) throw noticeError;

            // 2. 에디터 이미지 업로드 및 본문 URL 치환
            const finalContent = await processEditorImages(newNotice.content || '', editorImages, slug, noticeData.id);

            // 3. 본문 업데이트 (이미지 URL 치환된 경우)
            if (finalContent !== newNotice.content) {
                const { error: updateError } = await supabase
                    .from('notices')
                    .update({ content: finalContent })
                    .eq('id', noticeData.id);

                if (updateError) console.error('Failed to update content with images', updateError);
                else noticeData.content = finalContent; // 로컬 데이터 갱신
            }

            // 4. 첨부 파일 이관 (임시 -> 영구)
            await confirmFiles({
                targetId: String(noticeData.id),
                targetType: 'NOTICE',
                unionSlug: slug,
                uploaderId: newNotice.author_id,
            });

            // 5. 알림톡 발송 로직
            if (send_alimtalk) {
                const isScheduled = alimtalk_schedule_type === 'scheduled' && scheduled_at;

                if (isScheduled) {
                    // 예약 발송: scheduled_alimtalks 테이블에 저장
                    try {
                        const { error: scheduleError } = await supabase
                            .from('scheduled_alimtalks')
                            .insert({
                                notice_id: noticeData.id,
                                union_id: union.id,
                                template_code: 'UE_2827',
                                scheduled_at: scheduled_at,
                                status: 'pending',
                            });

                        if (scheduleError) {
                            console.error('알림톡 예약 저장 실패:', scheduleError);
                        } else {
                            console.log(`[공지사항 알림톡] 예약 발송 등록 완료 - ${scheduled_at}`);
                        }
                    } catch (scheduleError) {
                        console.error('알림톡 예약 실패:', scheduleError);
                    }
                } else {
                    // 바로 발송
                    try {
                        // 해당 조합의 '승인됨' 상태의 일반 조합원 조회 (수신 대상)
                        const { data: approvedMembers } = await supabase
                            .from('users')
                            .select('phone_number, name')
                            .eq('union_id', union.id)
                            .eq('user_status', 'APPROVED')
                            .eq('role', 'USER');

                        if (approvedMembers && approvedMembers.length > 0) {
                            const createdDate = new Date(noticeData.created_at);
                            await sendAlimTalk({
                                unionId: union.id,
                                templateCode: 'UE_2827', // 공지사항 등록 알림 템플릿
                                recipients: approvedMembers.map((member) => ({
                                    phoneNumber: member.phone_number,
                                    name: member.name,
                                    variables: {
                                        조합명: union.name,
                                        이름: member.name,
                                        안내제목: noticeData.title,
                                        등록일시: createdDate.toLocaleString('ko-KR'),
                                        조합슬러그: slug,
                                        공지사항ID: noticeData.id,
                                    },
                                })),
                                noticeId: noticeData.id,
                            });
                            console.log(`[공지사항 알림톡] ${approvedMembers.length}명에게 발송 요청 완료`);
                        }
                    } catch (alimTalkError) {
                        console.error('알림톡 발송 실패 (공지사항 등록):', alimTalkError);
                        // 알림톡 발송 실패해도 공지사항 등록은 성공으로 처리
                    }
                }
            }

            return noticeData as Notice;
        },
        onSuccess: (data) => {
            addNotice(data);
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id] });

            // 상태 초기화
            clearTempFiles();
            clearEditorImages();

            openAlertModal({
                title: '등록 완료',
                message: '공지사항이 성공적으로 등록되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, `/news/notice/${data.id}`);
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Add notice error:', error);
            openAlertModal({
                title: '등록 실패',
                message: '공지사항 등록에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 공지사항 수정
 */
/**
 * 공지사항 수정
 */
export const useUpdateNotice = () => {
    const router = useRouter();
    const updateNotice = useNoticeStore((state) => state.updateNotice);
    const editorImages = useNoticeStore((state) => state.editorImages);
    const clearEditorImages = useNoticeStore((state) => state.clearEditorImages);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { confirmFiles, clearTempFiles } = useFileStore();
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: UpdateNotice & { send_alimtalk?: boolean } }) => {
            const { send_alimtalk, ...noticeUpdates } = updates;
            const finalUpdates = { ...noticeUpdates };

            // 1. 에디터 이미지 업로드 및 본문 URL 치환
            if (noticeUpdates.content) {
                finalUpdates.content = await processEditorImages(noticeUpdates.content, editorImages, slug, id);
            }

            // 2. 공지사항 업데이트
            const { data, error } = await supabase.from('notices').update(finalUpdates).eq('id', id).select().single();

            if (error) throw error;

            // 3. 신규 첨부 파일이 있다면 이관
            await confirmFiles({
                targetId: String(id),
                targetType: 'NOTICE',
                unionSlug: slug,
            });

            // 4. 알림톡 발송 로직 (Placeholder) - 수정 시에도 발송할지 여부는 기획에 따라 다름 (보통 수정 시엔 안 보냄, 하지만 체크박스가 있다면 보냄)
            if (send_alimtalk) {
                console.log('TODO: Send AlimTalk for updated notice', id);
            }

            return data as Notice;
        },
        onSuccess: (data) => {
            updateNotice(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id, data.id] });

            clearTempFiles();
            clearEditorImages();

            openAlertModal({
                title: '수정 완료',
                message: '공지사항이 성공적으로 수정되었습니다.',
                type: 'success',
                onOk: () => {
                    const path = getUnionPath(slug, `/notice/${data.id}`);
                    router.push(path);
                },
            });
        },
        onError: (error: Error) => {
            console.error('Update notice error:', error);
            openAlertModal({
                title: '수정 실패',
                message: '공지사항 수정에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 공지사항 삭제
 */
export const useDeleteNotice = () => {
    const router = useRouter();
    const removeNotice = useNoticeStore((state) => state.removeNotice);
    const openAlertModal = useModalStore((state) => state.openAlertModal);
    const { union, slug } = useSlug();

    return useMutation({
        mutationFn: async (noticeId: number) => {
            // 0. 삭제 전 관련 쿼리 취소 (진행 중인 쿼리가 있다면 중단)
            await queryClient.cancelQueries({ queryKey: ['notices', union?.id, noticeId] });
            await queryClient.cancelQueries({ queryKey: ['notices', union?.id] });

            // 1. 폴더 및 하위 파일 전체 삭제 (Storage)
            const folderPath = `unions/${slug}/notices/${noticeId}`;
            await fileApi.deleteFolder(folderPath);

            // 2. DB 파일 레코드 삭제 (다형성 연관 관계)
            const { error: fileError } = await supabase
                .from('files')
                .delete()
                .eq('attachable_type', 'notice')
                .eq('attachable_id', noticeId);

            if (fileError) {
                console.error('Failed to delete file records', fileError);
                // 진행은 계속함 (게시물 삭제 시도)
            }

            // 3. 게시물 삭제
            const { error } = await supabase.from('notices').delete().eq('id', noticeId);

            if (error) {
                throw error;
            }

            return noticeId;
        },
        onSuccess: (noticeId) => {
            removeNotice(noticeId);

            // 삭제된 공지사항의 상세 쿼리를 캐시에서 완전히 제거 (재조회 시도 방지)
            queryClient.removeQueries({ queryKey: ['notices', union?.id, noticeId] });

            // 목록 캐시도 제거 (목록 페이지에서 마운트 시 자동 재조회됨)
            queryClient.removeQueries({ queryKey: ['notices', union?.id] });

            // 목록으로 먼저 이동
            const path = getUnionPath(slug, '/notice');
            router.push(path);

            openAlertModal({
                title: '삭제 완료',
                message: '공지사항이 성공적으로 삭제되었습니다.',
                type: 'success',
            });
        },
        onError: (error: Error) => {
            console.error('Delete notice error:', error);
            openAlertModal({
                title: '삭제 실패',
                message: '공지사항 삭제에 실패했습니다. 다시 시도해주세요.',
                type: 'error',
            });
        },
    });
};

/**
 * 조회수 증가
 */
export const useIncrementNoticeViews = () => {
    const incrementViews = useNoticeStore((state) => state.incrementViews);
    const { union } = useSlug();

    return useMutation({
        mutationFn: async (noticeId: number) => {
            const { error } = await supabase.rpc('increment_notice_views', {
                notice_id: noticeId,
            });

            if (error) {
                throw error;
            }

            return noticeId;
        },
        onSuccess: (noticeId) => {
            // 낙관적 업데이트 (Store)
            incrementViews(noticeId);

            // 쿼리 캐시 무효화 (목록 페이지에 반영)
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id] });
            queryClient.invalidateQueries({ queryKey: ['notices', union?.id, noticeId] });
        },
        onError: (error: Error) => {
            console.error('Increment views error:', error);
        },
    });
};

/**
 * 팝업 공지사항 조회 (현재 기간 내)
 * - is_popup이 true이고
 * - start_date <= 현재 시간 <= end_date인 공지사항만 조회
 */
export const usePopupNotices = (unionId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['notices', unionId, 'popup'],
        queryFn: async () => {
            if (!unionId) return [];

            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('notices')
                .select('id, title, content')
                .eq('union_id', unionId)
                .eq('is_popup', true)
                .lte('start_date', now)
                .gte('end_date', now)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data as Pick<Notice, 'id' | 'title' | 'content'>[];
        },
        enabled: enabled && !!unionId,
        staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
    });
};
