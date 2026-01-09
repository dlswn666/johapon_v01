'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { Notice, FreeBoard } from '@/app/_lib/shared/type/database.types';

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

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy-MM-dd', { locale: ko });
        } catch {
            return dateString;
        }
    };

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

    // 모바일용 날짜 포맷팅 (MM/dd)
    const formatDateMobile = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MM/dd', { locale: ko });
        } catch {
            return dateString;
        }
    };

    // 게시글 아이템 렌더링
    const renderBoardItem = (
        item: Notice | FreeBoard | { id: number; title: string; created_at: string; views?: number },
        index: number
    ) => {
        const handleClick = () => {
            if (activeTab === 'notice') handleNoticeClick(item.id);
            else if (activeTab === 'union-info') handleUnionInfoClick(item.id);
            else if (activeTab === 'free-board') handleFreeBoardClick(item.id);
        };

        return (
            <div
                key={item.id}
                onClick={handleClick}
                className={cn(
                    'flex items-center justify-between p-[5px] md:p-[10px] cursor-pointer hover:bg-gray-50 transition-colors',
                    index < (data?.length || 0) - 1 && 'border-b border-[#bcbcbc]'
                )}
            >
                <div className="flex items-center gap-[6px] md:gap-[13px] flex-1 min-w-0">
                    <span className="font-medium md:font-semibold text-[14px] md:text-[20px] text-black tracking-[0.5px] md:tracking-[1px] truncate">
                        {item.title}
                    </span>
                </div>
                {/* PC에서는 yyyy-MM-dd, 모바일에서는 MM/dd */}
                <span className="hidden md:block font-semibold text-[20px] text-[#777] tracking-[1px] whitespace-nowrap ml-2">
                    {formatDate(item.created_at)}
                </span>
                <span className="block md:hidden font-semibold text-[10px] text-[#777] tracking-[0.5px] whitespace-nowrap ml-2">
                    {formatDateMobile(item.created_at)}
                </span>
            </div>
        );
    };

    return (
        <div className="flex flex-col md:flex-row gap-[16px] md:gap-[20px] items-stretch md:items-start">
            {/* 탭 버튼: 모바일(가로 스크롤, 중앙 정렬) / PC(세로 배치) */}
            <div className="flex md:flex-col gap-[10px] md:gap-[20px] shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide justify-center md:justify-start">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            // 모바일: 작은 버튼, PC: 큰 버튼
                            'h-[40px] md:h-[72px] px-[10px] md:px-[21px] rounded-[18px] md:rounded-[52px] flex items-center justify-center transition-colors cursor-pointer whitespace-nowrap shrink-0',
                            'font-bold text-[16px] md:text-[24px] tracking-[1px]',
                            activeTab === tab.id
                                ? 'bg-[#2f7f5f] text-white'
                                : 'bg-white border border-[#6fbf8f] md:border-2 text-[#2f7f5f] hover:bg-[#f0f9f4]'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 게시글 목록 - PC: 탭 버튼 영역과 동일한 고정 높이(348px), 모바일: 게시글 5개 + 헤더가 들어가는 높이(210px) */}
            <div className="w-full md:flex-1 bg-[#f4f5f6] border border-[#bcbcbc] rounded-[6px] md:rounded-[12px] p-[10px] md:p-[20px] min-h-[210px] md:min-h-0 md:h-[348px] overflow-y-auto">
                {/* 전체보기 헤더 */}
                <div className="flex items-center justify-end gap-[6px] md:gap-[13px] py-[2.5px] md:py-[5px] mb-[5px] md:mb-[10px]">
                    <button
                        onClick={handleViewAll}
                        className="flex items-center gap-[4px] md:gap-[8px] cursor-pointer hover:opacity-70 transition-opacity"
                    >
                        <span className="font-semibold text-[10px] md:text-[20px] text-[#777] tracking-[0.5px] md:tracking-[1px]">전체보기</span>
                        <ChevronRight className="size-[10px] md:size-[14px] text-[#777]" />
                    </button>
                </div>

                {/* 게시글 목록 */}
                {isLoading ? (
                    <div className="space-y-2 md:space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-[32px] md:h-[44px] w-full" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-6 md:py-10 space-y-2 md:space-y-3">
                        <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
                        <p className="text-gray-600 text-sm md:text-base">데이터를 불러오는 중 오류가 발생했습니다.</p>
                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-[#4e8c6d] text-white rounded-lg hover:bg-[#3d7a5c] transition-colors text-sm md:text-base"
                        >
                            <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                            다시 시도
                        </button>
                    </div>
                ) : activeTab === 'partner' ? (
                    <div className="flex flex-col items-center justify-center py-6 md:py-10">
                        <p className="text-gray-500 mb-3 md:mb-4 text-sm md:text-base">제휴업체 목록을 확인하세요.</p>
                        <button
                            onClick={handlePartnerClick}
                            className="px-4 py-2 md:px-6 md:py-3 bg-[#4e8c6d] text-white rounded-lg hover:bg-[#3d7a5c] transition-colors font-semibold text-sm md:text-base"
                        >
                            제휴업체 보기
                        </button>
                    </div>
                ) : data && data.length > 0 ? (
                    <div>{data.slice(0, 5).map((item, index) => renderBoardItem(item as Notice, index))}</div>
                ) : (
                    <div className="flex items-center justify-center py-6 md:py-10">
                        <p className="text-gray-500 text-sm md:text-base">등록된 게시물이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
