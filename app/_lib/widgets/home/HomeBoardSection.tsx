'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { FreeBoard } from '@/app/_lib/shared/type/database.types';
import { format } from 'date-fns';

type BoardTabType = 'notice' | 'union-info' | 'free-board' | 'partner';

interface TabItem {
    id: BoardTabType;
    label: string;
}

const TABS: TabItem[] = [
    { id: 'notice', label: '공지사항' },
    { id: 'union-info', label: '조합 정보 공유' },
    { id: 'free-board', label: '자유게시판' },
    { id: 'partner', label: '제휴업체' },
];

export function HomeBoardSection() {
    const router = useRouter();
    const { union, slug } = useSlug();
    const [activeTab, setActiveTab] = useState<BoardTabType>('notice');

    // 공지사항
    const { data: notices, isLoading: isNoticesLoading, error: noticesError, refetch: refetchNotices } = useNotices();

    // 조합 정보 공유
    const {
        data: unionInfos,
        isLoading: isUnionInfoLoading,
        error: unionInfoError,
        refetch: refetchUnionInfo,
    } = useQuery({
        queryKey: ['unionInfo-home', union?.id],
        queryFn: async () => {
            if (!union?.id) return [];
            const { data, error } = await supabase
                .from('union_info')
                .select('*, author:users!union_info_author_id_fkey(id, name)')
                .eq('union_id', union.id)
                .order('created_at', { ascending: false })
                .limit(5);
            if (error) throw error;
            return data;
        },
        enabled: !!union?.id,
    });

    // 자유게시판
    const {
        data: freeBoards,
        isLoading: isFreeBoardsLoading,
        error: freeBoardsError,
        refetch: refetchFreeBoards,
    } = useQuery({
        queryKey: ['freeBoards-home', union?.id],
        queryFn: async () => {
            if (!union?.id) return [];
            const { data, error } = await supabase
                .from('free_boards')
                .select('*, author:users!free_boards_author_id_fkey(id, name)')
                .eq('union_id', union.id)
                .order('created_at', { ascending: false })
                .limit(5);
            if (error) throw error;
            return data as (FreeBoard & { author: { id: string; name: string } | null })[];
        },
        enabled: !!union?.id,
    });

    // 클릭 핸들러들
    const handleNoticeClick = (id: number) => router.push(`/${slug}/news/notice/${id}`);
    const handleUnionInfoClick = (id: number) => router.push(`/${slug}/communication/union-info/${id}`);
    const handleFreeBoardClick = (id: number) => router.push(`/${slug}/communication/free-board/${id}`);
    const handlePartnerClick = () => router.push(`/${slug}/communication/partner`);

    // 전체보기 핸들러
    const handleViewAll = () => {
        switch (activeTab) {
            case 'notice':
                router.push(`/${slug}/news/notice`);
                break;
            case 'union-info':
                router.push(`/${slug}/communication/union-info`);
                break;
            case 'free-board':
                router.push(`/${slug}/communication/free-board`);
                break;
            case 'partner':
                router.push(`/${slug}/communication/partner`);
                break;
        }
    };

    // 현재 탭에 따른 데이터 및 상태
    const getCurrentTabData = () => {
        switch (activeTab) {
            case 'notice':
                return { data: notices, isLoading: isNoticesLoading, error: noticesError, refetch: refetchNotices };
            case 'union-info':
                return {
                    data: unionInfos,
                    isLoading: isUnionInfoLoading,
                    error: unionInfoError,
                    refetch: refetchUnionInfo,
                };
            case 'free-board':
                return {
                    data: freeBoards,
                    isLoading: isFreeBoardsLoading,
                    error: freeBoardsError,
                    refetch: refetchFreeBoards,
                };
            case 'partner':
                return { data: [], isLoading: false, error: null, refetch: () => {} };
            default:
                return { data: [], isLoading: false, error: null, refetch: () => {} };
        }
    };

    const { data, isLoading, error, refetch } = getCurrentTabData();

    // 아이템 클릭 핸들러
    const getItemClickHandler = (id: number) => {
        switch (activeTab) {
            case 'notice':
                return () => handleNoticeClick(id);
            case 'union-info':
                return () => handleUnionInfoClick(id);
            case 'free-board':
                return () => handleFreeBoardClick(id);
            default:
                return () => {};
        }
    };

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy. MM. dd');
        } catch {
            return dateString;
        }
    };

    return (
        <section className="flex flex-col lg:flex-row gap-[16px] lg:gap-[24px]">
            {/* 좌측: 세로 탭 버튼 - Figma: w-155px, h-294px */}
            <div
                className="flex lg:flex-col gap-[8px] lg:gap-0 lg:justify-between lg:w-[155px] lg:h-[294px] overflow-x-auto lg:overflow-visible scrollbar-hide shrink-0"
                role="tablist"
                aria-label="게시판 카테고리"
            >
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`tabpanel-${tab.id}`}
                        id={`tab-${tab.id}`}
                        className={cn(
                            'px-[16px] lg:px-[20px] py-[12px] lg:py-[20px] rounded-[50px] transition-colors cursor-pointer whitespace-nowrap',
                            'text-[14px] lg:text-[20px] font-semibold tracking-[1px]',
                            'outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                            'min-w-[100px] lg:w-full text-center',
                            activeTab === tab.id
                                ? 'bg-[#2f7f5f] text-white focus-visible:ring-white focus-visible:ring-offset-[#2f7f5f]'
                                : 'bg-white border-[2px] border-[#bfd7cd] text-[#2f7f5f] hover:bg-[#f0f7f4] focus-visible:ring-[#2f7f5f]'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 우측: 게시글 목록 - Figma: bg-[#f4f5f6], rounded-[16px], p-[20px] */}
            <div
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                className="flex-1 bg-[#f4f5f6] rounded-[16px] p-[16px] lg:p-[20px]"
            >
                {/* 로딩 상태 */}
                {isLoading ? (
                    <div className="flex flex-col gap-[20px]">
                        <div className="flex justify-end">
                            <Skeleton className="h-[24px] w-[80px]" />
                        </div>
                        <div className="flex flex-col gap-[10px]">
                            {[...Array(5)].map((_, i) => (
                                <div key={i}>
                                    <Skeleton className="h-[24px] w-full" />
                                    {i < 4 && <div className="border-b border-gray-200 mt-[10px]" />}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    /* 에러 상태 */
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                        <p className="text-gray-600">데이터를 불러오는 중 오류가 발생했습니다.</p>
                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-2 px-4 py-2 bg-[#2f7f5f] text-white rounded-lg hover:bg-[#267a52] transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f7f5f] outline-none"
                        >
                            <RefreshCw className="w-4 h-4" />
                            다시 시도
                        </button>
                    </div>
                ) : activeTab === 'partner' ? (
                    /* 제휴업체 탭 */
                    <div className="flex flex-col items-center justify-center py-10">
                        <p className="text-gray-500 mb-4">제휴업체 목록을 확인하세요.</p>
                        <button
                            onClick={handlePartnerClick}
                            className="px-6 py-3 bg-[#2f7f5f] text-white rounded-lg hover:bg-[#267a52] transition-colors font-semibold focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f7f5f] outline-none"
                        >
                            제휴업체 보기
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-[20px] lg:gap-[30px]">
                        {/* 전체보기 - Figma: text-[#8a949e] 18px */}
                        <div className="flex items-center justify-end">
                            <button
                                onClick={handleViewAll}
                                className="flex items-center gap-[2px] text-[#8a949e] hover:text-[#6d7882] transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 outline-none"
                            >
                                <span className="text-[14px] lg:text-[18px] font-medium tracking-[1px]">전체보기</span>
                                <ChevronRight className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />
                            </button>
                        </div>

                        {/* 게시글 목록 */}
                        {data && data.length > 0 ? (
                            <div className="flex flex-col gap-[10px]">
                                {data.slice(0, 5).map((item, index) => (
                                    <div key={(item as Record<string, unknown>).id as number}>
                                        <button
                                            onClick={getItemClickHandler((item as Record<string, unknown>).id as number)}
                                            className="w-full flex items-center justify-between py-[4px] hover:bg-white/50 rounded-md transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2"
                                        >
                                            {/* 제목 + 댓글수 */}
                                            <div className="flex items-center gap-[10px] flex-1 min-w-0">
                                                <span className="text-[14px] lg:text-[18px] font-semibold text-[#33363d] tracking-[1px] truncate">
                                                    {(item as Record<string, unknown>).title as string}
                                                </span>
                                                {/* 댓글 수 (임시로 0 표시, 실제 데이터 연동 필요) */}
                                                <span className="text-[12px] font-light text-[#6d7882] shrink-0">
                                                    [0]
                                                </span>
                                            </div>
                                            {/* 날짜 */}
                                            <span className="text-[12px] font-light text-[#6d7882] shrink-0 ml-[16px]">
                                                {formatDate((item as Record<string, unknown>).created_at as string)}
                                            </span>
                                        </button>
                                        {/* 구분선 */}
                                        {index < Math.min(data.length, 5) - 1 && (
                                            <div className="border-b border-[#cdd1d5] mt-[10px]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* 데이터 없음 상태 */
                            <div className="flex items-center justify-center py-10">
                                <p className="text-gray-500">등록된 게시물이 없습니다.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
