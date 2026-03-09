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

export function HomeInfoSection() {
    const { union } = useSlug();

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

    return (
        <section
            className="bg-white border border-[#cdd1d5] rounded-[6px] lg:rounded-[10px] p-[12px] lg:p-[24px] overflow-hidden"
            aria-labelledby="info-section-title"
        >
            {/* 섹션 제목 */}
            <h3
                id="info-section-title"
                className="font-semibold text-[14px] lg:text-[22px] text-[#1e2124] tracking-[1px] mb-[16px] lg:mb-[30px]"
            >
                재개발 정보
            </h3>

            {/* 콘텐츠: 2x2 배너(유동) + 조합 정보(고정, 1열 5행) */}
            <div className="flex flex-col-reverse lg:flex-row gap-[16px] lg:gap-[20px]">
                {/* 2x2 배너 그리드 - 유동 너비 (커뮤니티 섹션 유무에 따라 줄어듦) */}
                <nav
                    className="grid grid-cols-2 gap-[8px] lg:gap-[12px] flex-1 min-w-0"
                    aria-label="외부 재개발 정보 링크"
                >
                    {INFO_LINKS.map((link) => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative h-full rounded-[6px] lg:rounded-[6px] border border-[#e6e8ea] overflow-hidden flex items-center justify-center transition-[border-color,box-shadow] duration-200 hover:border-[#2f7f5f] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 outline-none group"
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

                {/* 조합 정보 - 고정 너비, 1열 5행 */}
                <div className="lg:w-[240px] shrink-0 bg-[#f4f5f6] rounded-[10px] lg:rounded-[12px] px-[16px] py-[12px] lg:px-[20px] lg:py-[16px]">
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
        </section>
    );
}
