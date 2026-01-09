'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import {
    useFreeBoard,
    useIncrementFreeBoardViews,
    useDeleteFreeBoard,
} from '@/app/_lib/features/free-board/api/useFreeBoardHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { BoardComment } from '@/app/_lib/widgets/common/comment';
import { formatDate, formatAuthorName } from '@/app/_lib/shared/utils/commonUtil';

const FreeBoardDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const freeBoardId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();
    const { user } = useAuth();

    const { data: freeBoard, isLoading, error } = useFreeBoard(freeBoardId);
    const { mutate: incrementViews } = useIncrementFreeBoardViews();
    const { mutate: deleteFreeBoard } = useDeleteFreeBoard();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // 작성자 확인
    const isMine = freeBoard?.author_id === user?.id;
    const authorName = formatAuthorName((freeBoard?.author as { name: string } | null)?.name);

    // 조회수 증가 (컴포넌트 마운트 시 1회)
    React.useEffect(() => {
        if (freeBoardId) {
            incrementViews(freeBoardId);
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

    if (error || !freeBoard) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">게시글을 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col gap-6 mb-[80px]">
                    <div className="flex justify-between items-center">
                        <UnionHeader />
                        <UnionNavigation />
                    </div>
                    <Separator className="bg-[#CCCCCC]" />
                </div>

                <div className="space-y-8">
                    <div className="flex justify-between items-start border-b border-[#CCCCCC] pb-6">
                        <h2 className="text-[32px] font-bold text-[#5FA37C]">{freeBoard.title}</h2>
                        <div className="flex gap-2">
                            {isMine && (
                                <>
                                    <Button
                                        className="bg-white border border-[#4E8C6D] text-[#4E8C6D] hover:bg-[#F5F5F5] cursor-pointer"
                                        onClick={() => router.push(`/${slug}/free-board/${id}/edit`)}
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
                                onClick={() => router.push(`/${slug}/free-board`)}
                            >
                                목록
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-6 text-[14px] text-[#AFAFAF] pb-4">
                        <span>작성자: {authorName}</span>
                        <span>작성일: {formatDate(freeBoard.created_at, true)}</span>
                        <span>조회수: {freeBoard.views}</span>
                    </div>

                    <div
                        className="min-h-[300px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800"
                        dangerouslySetInnerHTML={{ __html: freeBoard.content }}
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
                    <div className="mt-8 bg-white rounded-[12px] p-0">
                        <BoardComment entityType="free_board" entityId={freeBoardId} />
                    </div>
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default FreeBoardDetailPage;
