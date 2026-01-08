'use client';

import React from 'react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';

// Google Material Icons 스타일 아이콘 컴포넌트들
function GroupsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85-.85-.37-1.79-.58-2.78-.58-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
        </svg>
    );
}

function SquareFootIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.66 17.66l-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06L9.7 9.7l-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06L4 4v14c0 1.1.9 2 2 2h14l-2.34-2.34zM7 17v-5.76L12.76 17H7z" />
        </svg>
    );
}

function LayersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" />
        </svg>
    );
}

function LeaderboardIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
        </svg>
    );
}

interface InfoCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number | null | undefined;
    unit?: string;
}

function InfoCard({ icon, label, value, unit }: InfoCardProps) {
    const displayValue = value !== null && value !== undefined && value !== '' ? `${value}${unit || ''}` : '-';

    return (
        <div className="bg-[#f4f5f6] rounded-[12px] px-[28px] py-[15px] h-[63px] flex items-center justify-between min-w-[240px]">
            <div className="flex items-center gap-[15px]">
                <div className="text-[#33363d]">{icon}</div>
                <span className="font-semibold text-[20px] text-[#33363d] tracking-[1px] whitespace-nowrap">
                    {label}
                </span>
            </div>
            <span className="font-normal text-[18px] text-[#33363d] tracking-[1px] whitespace-nowrap">
                {displayValue}
            </span>
        </div>
    );
}

export function HomeUnionCard() {
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

    // 동의율 계산 (user_consents 기반 - 향후 구현)
    // 현재는 임시로 null 처리
    const consentRate = null;

    // 접속자 수 (임시 - 향후 구현)
    const visitorCount = null;

    if (!union) return null;

    return (
        <div className="bg-white border border-[#cdd1d5] rounded-[12px] p-[30px] overflow-hidden relative">
            {/* 헤더 영역 */}
            <div className="flex items-center gap-[20px] mb-[20px]">
                <h3 className="font-bold text-[32px] text-black tracking-[1px]">{union.name}</h3>
                {visitorCount !== null && (
                    <span className="font-semibold text-[14px] text-[#818181]">접속자 수 : {visitorCount}명</span>
                )}
            </div>

            {/* 정보 카드들 */}
            <div className="flex gap-[34px] flex-wrap">
                <InfoCard
                    icon={<GroupsIcon className="size-[24px]" />}
                    label="조합원 수"
                    value={union.member_count}
                    unit="명"
                />
                <InfoCard
                    icon={<SquareFootIcon className="size-[24px]" />}
                    label="면적"
                    value={union.area_size}
                    unit="평"
                />
                <InfoCard icon={<LayersIcon className="size-[24px]" />} label="단계" value={currentStage?.stage_name} />
                <InfoCard
                    icon={<LeaderboardIcon className="size-[24px]" />}
                    label="동의율"
                    value={consentRate}
                    unit="%"
                />
            </div>
        </div>
    );
}
