'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useFreeBoard, useIncrementFreeBoardViews, useDeleteFreeBoard } from '@/app/_lib/features/free-board/api/useFreeBoardHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { CommentSection } from '@/app/_lib/widgets/common/comment';
import { formatDate, formatAuthorName } from '@/app/_lib/shared/utils/commonUtil';
import { sanitizeHtml } from '@/app/_lib/shared/utils/sanitize';

const FreeBoardDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const freeBoardId = parseInt(id);
    const isInvalidId = isNaN(freeBoardId);
    const { isLoading: isUnionLoading } = useSlug();
    const { user } = useAuth();
    
    const { data: freeBoard, isLoading, error } = useFreeBoard(freeBoardId);
    const { mutate: incrementViews } = useIncrementFreeBoardViews();
    const { mutate: deleteFreeBoard } = useDeleteFreeBoard();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // 작성자 확인
    const isMine = freeBoard?.author_id === user?.id;
    const authorName = formatAuthorName((freeBoard?.author as { name: string } | null)?.name);

    // 조회수 증가 (세션당 1회)
    React.useEffect(() => {
        if (freeBoardId) {
            const viewedKey = `viewed_free_board_${freeBoardId}`;
            if (!sessionStorage.getItem(viewedKey)) {
                incrementViews(freeBoardId);
                sessionStorage.setItem(viewedKey, '1');
            }
        }
    }, [freeBoardId, incrementViews]);

    const handleDelete = () => {
        openConfirmModal({
            title: '게시글 삭제',
            message: '정말로 이 게시글을 삭제하시겠습니까?',
            onConfirm: () => deleteFreeBoard(freeBoardId),
        });
    };

    if (isUnionLoading || isLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (isInvalidId || error || !freeBoard) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <p className="text-[18px] text-[#D9534F]">게시글을 찾을 수 없습니다.</p>
                    <button
                        onClick={() => router.push(`/${slug}/communication/free-board`)}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                        목록으로
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="space-y-8">
                    <div className="border-b border-[#CCCCCC] pb-6 space-y-4">
                        <h2 className="text-[24px] md:text-[32px] font-bold text-[#5FA37C]">{freeBoard.title}</h2>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-6 text-[14px] text-[#AFAFAF]">
                                <span>작성자: {authorName}</span>
                                <span>작성일: {formatDate(freeBoard.created_at, true)}</span>
                                <span>조회수: {freeBoard.views}</span>
                            </div>
                            <div className="flex gap-2">
                                {isMine && (
                                    <>
                                        <Button
                                            className="bg-white border border-[#4E8C6D] text-[#4E8C6D] hover:bg-[#F5F5F5] cursor-pointer"
                                            onClick={() => router.push(`/${slug}/communication/free-board/${id}/edit`)}
                                        >
                                            수정
                                        </Button>
                                        <Button
                                            className="bg-[#D9534F] text-white hover:bg-[#D9534F]/90 cursor-pointer"
                                            onClick={handleDelete}
                                        >
                                            삭제
                                        </Button>
                                    </>
                                )}
                                <Button
                                    className="bg-[#E6E6E6] text-[#5FA37C] hover:bg-[#E6E6E6]/80 cursor-pointer"
                                    onClick={() => router.push(`/${slug}/communication/free-board`)}
                                >
                                    목록
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div 
                        className="min-h-[300px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800" 
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(freeBoard.content) }} 
                    />

                    {/* 첨부파일 영역 */}
                    <div className="mt-8 border-t border-[#CCCCCC] pt-6">
                        <FileUploader
                            unionSlug={slug}
                            targetId={String(freeBoardId)}
                            targetType="FREE_BOARD"
                            readOnly={true}
                        />
                    </div>

                    {/* 댓글 영역 */}
                    <div className="mt-8 bg-[#F5F5F5] rounded-[12px] p-6">
                        <CommentSection
                            entityType="free_board"
                            entityId={freeBoardId}
                        />
                    </div>
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default FreeBoardDetailPage;

