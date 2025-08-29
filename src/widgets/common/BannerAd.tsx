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
    };
    onClick?: (ad: BannerAdProps['ad']) => void;
}

export default function BannerAd({ ad, onClick }: BannerAdProps) {
    const handleClick = () => {
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
            className="block w-full overflow-hidden rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <Image
                    src={imageUrl}
                    alt={`${ad.partner_name} - ${ad.title}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 20vw"
                    priority
                />
            </div>
            <div className="p-3 text-left">
                <p className="text-sm text-gray-900 font-medium truncate">{ad.title}</p>
                <p className="text-xs text-gray-600 truncate">{ad.partner_name}</p>
                <p className="text-xs text-gray-500 mt-1">{ad.phone}</p>
            </div>
        </button>
    );
}
