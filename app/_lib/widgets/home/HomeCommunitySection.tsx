'use client';

import React, { useMemo, useCallback } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { CommunityLink } from '@/app/_lib/shared/type/database.types';

interface DisplayLink {
    id: string;
    label: string;
    icon: React.ReactNode;
    url: string;
}

export function HomeCommunitySection() {
    const { union } = useSlug();

    // 조합 설정에서 활성화된 커뮤니티 링크 가져오기
    const communityLinks = useMemo(() => {
        const links = (union?.community_links as CommunityLink[] | null) || [];
        const displayLinks: DisplayLink[] = [];

        const naverCafe = links.find((link) => link.platform === 'naver_cafe' && link.active);
        const youtube = links.find((link) => link.platform === 'youtube' && link.active);

        if (naverCafe) {
            displayLinks.push({
                id: 'naver',
                label: '네이버 카페',
                icon: (
                    <Image
                        src="/images/home/naver.svg"
                        alt="네이버 카페"
                        fill
                        className="object-cover"
                    />
                ),
                url: naverCafe.url,
            });
        }

        if (youtube) {
            displayLinks.push({
                id: 'youtube',
                label: '유튜브',
                icon: (
                    <Image
                        src="/images/home/youtube.svg"
                        alt="유튜브"
                        fill
                        className="object-cover"
                    />
                ),
                url: youtube.url,
            });
        }

        return displayLinks;
    }, [union?.community_links]);

    const handleLinkClick = useCallback((url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    }, []);

    // 등록된 커뮤니티 링크가 없으면 섹션 숨김
    if (communityLinks.length === 0) {
        return null;
    }

    return (
        <div className="border border-[#cdd1d5] rounded-[11px] md:rounded-[16px] px-[10px] md:px-[33px] py-[10px] md:py-[29px] h-full">
            {/* 섹션 제목 */}
            <h3 className="font-bold text-[16px] md:text-[24px] text-black tracking-[0.67px] md:tracking-[1px] mb-[10px] md:mb-[30px]">재개발 커뮤니티</h3>

            {/* 링크 목록 */}
            <div className="flex flex-col gap-[7px] md:gap-[10px]">
                {communityLinks.map((link) => (
                    <button
                        key={link.id}
                        onClick={() => handleLinkClick(link.url)}
                        className="w-full h-[31px] md:h-[54px] bg-[#f4f5f6] rounded-[8px] md:rounded-[12px] px-[7px] md:px-[10px] py-[10px] md:py-[15px] flex items-center gap-[10px] md:gap-[15px] hover:bg-[#e8e9ea] transition-colors cursor-pointer"
                    >
                        {/* 아이콘 */}
                        <div className="relative size-[24px] md:size-[38px] rounded-[8px] md:rounded-[12px] overflow-hidden shrink-0">
                            {link.icon}
                        </div>

                        {/* 라벨 + 화살표 */}
                        <div className="flex items-center justify-between flex-1 md:w-[143px] md:shrink-0">
                            <span className="font-semibold text-[15px] md:text-[20px] text-[#131416] tracking-[0.67px] md:tracking-[1px]">
                                {link.label}
                            </span>
                            <div className="size-[16px] md:size-[24px] rounded-full bg-[#4e8c6d] flex items-center justify-center">
                                <ChevronRight className="size-[10px] md:size-[14px] text-white" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
