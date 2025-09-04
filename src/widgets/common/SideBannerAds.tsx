'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdStore } from '@/shared/store/adStore';
import BannerAd from './BannerAd';

interface SideBannerAdsProps {
    className?: string;
}

// 디바이스 타입 감지 훅
function useDeviceType() {
    const [deviceType, setDeviceType] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');

    useEffect(() => {
        const checkDeviceType = () => {
            const isMobile = window.innerWidth < 768; // Tailwind의 md 브레이크포인트
            setDeviceType(isMobile ? 'MOBILE' : 'DESKTOP');
        };

        checkDeviceType();
        window.addEventListener('resize', checkDeviceType);
        return () => window.removeEventListener('resize', checkDeviceType);
    }, []);

    return deviceType;
}

export default function SideBannerAds({ className = '' }: SideBannerAdsProps) {
    const params = useParams();
    const slug = params?.homepage as string;
    const deviceType = useDeviceType();

    const { sideBannerAds, loading, error, fetchSideBannerAds } = useAdStore();

    useEffect(() => {
        if (slug && deviceType) {
            fetchSideBannerAds(slug, deviceType);
        }
    }, [slug, deviceType, fetchSideBannerAds]);

    const handleAdClick = (ad: any) => {
        // 광고 클릭 시 상세 모달 또는 새 창으로 이동
        console.log('광고 클릭:', ad);
        // TODO: 광고 상세 모달 또는 외부 링크 처리
    };

    if (loading) {
        return (
            <div className={`${className}`}>
                <div className="animate-pulse">
                    <div className="bg-gray-200 rounded-lg h-48"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className={`text-center py-4 text-red-500 text-sm ${className}`}>광고를 불러올 수 없습니다.</div>;
    }

    // 현재 디바이스에 맞는 광고 가져오기
    const currentDeviceAds = sideBannerAds[deviceType.toLowerCase() as 'desktop' | 'mobile'] || [];

    if (currentDeviceAds.length === 0) {
        return (
            <div className={`text-center py-8 text-gray-500 text-sm ${className}`}>
                현재 게시된 사이드 배너 광고가 없습니다.
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            {currentDeviceAds.length > 0 && <BannerAd ad={currentDeviceAds[0]} onClick={handleAdClick} />}
        </div>
    );
}
