'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

interface CommunityLink {
    id: string;
    label: string;
    icon: string;
    url: string;
}

const COMMUNITY_LINKS: CommunityLink[] = [
    {
        id: 'naver',
        label: '네이버 카페',
        icon: '/images/home/naver.svg',
        url: 'https://cafe.naver.com', // 실제 URL은 조합 설정에서 가져올 수 있음
    },
    {
        id: 'youtube',
        label: '유튜브',
        icon: '/images/home/youtube.svg',
        url: 'https://youtube.com', // 실제 URL은 조합 설정에서 가져올 수 있음
    },
];

export function HomeCommunitySection() {
    const handleLinkClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="border border-[#cdd1d5] rounded-[16px] px-[33px] py-[29px]">
            {/* 섹션 제목 */}
            <h3 className="font-bold text-[24px] text-black tracking-[1px] mb-[30px]">재개발 커뮤니티</h3>

            {/* 링크 목록 */}
            <div className="flex flex-col gap-[10px]">
                {COMMUNITY_LINKS.map((link) => (
                    <button
                        key={link.id}
                        onClick={() => handleLinkClick(link.url)}
                        className="w-full h-[54px] bg-[#f4f5f6] rounded-[12px] px-[10px] py-[15px] flex items-center gap-[15px] hover:bg-[#e8e9ea] transition-colors cursor-pointer"
                    >
                        {/* 아이콘 */}
                        <div className="relative size-[38px] rounded-[12px] overflow-hidden shrink-0">
                            <Image src={link.icon} alt={link.label} fill className="object-cover" />
                        </div>

                        {/* 라벨 + 화살표 */}
                        <div className="flex items-center justify-between w-[143px] shrink-0">
                            <span className="font-semibold text-[20px] text-[#131416] tracking-[1px]">
                                {link.label}
                            </span>
                            <div className="size-[24px] rounded-full bg-[#4e8c6d] flex items-center justify-center">
                                <ChevronRight className="size-[14px] text-white" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
