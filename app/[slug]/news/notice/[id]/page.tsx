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

export default function NoticeDetailPage() {
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
                <div className="space-y-[50px]">
                    {/* 제목 + 메타 정보 영역 */}
                    <div className="space-y-5">
                        <div className="space-y-[10px]">
                            <Skeleton className="h-7 w-3/4" />
                            <div className="flex flex-wrap justify-between items-center gap-4">
                                <div className="flex items-center gap-[17px]">
                                    <Skeleton className="h-4 w-24" style={{ animationDelay: '75ms' }} />
                                    <Skeleton className="h-4 w-28" style={{ animationDelay: '100ms' }} />
                                    <Skeleton className="h-4 w-20" style={{ animationDelay: '125ms' }} />
                                </div>
                                <div className="flex items-center gap-[13px]">
                                    <Skeleton className="h-[30px] w-14 rounded-lg" style={{ animationDelay: '150ms' }} />
                                    <Skeleton className="h-[30px] w-14 rounded-lg" style={{ animationDelay: '175ms' }} />
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-subtle-border" />
                    </div>
                    {/* 본문 영역 */}
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" style={{ animationDelay: '200ms' }} />
                        <Skeleton className="h-4 w-full" style={{ animationDelay: '225ms' }} />
                        <Skeleton className="h-4 w-5/6" style={{ animationDelay: '250ms' }} />
                        <Skeleton className="h-4 w-2/3" style={{ animationDelay: '275ms' }} />
                        <Skeleton className="h-32 w-full" style={{ animationDelay: '300ms' }} />
                    </div>
                    {/* 첨부파일 영역 */}
                    <div className="border-t border-subtle-border pt-6">
                        <Skeleton className="h-4 w-20 mb-3" style={{ animationDelay: '350ms' }} />
                        <Skeleton className="h-10 w-48 rounded-[8px]" style={{ animationDelay: '375ms' }} />
                    </div>
                    {/* 댓글 영역 */}
                    <div className="border-t border-subtle-border pt-6 space-y-4">
                        <Skeleton className="h-5 w-24" style={{ animationDelay: '400ms' }} />
                        <Skeleton className="h-20 w-full rounded-[8px]" style={{ animationDelay: '425ms' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (isInvalidId || error || !notice) {
        return (
            <div className={cn('container mx-auto max-w-[1042px] px-4 py-8')}>
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <p className="text-[18px] text-error-text">공지사항을 찾을 수 없습니다.</p>
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
                                <div className="flex flex-wrap items-center gap-[17px] text-[14px] text-muted-foreground">
                                    <span>작성자 : {formatAuthorName(notice.author?.name)}</span>
                                    <span>작성일 : {formatDate(notice.created_at, true)}</span>
                                    <span>조회수 : {notice.views}</span>
                                    {notice.is_popup && (
                                        <span className="text-primary">
                                            팝업 기간: {formatDateRange(notice.start_date, notice.end_date)}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-[13px]">
                                    {(isAdmin || isSystemAdmin) && (
                                        <>
                                            <Button 
                                                className="h-[30px] px-4 text-[13px] bg-foreground text-white hover:bg-foreground rounded-lg cursor-pointer" 
                                                onClick={() => router.push(`/${slug}/news/notice/${id}/edit`)}
                                            >
                                                수정
                                            </Button>
                                            <Button 
                                                className="h-[30px] px-4 text-[13px] bg-error-text text-white hover:bg-destructive rounded-lg cursor-pointer" 
                                                onClick={handleDelete}
                                            >
                                                삭제
                                            </Button>
                                        </>
                                    )}
                                    <Button 
                                        className="h-[30px] px-4 text-[13px] bg-subtle-bg text-muted-foreground hover:bg-muted rounded-lg cursor-pointer" 
                                        onClick={() => router.push(`/${slug}/news/notice`)}
                                    >
                                        목록
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                        {/* 구분선 */}
                        <div className="border-t border-subtle-border" />
                    </div>

                    {/* 본문 영역 */}
                    <div 
                        className="min-h-[200px] whitespace-pre-wrap prose prose-lg max-w-none text-[16px] leading-[1.8] text-gray-800" 
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(notice.content) }} 
                    />

                    {/* 첨부파일 영역 */}
                    <div className="border-t border-subtle-border pt-6">
                        <FileUploader
                            unionSlug={slug}
                            targetId={String(noticeId)}
                            targetType="NOTICE"
                            readOnly={true}
                        />
                    </div>

                    {/* 댓글 영역 */}
                    <div className="border-t border-subtle-border pt-6">
                        <BoardComment
                            entityType="notice"
                            entityId={noticeId}
                        />
                    </div>

                    {/* 하단 게시판 목록 - 피그마 디자인 반영 */}
                    {recentNotices.length > 0 && (
                        <div className="border-t border-subtle-border pt-8">
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
                                        <div className="flex items-center gap-4 text-[13px] text-muted-foreground shrink-0 ml-4">
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

