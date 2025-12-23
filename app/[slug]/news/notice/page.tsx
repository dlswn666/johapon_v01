'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Layers, MessageCircle } from 'lucide-react';
import React from 'react';
import { PageSkeleton } from '@/app/_lib/widgets/common/skeleton/PageSkeleton';
import { useRouter } from 'next/navigation';
import { useNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { ListCardItem } from '@/app/_lib/widgets/common/list-card';
import { BoardListCard } from '@/app/_lib/widgets/common/list-card/BoardListCard';

const NoticePage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { user, isAdmin, isSystemAdmin } = useAuth();
    const { data: notices, isLoading, error } = useNotices(!isUnionLoading);

    if (isUnionLoading || isLoading) {
        return <PageSkeleton />;
    }

    if (error) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">데이터를 불러오는 중 오류가 발생했습니다.</p>
                </div>
            </div>
        );
    }

    // 공지사항 데이터를 ListCardItem 형태로 변환
    const listItems: ListCardItem[] = (notices || []).map((notice) => ({
        id: notice.id,
        title: notice.title,
        author: notice.author?.name || notice.author_id,
        date: new Date(notice.created_at).toLocaleDateString('ko-KR'),
        views: notice.views,
        commentCount: notice.comment_count,
        hasAttachment: notice.file_count > 0,
        isMine: notice.author_id === user?.id,
    }));

    // 커스텀 아이콘 렌더링 (팝업/알림톡)
    const renderTitleSuffix = (item: ListCardItem) => {
        const notice = notices?.find((n) => n.id === item.id);
        if (!notice) return null;

        return (
            <div className="flex items-center gap-1 shrink-0">
                {notice.is_popup && <Layers className="h-4 w-4 text-[#5FA37C]" />}
                {notice.alimtalk_logs && notice.alimtalk_logs[0]?.count > 0 && (
                    <MessageCircle className="h-4 w-4 text-[#F0AD4E]" />
                )}
            </div>
        );
    };

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h2 className={cn('text-[32px] font-bold text-[#5FA37C]')}>공지사항</h2>
                    {(isAdmin || isSystemAdmin) && (
                        <Button
                            className="bg-[#4E8C6D] hover:bg-[#5FA37C] text-white text-[16px] px-6 py-2 rounded-[8px] cursor-pointer"
                            onClick={() => router.push(`/${slug}/news/notice/new`)}
                        >
                            글쓰기
                        </Button>
                    )}
                </div>

                <BoardListCard
                    items={listItems}
                    onItemClick={(id) => router.push(`/${slug}/news/notice/${id}`)}
                    emptyMessage="등록된 공지사항이 없습니다."
                    renderTitleSuffix={renderTitleSuffix}
                />
            </div>

            {/* 모달 컴포넌트 */}
            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default NoticePage;
