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
        <div className="border border-[#cdd1d5] rounded-[8px] md:rounded-[12px] lg:rounded-[10px] px-[10px] md:px-[24px] lg:px-[24px] xl:px-[24px] py-[10px] md:py-[24px] lg:py-[24px] xl:py-[24px] flex flex-col gap-[10px] md:gap-[30px] lg:gap-[20px] xl:gap-[30px] h-[155px] md:h-full">
            {/* 섹션 제목 */}
            <h3 className="font-bold text-[18px] md:text-[22px] lg:text-[16px] xl:text-[22px] text-[#1e2124] tracking-[1px] leading-[1.2]">재개발 커뮤니티</h3>

            {/* 링크 목록 */}
            <div className="flex flex-col gap-[7px] md:gap-[20px] lg:gap-[12px] xl:gap-[20px] flex-1">
                {communityLinks.map((link) => (
                    <button
                        key={link.id}
                        onClick={() => handleLinkClick(link.url)}
                        className="w-full bg-[#f4f5f6] rounded-[4px] md:rounded-[12px] lg:rounded-[6px] xl:rounded-[12px] px-[7px] md:px-[10px] lg:px-[10px] xl:px-[10px] py-[10px] md:py-[15px] lg:py-0 xl:py-[15px] flex items-center justify-between flex-1 lg:flex-none lg:h-[70px] xl:h-auto xl:flex-1 hover:bg-[#e8e9ea] transition-colors cursor-pointer"
                    >
                        {/* 아이콘 + 라벨 */}
                        <div className="flex items-center gap-[10px] lg:gap-[6px] xl:gap-[10px]">
                            <div className="relative size-[24px] md:size-[38px] lg:size-[24px] xl:size-[38px] rounded-[6px] md:rounded-[8px] lg:rounded-[6px] xl:rounded-[8px] overflow-hidden shrink-0">
                                {link.icon}
                            </div>
                            <span className="font-semibold text-[15px] md:text-[16px] lg:text-[12px] xl:text-[16px] text-[#33363d] tracking-[0.67px] md:tracking-[1px] lg:tracking-[0px] xl:tracking-[1px] leading-[1.5] whitespace-nowrap">
                                {link.label}
                            </span>
                        </div>

                        {/* 화살표 */}
                        <div className="size-[24px] md:size-[38px] lg:size-[24px] xl:size-[38px] rounded-full bg-[#33363d] flex items-center justify-center shrink-0">
                            <ChevronRight className="size-[14px] md:size-[20px] lg:size-[14px] xl:size-[20px] text-white" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
