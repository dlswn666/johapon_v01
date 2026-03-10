'use client';

import React from 'react';
import Image from 'next/image';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Eye, Users, Square, Layers, BarChart3 } from 'lucide-react';

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
        label: '정비사업 정보통합',
        icon: '/images/home/info3.svg',
        url: 'https://www.city.go.kr',
        bgColor: '#1e2124',
    },
    {
        id: 'info3',
        label: '공공데이터 포털',
        icon: '/images/home/info4.svg',
        url: 'https://www.data.go.kr',
        bgColor: '#1e2124',
    },
    {
        id: 'info4',
        label: '국토교통부',
        icon: '/images/home/info2.svg',
        url: 'https://www.molit.go.kr',
        bgColor: '#f4f5f6',
    },
];

interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: string | number | null | undefined;
}

function StatItem({ icon, label, value }: StatItemProps) {
    const displayValue = value !== null && value !== undefined && value !== '' ? value : '-';

    return (
        <div className="flex items-center justify-between gap-[6px] lg:gap-[12px] h-[28px] lg:h-[32px]">
            <div className="flex items-center gap-[6px] lg:gap-[10px]">
                <div className="text-[#1e2124]">{icon}</div>
                <span className="text-[13px] lg:text-[16px] font-medium text-[#1e2124] whitespace-nowrap">{label}</span>
            </div>
            <span className="text-[13px] lg:text-[16px] font-semibold text-[#2f7f5f]">{displayValue}</span>
        </div>
    );
}

interface HomeInfoSectionProps {
    statsOnly?: boolean;
}

export function HomeInfoSection({ statsOnly = false }: HomeInfoSectionProps) {
    const { union } = useSlug();
    const unionName = union?.name || '조합';

    // 현재 단계 정보 조회
    const { data: currentStage } = useQuery({
        queryKey: ['currentStage', union?.current_stage_id],
        queryFn: async () => {
            if (!union?.current_stage_id) return null;
            const { data, error } = await supabase
                .from('development_stages')
                .select('stage_name')
                .eq('id', union.current_stage_id)
                .single();
            if (error) return null;
            return data;
        },
        enabled: !!union?.current_stage_id,
    });

    // 동의율, 접속자 수 (임시)
    const consentRate = null;
    const visitorCount = null;

    // statsOnly 모드: 통계 사이드바만 풀너비로 렌더링 (태블릿 전용)
    if (statsOnly) {
        return (
            <section
                className="bg-white border border-[#cdd1d5] rounded-[8px] md:rounded-[12px] lg:rounded-[10px] p-[10px] md:p-[24px] lg:p-[24px] overflow-hidden"
                aria-label="조합 통계"
            >
                <h3 className="font-bold text-[18px] md:text-[22px] lg:text-[16px] text-[#1e2124] tracking-[1px] mb-[10px] md:mb-[30px] lg:mb-[20px]">조합 현황</h3>
                <div className="bg-[#f4f5f6] rounded-[10px] px-[16px] py-[12px] md:px-[20px] md:py-[16px]">
                    <div className="flex flex-col gap-y-[8px]">
                        <StatItem
                            icon={<Eye className="w-[18px] h-[18px]" />}
                            label="접속자 수"
                            value={visitorCount ? `${visitorCount}명` : null}
                        />
                        <StatItem
                            icon={<Users className="w-[18px] h-[18px]" />}
                            label="조합원 수"
                            value={union?.member_count ? `${union.member_count}명` : null}
                        />
                        <StatItem
                            icon={<Square className="w-[18px] h-[18px]" />}
                            label="면적"
                            value={union?.area_size ? `${union.area_size}평` : null}
                        />
                        <StatItem
                            icon={<Layers className="w-[18px] h-[18px]" />}
                            label="단계"
                            value={currentStage?.stage_name}
                        />
                        <StatItem
                            icon={<BarChart3 className="w-[18px] h-[18px]" />}
                            label="동의율"
                            value={consentRate ? `${consentRate}%` : null}
                        />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className="bg-white border border-[#cdd1d5] rounded-[8px] lg:rounded-[10px] p-[10px] lg:p-[24px] overflow-hidden md:flex-1"
            aria-labelledby="info-section-title"
        >
            {/* 섹션 제목 */}
            <h3
                id="info-section-title"
                className="font-bold text-[18px] lg:text-[16px] xl:text-[22px] text-[#1e2124] tracking-[1px] mb-[10px] lg:mb-[20px] xl:mb-[30px]"
            >
                재개발 정보
            </h3>

            {/* 콘텐츠: 2x2 배너(유동) + 조합 정보(고정, 1열 5행) */}
            <div className="flex flex-col xl:flex-row gap-[16px] xl:gap-[24px]">
                {/* 2x2 배너 그리드 - 유동 너비 (커뮤니티 섹션 유무에 따라 줄어듦) */}
                <nav
                    className="grid grid-cols-2 gap-[10px] lg:gap-[12px] xl:gap-[16px] flex-1 min-w-0"
                    aria-label="외부 재개발 정보 링크"
                >
                    {INFO_LINKS.map((link) => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative h-[87px] lg:h-[70px] xl:h-[87px] rounded-[4px] lg:rounded-[6px] border border-[#cdd1d5] overflow-hidden flex items-center justify-center transition-[border-color,box-shadow] duration-200 hover:border-[#2f7f5f] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 outline-none group"
                            style={{ backgroundColor: link.bgColor }}
                            aria-label={`${link.label} (새 창에서 열림)`}
                        >
                            <Image
                                src={link.icon}
                                alt=""
                                fill
                                className="object-contain p-[10px] lg:p-[12px] group-hover:scale-105 transition-transform duration-200"
                                aria-hidden="true"
                            />
                        </a>
                    ))}
                </nav>

                {/* 조합 통계 - 모바일: 카드 하단에 표시, md/lg: 숨김(별도 섹션), xl: 사이드바 */}
                <div className="block md:hidden xl:block xl:w-[240px] shrink-0">
                    {/* 모바일 전용: 조합명 타이틀 (Figma: "미아 2구역") */}
                    <h4 className="font-bold text-[18px] text-[#1e2124] tracking-[1px] mb-[10px] md:hidden xl:hidden">
                        {unionName}
                    </h4>
                    <div className="bg-[#f4f5f6] rounded-[4px] xl:rounded-[12px] px-[15px] xl:px-[20px] py-[12px] xl:py-[16px] xl:h-auto">
                        <div className="flex flex-col gap-y-[8px] lg:gap-y-[10px]">
                            <StatItem
                                icon={<Eye className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" />}
                                label="접속자 수"
                                value={visitorCount ? `${visitorCount}명` : null}
                            />
                            <StatItem
                                icon={<Users className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" />}
                                label="조합원 수"
                                value={union?.member_count ? `${union.member_count}명` : null}
                            />
                            <StatItem
                                icon={<Square className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" />}
                                label="면적"
                                value={union?.area_size ? `${union.area_size}평` : null}
                            />
                            <StatItem
                                icon={<Layers className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" />}
                                label="단계"
                                value={currentStage?.stage_name}
                            />
                            <StatItem
                                icon={<BarChart3 className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" />}
                                label="동의율"
                                value={consentRate ? `${consentRate}%` : null}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
