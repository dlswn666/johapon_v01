'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useNotice, useIncrementNoticeViews, useDeleteNotice } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { CommentSection } from '@/app/_lib/widgets/common/comment';

interface NoticeDetailPageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

const NoticeDetailPage = ({ params }: NoticeDetailPageProps) => {
    const router = useRouter();
    const { slug, id } = use(params);
    const noticeId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();
    
    const { data: notice, isLoading, error } = useNotice(noticeId);
    const { mutate: incrementViews } = useIncrementNoticeViews();
    const { mutate: deleteNotice } = useDeleteNotice();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // 조회수 증가 (컴포넌트 마운트 시 1회)
    React.useEffect(() => {
        if (noticeId) {
            incrementViews(noticeId);
        }
    }, [noticeId, incrementViews]);

    const handleDelete = () => {
        openConfirmModal({
            title: '공지사항 삭제',
            message: '정말로 이 공지사항을 삭제하시겠습니까?',
            onConfirm: () => deleteNotice(noticeId),
        });
    };

    if (isUnionLoading || isLoading) {
        return (
            <div className={cn('container mx-auto p-6')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-muted-foreground">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !notice) {
        return (
            <div className={cn('container mx-auto p-6')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-red-600">공지사항을 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto p-6')}>
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex justify-between items-center">
                        <UnionHeader />
                        <UnionNavigation />
                    </div>
                    <Separator />
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-bold">{notice.title}</h1>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push(`/${slug}/notice/${id}/edit`)}>
                                수정
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                삭제
                            </Button>
                            <Button variant="secondary" onClick={() => router.push(`/${slug}/notice`)}>
                                목록
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-4 text-sm text-gray-500 border-b pb-4">
                        <span>작성자: {notice.author_id}</span>
                        <span>작성일: {new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                        <span>조회수: {notice.views}</span>
                    </div>

                    <div className="min-h-[300px] whitespace-pre-wrap py-4 prose prose-sm sm:prose-base dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: notice.content }} />

                    {/* 첨부파일 영역 */}
                    <div className="mt-8 border-t pt-6">
                         <FileUploader
                            unionSlug={slug}
                            targetId={String(noticeId)}
                            targetType="NOTICE"
                            readOnly={true} // 상세 페이지는 읽기 전용 (수정 페이지에서 관리)
                        />
                    </div>

                    {/* 댓글 영역 */}
                    <div className="mt-8">
                        <CommentSection
                            entityType="notice"
                            entityId={noticeId}
                        />
                    </div>

                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default NoticeDetailPage;
