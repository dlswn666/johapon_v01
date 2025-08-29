'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAdStore } from '@/shared/store/adStore';
import BannerAd from './BannerAd';

interface SideBannerAdsProps {
    className?: string;
}

export default function SideBannerAds({ className = '' }: SideBannerAdsProps) {
    const params = useParams();
    const slug = params?.homepage as string;

    const { sideBannerAds, loading, error, fetchSideBannerAds } = useAdStore();

    useEffect(() => {
        if (slug) {
            fetchSideBannerAds(slug);
        }
    }, [slug, fetchSideBannerAds]);

    const handleAdClick = (ad: any) => {
        // 광고 클릭 시 상세 모달 또는 새 창으로 이동
        console.log('광고 클릭:', ad);
        // TODO: 광고 상세 모달 또는 외부 링크 처리
    };

    if (loading) {
        return (
            <div className={`space-y-4 ${className}`}>
                {[...Array(2)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                        <div className="bg-gray-200 rounded-lg aspect-video"></div>
                        <div className="p-3 space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return <div className={`text-center py-4 text-red-500 text-sm ${className}`}>광고를 불러올 수 없습니다.</div>;
    }

    if (sideBannerAds.length === 0) {
        return (
            <div className={`text-center py-8 text-gray-500 text-sm ${className}`}>
                현재 게시된 사이드 배너 광고가 없습니다.
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {sideBannerAds.map((ad) => (
                <BannerAd key={ad.id} ad={ad} onClick={handleAdClick} />
            ))}
        </div>
    );
}
