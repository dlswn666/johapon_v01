'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';
import React, { useEffect, useRef } from 'react';
import { useNotice, useDeleteNotice, useIncrementNoticeViews } from '@/app/_lib/shared/hooks/notice/useNoticeHook';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';

const NoticeDetail = () => {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const { data: notice, isLoading, error } = useNotice(id);
    const deleteMutation = useDeleteNotice();
    const incrementViewsMutation = useIncrementNoticeViews();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);
    
    // 조회수 증가 (페이지당 1회만 실행)
    const hasIncrementedRef = useRef<number | null>(null);
    
    useEffect(() => {
        // id가 변경되었고, 아직 해당 id에 대해 조회수를 증가시키지 않았다면
        if (id && !isNaN(id) && hasIncrementedRef.current !== id) {
            incrementViewsMutation.mutate(id);
            hasIncrementedRef.current = id; // 현재 id 저장
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]); // incrementViewsMutation 의도적으로 제외

    const handleDelete = () => {
        openConfirmModal({
            title: '공지사항 삭제',
            message: '정말 이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
            variant: 'danger',
            confirmText: '삭제',
            onConfirm: () => deleteMutation.mutate(id),
        });
    };

    if (isLoading) {
        return (
            <div className={cn('container mx-auto p-6 max-w-4xl')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-muted-foreground">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !notice) {
        return (
            <div className={cn('container mx-auto p-6 max-w-4xl')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-red-600">공지사항을 불러오는 중 오류가 발생했습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto p-6 max-w-4xl')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h1 className={cn('text-3xl font-bold')}>공지사항 상세</h1>
                </div>

                <Separator className="mb-6" />

                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="bg-muted/30 p-4 rounded-lg border">
                        <h2 className="text-xl font-semibold mb-4">{notice.title}</h2>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">작성자</span>
                                <span>{notice.author_id}</span>
                            </div>
                            <div className="w-px h-4 bg-border" />
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">작성일</span>
                                <span>{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                            </div>
                            <div className="w-px h-4 bg-border" />
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">조회수</span>
                                <span>{notice.views}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="min-h-[300px] p-4 border rounded-lg whitespace-pre-wrap leading-relaxed">
                        {notice.content}
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-4">
                        <Button variant="outline" onClick={() => router.push('/notice')}>
                            목록
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                        </Button>
                        <Button onClick={() => router.push(`/notice/${id}/edit`)}>수정</Button>
                    </div>
                </div>
            </div>

            {/* 모달 컴포넌트 */}
            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default NoticeDetail;
