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
        <div className="flex items-center justify-between gap-[10px] h-[24px]">
            <div className="flex items-center gap-[10px]">
                <div className="text-[#33363d]">{icon}</div>
                <span className="text-[14px] font-light text-[#33363d]">{label}</span>
            </div>
            <span className="text-[12px] font-light text-[#33363d]">{displayValue}</span>
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
    const visitorCount = 3;

    return (
        <section
            className="bg-white border border-[#cdd1d5] rounded-[5px] lg:rounded-[12px] p-[12px] lg:p-[24px] overflow-hidden"
            aria-labelledby="info-section-title"
        >
            {/* 섹션 제목 */}
            <h3
                id="info-section-title"
                className="font-semibold text-[14px] lg:text-[22px] text-[#1e2124] tracking-[1px] mb-[16px] lg:mb-[30px]"
            >
                재개발 정보
            </h3>

            {/* 콘텐츠: 2x2 그리드 + 조합 정보 카드 */}
            <div className="flex gap-[16px] lg:gap-[20px]">
                {/* 2x2 그리드 - Figma: min-w-[500px], grid */}
                <nav
                    className="flex-1 grid grid-cols-2 grid-rows-2 gap-[8px] lg:gap-[20px] min-w-0 lg:min-w-[500px]"
                    aria-label="외부 재개발 정보 링크"
                >
                    {INFO_LINKS.map((link) => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-[50px] lg:h-[74px] rounded-[4px] lg:rounded-[8px] border border-[#e6e8ea] overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 outline-none"
                            style={{ backgroundColor: link.bgColor }}
                            aria-label={`${link.label} (새 창에서 열림)`}
                        >
                            <Image
                                src={link.icon}
                                alt=""
                                width={140}
                                height={34}
                                className="object-contain w-[80px] lg:w-[120px] h-auto"
                                aria-hidden="true"
                            />
                        </a>
                    ))}
                </nav>

                {/* 조합 정보 카드 - Figma: w-166px, bg-[#f4f5f6], rounded-[8px] */}
                <div className="hidden lg:flex flex-col gap-[8px] w-[166px] bg-[#f4f5f6] rounded-[8px] px-[15px] py-[10px] justify-center shrink-0">
                    <StatItem
                        icon={<Eye className="w-[20px] h-[20px]" />}
                        label="접속자 수"
                        value={visitorCount ? `${visitorCount}명` : null}
                    />
                    <StatItem
                        icon={<Users className="w-[20px] h-[20px]" />}
                        label="조합원 수"
                        value={union?.member_count ? `${union.member_count}명` : null}
                    />
                    <StatItem
                        icon={<Square className="w-[20px] h-[20px]" />}
                        label="면적"
                        value={union?.area_size ? `${union.area_size}평` : null}
                    />
                    <StatItem
                        icon={<Layers className="w-[20px] h-[20px]" />}
                        label="단계"
                        value={currentStage?.stage_name}
                    />
                    <StatItem
                        icon={<BarChart3 className="w-[20px] h-[20px]" />}
                        label="동의율"
                        value={consentRate ? `${consentRate}%` : null}
                    />
                </div>
            </div>
        </section>
    );
}
