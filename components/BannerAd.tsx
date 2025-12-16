'use client';

import React from 'react';
import Image from 'next/image';
import { Megaphone, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BannerAdProps {
    imageUrl?: string;
    linkUrl?: string;
    description?: string; // 대체 텍스트
}

/**
 * BannerAd Component
 * 
 * - 하단 고정 (Sticky/Fixed)
 * - 닫기 버튼 없음
 * - 광고 없을 시 모집 문구 표시
 */
export function BannerAd({ imageUrl, linkUrl, description }: BannerAdProps) {
    const _router = useRouter();

    const handleRecruitClick = () => {
        // 관리자 문의 또는 광고 안내 페이지로 이동 (추후 구현)
        // 현재는 임시로 contact 페이지나 알림을 띄울 수 있음
        // router.push('/contact'); 
    };

    const handleAdClick = () => {
        if (linkUrl) {
            window.open(linkUrl, '_blank', 'noopener,noreferrer');
        }
    };

    if (imageUrl) {
        // 광고가 있는 경우
        return (
            <div className="sticky top-24 w-full z-10">
                <div 
                    className="w-full relative cursor-pointer rounded-xl overflow-hidden shadow-sm border border-gray-200"
                    onClick={handleAdClick}
                    style={{ aspectRatio: '300/300' }} // 사이드바용 정사각형 비율 권장 (임시)
                >
                    <Image
                        src={imageUrl}
                        alt={description || "광고 배너"}
                        fill
                        className="object-cover bg-white hover:scale-105 transition-transform duration-300"
                        priority
                    />
                </div>
            </div>
        );
    }

    // 광고가 없는 경우 (모집 내용)
    return (
        <div className="sticky top-24 w-full z-10 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col items-center text-center gap-4">
                {/* 상단: 아이콘 및 메인 카피 */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 bg-[#4E8C6D]/10 rounded-full flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                        <Megaphone className="w-7 h-7 text-[#4E8C6D]" />
                    </div>
                    <div className="flex flex-col items-center gap-1 mt-1">
                        <div className="flex flex-col gap-0.5 leading-tight">
                            <span className="text-[#4E8C6D] font-black text-xl">빈자리에요</span>
                            <span className="text-gray-800 font-bold text-lg">어서오세요</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-1 break-keep">
                            광고배너 문의환영
                        </p>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-100"></div>

                {/* 하단: 연락처 및 버튼 */}
                <div className="flex flex-col items-center gap-3 w-full">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500 font-medium mb-0.5">홈페이지 내 광고문의</span>
                        <a href="tel:010-3504-8164" className="text-lg font-black text-[#2d2d2d] hover:text-[#4E8C6D] transition-colors tracking-tight">
                            010-3504-8164
                        </a>
                    </div>
                    <button 
                        onClick={handleRecruitClick}
                        className="w-full py-2.5 bg-[#4E8C6D] hover:bg-[#3d7a5c] text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                        <span>문의하기</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
