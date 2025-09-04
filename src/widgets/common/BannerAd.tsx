'use client';

import Image from 'next/image';
import type { AdPlacement } from '@/entities/advertisement/model/types';

interface BannerAdProps {
    ad: {
        id: string;
        title: string;
        partner_name: string;
        phone: string;
        thumbnail_url: string | null;
        detail_image_url: string;
        placement: AdPlacement;
        is_default?: boolean;
    };
    onClick?: (ad: BannerAdProps['ad']) => void;
}

export default function BannerAd({ ad, onClick }: BannerAdProps) {
    const handleClick = () => {
        if (ad.is_default) {
            alert('광고 문의: 조합 사무소로 연락해주세요.');
            return;
        }
        if (onClick) {
            onClick(ad);
        }
    };

    // 썸네일이 없으면 디테일 이미지 사용, 둘 다 없으면 기본 이미지
    const imageUrl =
        ad.thumbnail_url ||
        ad.detail_image_url ||
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop';

    return (
        <button
            type="button"
            onClick={handleClick}
            className="block w-full overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
        >
            <Image
                src={imageUrl}
                alt={`${ad.partner_name} - ${ad.title}`}
                width={400}
                height={300}
                className="w-full h-auto object-cover"
                sizes="(max-width: 1024px) 100vw, 20vw"
                priority
            />
        </button>
    );
}
