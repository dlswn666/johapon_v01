'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useNotice, useIncrementNoticeViews, useDeleteNotice } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { CommentSection } from '@/app/_lib/widgets/common/comment';

const NoticeDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
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
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-gray-400">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !notice) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">공지사항을 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="space-y-8">
                    <div className="flex justify-between items-start border-b border-[#CCCCCC] pb-6">
                        <h2 className="text-[32px] font-bold text-[#5FA37C]">{notice.title}</h2>
                        <div className="flex gap-2">
                            <Button 
                                className="bg-white border border-[#4E8C6D] text-[#4E8C6D] hover:bg-[#F5F5F5] cursor-pointer" 
                                onClick={() => router.push(`/${slug}/news/notice/${id}/edit`)}
                            >
                                수정
                            </Button>
                            <Button 
                                className="bg-[#D9534F] text-white hover:bg-[#D9534F]/90 cursor-pointer" 
                                onClick={handleDelete}
                            >
                                삭제
                            </Button>
                            <Button 
                                className="bg-[#E6E6E6] text-[#5FA37C] hover:bg-[#E6E6E6]/80 cursor-pointer" 
                                onClick={() => router.push(`/${slug}/news/notice`)}
                            >
                                목록
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-6 text-[14px] text-[#AFAFAF] pb-4">
                        <span>작성자: {notice.author_id}</span>
                        <span>작성일: {new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                        <span>조회수: {notice.views}</span>
                    </div>

                    <div className="min-h-[300px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: notice.content }} />

                    {/* 첨부파일 영역 */}
                    <div className="mt-8 border-t border-[#CCCCCC] pt-6">
                         <FileUploader
                            unionSlug={slug}
                            targetId={String(noticeId)}
                            targetType="NOTICE"
                            readOnly={true} // 상세 페이지는 읽기 전용 (수정 페이지에서 관리)
                        />
                    </div>

                    {/* 댓글 영역 */}
                    <div className="mt-8 bg-[#F5F5F5] rounded-[12px] p-6">
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

