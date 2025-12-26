'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAdsByType } from '@/app/_lib/features/advertisement/api/useAdvertisement';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardListCard } from '@/app/_lib/widgets/common/list-card/BoardListCard';
import { ListCardItem } from '@/app/_lib/widgets/common/list-card';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';

const PartnerListPage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { data: ads, isLoading, error } = useAdsByType('BOARD', !isUnionLoading);

    if (isUnionLoading || isLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
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

    // 광고 데이터를 ListCardItem 형태로 변환
    const listItems: ListCardItem[] = (ads || []).map((ad) => ({
        id: ad.id,
        title: ad.title || ad.business_name,
        author: ad.business_name,
        date: new Date(ad.contract_start_date).toLocaleDateString('ko-KR'),
        views: 0, // 광고에는 현재 조회수 필드가 없음
        commentCount: 0,
        hasAttachment: false,
        isMine: false,
    }));

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h2 className={cn('text-[32px] font-bold text-[#5FA37C]')}>협력 업체</h2>
                </div>

                <BoardListCard
                    items={listItems}
                    onItemClick={(id) => router.push(`/${slug}/communication/partner/${id}`)}
                    emptyMessage="등록된 협력 업체가 없습니다."
                />
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default PartnerListPage;
