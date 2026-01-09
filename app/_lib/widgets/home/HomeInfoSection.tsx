'use client';

import React from 'react';
import Image from 'next/image';

interface InfoLink {
    id: string;
    label: string;
    icon: string;
    url: string;
    bgColor: string;
}

const INFO_LINKS: InfoLink[] = [
    {
        id: 'info1',
        label: '토지이음',
        icon: '/images/home/info1.svg',
        url: 'https://www.eum.go.kr',
        bgColor: '#f4f5f6',
    },
    {
        id: 'info2',
        label: '국토교통부',
        icon: '/images/home/info2.svg',
        url: 'https://www.molit.go.kr',
        bgColor: '#f4f5f6',
    },
    {
        id: 'info3',
        label: '정비사업 정보통합',
        icon: '/images/home/info3.svg',
        url: 'https://www.city.go.kr',
        bgColor: '#1e2124',
    },
    {
        id: 'info4',
        label: '공공데이터 포털',
        icon: '/images/home/info4.svg',
        url: 'https://www.data.go.kr',
        bgColor: '#1e2124',
    },
];

export function HomeInfoSection() {
    const handleLinkClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="bg-white border border-[#cdd1d5] rounded-[5px] md:rounded-[12px] px-[11px] md:px-[24px] py-[12px] md:py-[28px] h-auto md:h-[235px] overflow-hidden">
            {/* 섹션 제목 */}
            <h3 className="font-bold text-[14px] md:text-[24px] text-black tracking-[0.45px] md:tracking-[1px] mb-[13px] md:mb-[30px]">재개발 정보</h3>

            {/* 링크 그리드: 모바일(가로 스크롤), PC(일반 flex) */}
            <div className="flex gap-[4px] md:gap-[10px] overflow-x-auto md:overflow-visible scrollbar-hide pb-2 md:pb-0">
                {INFO_LINKS.map((link) => (
                    <div
                        key={link.id}
                        onClick={() => handleLinkClick(link.url)}
                        className="h-[53px] md:h-[81px] w-[91px] md:w-[140px] rounded-[4px] md:rounded-[8px] border border-[#cdd1d5] overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                        style={{ backgroundColor: link.bgColor }}
                    >
                        <Image src={link.icon} alt={link.label} width={100} height={34} className="object-contain w-[62px] md:w-[100px] h-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}
