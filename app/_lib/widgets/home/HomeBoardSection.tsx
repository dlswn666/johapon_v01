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
    { id: 'free-board', label: '자유 게시판' },
    { id: 'partner', label: '제휴 업체' },
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
            if (!data || data.length === 0) return [];

            const ids = data.map((item) => item.id);
            const { data: commentCounts } = await supabase
                .from('comments')
                .select('entity_id')
                .eq('entity_type', 'union_info')
                .in('entity_id', ids);

            const commentCountMap = new Map<number, number>();
            if (commentCounts) {
                for (const c of commentCounts) {
                    commentCountMap.set(c.entity_id, (commentCountMap.get(c.entity_id) || 0) + 1);
                }
            }

            return data.map((item) => ({
                ...item,
                comment_count: commentCountMap.get(item.id) || 0,
            }));
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
            if (!data || data.length === 0) return [] as (FreeBoard & { author: { id: string; name: string } | null; comment_count: number })[];

            const ids = data.map((item) => item.id);
            const { data: commentCounts } = await supabase
                .from('comments')
                .select('entity_id')
                .eq('entity_type', 'free_board')
                .in('entity_id', ids);

            const commentCountMap = new Map<number, number>();
            if (commentCounts) {
                for (const c of commentCounts) {
                    commentCountMap.set(c.entity_id, (commentCountMap.get(c.entity_id) || 0) + 1);
                }
            }

            return data.map((item) => ({
                ...item,
                comment_count: commentCountMap.get(item.id) || 0,
            })) as (FreeBoard & { author: { id: string; name: string } | null; comment_count: number })[];
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
        <section className="w-full min-w-0 flex flex-col lg:flex-row gap-[16px] lg:gap-[12px] xl:gap-[24px] lg:items-start">
            {/* 좌측: 세로 탭 버튼 - Figma: w-155px, h-294px */}
            <div className="relative w-full min-w-0 shrink-0 lg:w-[120px] xl:w-[155px] lg:h-auto">
                {/* 모바일 스크롤 페이드 힌트 */}
                <div className="absolute right-0 top-0 bottom-0 w-[24px] bg-gradient-to-l from-white to-transparent pointer-events-none z-10 lg:hidden" />
                <div
                    className="w-full max-w-full flex lg:flex-col gap-[10px] lg:gap-[8px] xl:gap-[10px] overflow-x-auto lg:overflow-visible scrollbar-hide pr-[24px] lg:pr-0 touch-pan-x"
                    role="tablist"
                    aria-label="게시판 카테고리"
                    style={{ WebkitOverflowScrolling: 'touch' }}
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
                                'flex items-center justify-center',
                                'px-[10px] lg:px-[10px] xl:px-[20px] py-[10px] lg:py-[10px] xl:py-[20px] rounded-[20px] lg:rounded-[50px] cursor-pointer whitespace-nowrap shrink-0',
                                'text-[16px] lg:text-[13px] xl:text-[20px] font-bold tracking-[0px] lg:tracking-[0.5px] xl:tracking-[1px] leading-[1.3]',
                                'outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                'lg:flex-none lg:w-[120px] xl:w-[155px] text-center',
                                'transition-colors duration-200',
                                activeTab === tab.id
                                    ? 'bg-[#2f7f5f] text-white focus-visible:ring-white focus-visible:ring-offset-[#2f7f5f]'
                                    : 'bg-white border-[0.738px] border-[#2f7f5f] text-[#2f7f5f] hover:bg-[#f0f7f4] focus-visible:ring-[#2f7f5f]'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 우측: 게시글 목록 - Figma: bg-[#f4f5f6], rounded-[16px], p-[20px] */}
            <div
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                className="flex-1 min-w-0 bg-[#f4f5f6] rounded-[16px] p-[16px] lg:p-[16px] xl:p-[20px] lg:h-[270px] lg:overflow-hidden xl:h-auto xl:overflow-visible"
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
                    <div className="flex flex-col gap-[20px] lg:gap-[20px] xl:gap-[30px] min-w-0">
                        {/* 전체보기 - Figma: Medium 18px #8a949e tracking-[1px] */}
                        <div className="flex items-center justify-end">
                            <button
                                onClick={handleViewAll}
                                className="flex items-center gap-[2px] text-[#8a949e] hover:text-[#6d7882] transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 outline-none"
                            >
                                <span className="text-[14px] lg:text-[14px] xl:text-[18px] font-medium tracking-[1px] leading-[1.3]">전체보기</span>
                                <ChevronRight className="w-[20px] h-[20px] lg:w-[20px] lg:h-[20px] xl:w-[24px] xl:h-[24px]" />
                            </button>
                        </div>

                        {/* 게시글 목록 - Figma: gap-[10px] (구분선 포함) */}
                        {data && data.length > 0 ? (
                            <div className="flex flex-col gap-[10px]">
                                {data.slice(0, 5).map((item, index) => (
                                    <div key={(item as Record<string, unknown>).id as number}>
                                        <button
                                            onClick={getItemClickHandler((item as Record<string, unknown>).id as number)}
                                            className="w-full flex items-center justify-between hover:bg-white/60 rounded-[8px] transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2f7f5f] focus-visible:ring-offset-2 group"
                                        >
                                            {/* 제목 + 댓글수 — Figma: SemiBold 18px #33363d tracking-[1px] leading-[1.5] */}
                                            <div className="flex items-center gap-[10px] flex-1 min-w-0">
                                                <span className="text-[14px] lg:text-[14px] xl:text-[18px] font-semibold text-[#33363d] tracking-[1px] leading-[1.5] truncate group-hover:text-[#2f7f5f] transition-colors">
                                                    {(item as Record<string, unknown>).title as string}
                                                </span>
                                                {/* 댓글 수 — Figma: Medium 14px #6d7882 leading-[1.4] */}
                                                <span className="text-[12px] lg:text-[12px] xl:text-[14px] font-medium text-[#6d7882] leading-[1.4] shrink-0">
                                                    [ {(item as Record<string, unknown>).comment_count as number ?? 0} ]
                                                </span>
                                            </div>
                                            {/* 날짜 — Figma: Light 14px #6d7882 leading-[1.4] */}
                                            <span className="text-[12px] lg:text-[12px] xl:text-[14px] font-light text-[#6d7882] leading-[1.4] shrink-0 ml-[16px]">
                                                {formatDate((item as Record<string, unknown>).created_at as string)}
                                            </span>
                                        </button>
                                        {/* 구분선 — Figma: #cdd1d5 */}
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
