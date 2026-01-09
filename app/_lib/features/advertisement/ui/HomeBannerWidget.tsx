'use client';

import React from 'react';
import { useRandomAds } from '../api/useAdvertisement';
import { Advertisement } from '@/app/_lib/shared/type/database.types';
import Image from 'next/image';

// 모바일 배너 광고용 기본 데이터
const DEFAULT_BANNER_ADS: Advertisement[] = [
    {
        id: 'def-banner-1',
        business_name: '삼성 앱카드',
        type: 'SUB',
        union_id: '',
        contract_start_date: '',
        contract_end_date: '',
        is_payment_completed: true,
        price: 0,
        image_url:
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=400&h=300&auto=format&fit=crop',
        link_url: null,
        created_at: '',
        title: '삼성앱카드 3천원 할인',
        content: '조합원 전용 혜택',
        contract_file_url: null,
    },
    {
        id: 'def-banner-2',
        business_name: '캐시로드',
        type: 'SUB',
        union_id: '',
        contract_start_date: '',
        contract_end_date: '',
        is_payment_completed: true,
        price: 0,
        image_url:
            'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=400&h=300&auto=format&fit=crop',
        link_url: null,
        created_at: '',
        title: '캐시로드 포인트 적립',
        content: '조합원 전용 혜택',
        contract_file_url: null,
    },
    {
        id: 'def-banner-3',
        business_name: '제휴 파트너',
        type: 'SUB',
        union_id: '',
        contract_start_date: '',
        contract_end_date: '',
        is_payment_completed: true,
        price: 0,
        image_url:
            'https://images.unsplash.com/photo-1560472355-536de3962603?q=80&w=400&h=300&auto=format&fit=crop',
        link_url: null,
        created_at: '',
        title: '조합원 할인 혜택',
        content: '제휴업체 전용',
        contract_file_url: null,
    },
    {
        id: 'def-banner-4',
        business_name: '특별 프로모션',
        type: 'SUB',
        union_id: '',
        contract_start_date: '',
        contract_end_date: '',
        is_payment_completed: true,
        price: 0,
        image_url:
            'https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=400&h=300&auto=format&fit=crop',
        link_url: null,
        created_at: '',
        title: '이달의 특가 상품',
        content: '한정 수량',
        contract_file_url: null,
    },
];

// 개별 배너 카드 컴포넌트
function BannerCard({ ad }: { ad: Advertisement }) {
    return (
        <div className="relative w-full h-[120px] bg-white rounded-[8px] shadow-sm border border-slate-200 overflow-hidden group">
            {ad.image_url ? (
                <>
                    <Image
                        src={ad.image_url}
                        alt={ad.business_name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* 텍스트 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-3">
                        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">
                            Partnership
                        </span>
                        <h4 className="text-white font-bold text-[11px] leading-tight line-clamp-1">
                            {ad.title}
                        </h4>
                        <p className="text-white/70 text-[9px] font-medium line-clamp-1">{ad.business_name}</p>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-2">
                    {ad.business_name}
                </div>
            )}
            {ad.link_url && (
                <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />
            )}
        </div>
    );
}

// 모바일 홈 배너 광고 컴포넌트 (2열 그리드)
export function HomeBannerWidget() {
    const { data: ads, isLoading } = useRandomAds('SUB', 2);

    // 광고 데이터 (API 데이터 또는 기본 데이터)
    const bannerAds = React.useMemo(() => {
        if (ads && ads.length >= 2) {
            return [ads[0], ads[1]];
        }
        // 기본 광고에서 랜덤 2개 선택
        // eslint-disable-next-line react-hooks/purity
        const shuffled = [...DEFAULT_BANNER_ADS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 2);
    }, [ads]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-[8px]">
                <div className="h-[120px] bg-slate-200/50 rounded-[8px] animate-pulse" />
                <div className="h-[120px] bg-slate-200/50 rounded-[8px] animate-pulse" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="grid grid-cols-2 gap-[8px]">
                {bannerAds.map((ad) => (
                    <BannerCard key={ad.id} ad={ad} />
                ))}
            </div>
            <p className="text-[9px] text-slate-400 text-center font-medium uppercase tracking-widest">
                Advertisement
            </p>
        </div>
    );
}
