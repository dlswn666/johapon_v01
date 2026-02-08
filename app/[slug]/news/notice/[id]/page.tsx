'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import { useNotice, useIncrementNoticeViews, useDeleteNotice, useRecentNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { BoardComment } from '@/app/_lib/widgets/common/comment';
import { formatDate, formatAuthorName, formatDateRange } from '@/app/_lib/shared/utils/commonUtil';

import { sanitizeHtml } from '@/app/_lib/shared/utils/sanitize';

const NoticeDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const noticeId = parseInt(id);
    const isInvalidId = isNaN(noticeId);
    const { isLoading: isUnionLoading } = useSlug();
    const { isAdmin, isSystemAdmin } = useAuth();
    
    const { data: notice, isLoading, error } = useNotice(noticeId);
    const { data: recentNotices = [] } = useRecentNotices(noticeId, 5, !isUnionLoading);
    const { mutate: incrementViews } = useIncrementNoticeViews();
    const { mutate: deleteNotice } = useDeleteNotice();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // 조회수 증가 (세션당 1회)
    React.useEffect(() => {
        if (noticeId) {
            const viewedKey = `viewed_notice_${noticeId}`;
            if (!sessionStorage.getItem(viewedKey)) {
                incrementViews(noticeId);
                sessionStorage.setItem(viewedKey, '1');
            }
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
            <div className="container mx-auto max-w-[1042px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (isInvalidId || error || !notice) {
        return (
            <div className={cn('container mx-auto max-w-[1042px] px-4 py-8')}>
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <p className="text-[18px] text-[#D9534F]">공지사항을 찾을 수 없습니다.</p>
                    <button
                        onClick={() => router.push(`/${slug}/news/notice`)}
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
            <div className={cn('container mx-auto max-w-[1042px] px-4 py-8')}>
                {/* 공지사항 상세 영역 */}
                <div className="space-y-[50px]">
                    {/* 제목 + 메타 정보 영역 */}
                    <div className="space-y-5">
                        {/* 제목 + 버튼 */}
                        <div className="space-y-[10px]">
                            <h1 className="text-[22px] font-semibold text-black leading-tight">
                                {notice.title}
                            </h1>
                            
                            {/* 메타 정보 + 버튼 */}
                            <div className="flex flex-wrap justify-between items-center gap-4">
                                <div className="flex flex-wrap items-center gap-[17px] text-[14px] text-[#717171]">
                                    <span>작성자 : {formatAuthorName(notice.author?.name)}</span>
                                    <span>작성일 : {formatDate(notice.created_at, true)}</span>
                                    <span>조회수 : {notice.views}</span>
                                    {notice.is_popup && (
                                        <span className="text-[#2F7F5F]">
                                            팝업 기간: {formatDateRange(notice.start_date, notice.end_date)}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-[13px]">
                                    {(isAdmin || isSystemAdmin) && (
                                        <>
                                            <Button 
                                                className="h-[30px] px-4 text-[13px] bg-[#464C53] text-white hover:bg-[#3a3f45] rounded-lg cursor-pointer" 
                                                onClick={() => router.push(`/${slug}/news/notice/${id}/edit`)}
                                            >
                                                수정
                                            </Button>
                                            <Button 
                                                className="h-[30px] px-4 text-[13px] bg-[#D9534F] text-white hover:bg-[#c9443f] rounded-lg cursor-pointer" 
                                                onClick={handleDelete}
                                            >
                                                삭제
                                            </Button>
                                        </>
                                    )}
                                    <Button 
                                        className="h-[30px] px-4 text-[13px] bg-[#E6E6E6] text-[#464C53] hover:bg-[#d9d9d9] rounded-lg cursor-pointer" 
                                        onClick={() => router.push(`/${slug}/news/notice`)}
                                    >
                                        목록
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                        {/* 구분선 */}
                        <div className="border-t border-[#CDD1D5]" />
                    </div>

                    {/* 본문 영역 */}
                    <div 
                        className="min-h-[200px] whitespace-pre-wrap prose prose-lg max-w-none text-[16px] leading-[1.8] text-gray-800" 
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(notice.content) }} 
                    />

                    {/* 첨부파일 영역 */}
                    <div className="border-t border-[#CDD1D5] pt-6">
                        <FileUploader
                            unionSlug={slug}
                            targetId={String(noticeId)}
                            targetType="NOTICE"
                            readOnly={true}
                        />
                    </div>

                    {/* 댓글 영역 */}
                    <div className="border-t border-[#CDD1D5] pt-6">
                        <BoardComment
                            entityType="notice"
                            entityId={noticeId}
                        />
                    </div>

                    {/* 하단 게시판 목록 - 피그마 디자인 반영 */}
                    {recentNotices.length > 0 && (
                        <div className="border-t border-[#CDD1D5] pt-8">
                            <h2 className="text-[18px] font-semibold text-black mb-4">
                                &ldquo;공지사항&rdquo; 게시판 글
                            </h2>
                            <div className="divide-y divide-[#E8E8E8]">
                                {recentNotices.map((item) => (
                                    <div 
                                        key={item.id}
                                        className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => router.push(`/${slug}/news/notice/${item.id}`)}
                                    >
                                        <span className="text-[15px] text-gray-900 truncate flex-1 min-w-0">
                                            {item.title}
                                        </span>
                                        <div className="flex items-center gap-4 text-[13px] text-[#717171] shrink-0 ml-4">
                                            <span>{formatAuthorName(
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                Array.isArray(item.author) ? (item.author as any)[0]?.name : (item.author as any)?.name
                                            )}</span>
                                            <span>{formatDate(item.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default NoticeDetailPage;
