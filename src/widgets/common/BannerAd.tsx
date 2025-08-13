'use client';

import Image from 'next/image';

interface BannerAdProps {
    onClick?: () => void;
}

export default function BannerAd({ onClick }: BannerAdProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="block w-full overflow-hidden rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <Image
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop"
                    alt="배너 광고"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 20vw"
                    priority
                />
            </div>
            <div className="p-3 text-left">
                <p className="text-sm text-gray-900">현대건설 건축자재 광고</p>
                <p className="text-xs text-gray-500">클릭하여 자세히 보기</p>
            </div>
        </button>
    );
}
