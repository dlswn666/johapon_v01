'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { Notice, Question, FreeBoard } from '@/app/_lib/shared/type/database.types';
import { NewsTabType } from './types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { BoardAdWidget } from '@/app/_lib/features/advertisement/ui/BoardAdWidget';

interface UnionNewsSectionProps {
    unionId: string;
}

export function UnionNewsSection({ unionId }: UnionNewsSectionProps) {
    // unionId는 추후 확장성을 위해 유지 (현재는 useSlug 내부에서 처리)
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    unionId;
    
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<NewsTabType>('notice');
    const { union, slug } = useSlug();
    const { data: notices, isLoading, error, refetch } = useNotices();
    
    // 질문 목록 조회 (공개 질문만, 최신순)
    const { data: questions, isLoading: isQuestionsLoading, error: questionsError, refetch: refetchQuestions } = useQuery({
        queryKey: ['questions-home', union?.id],
        queryFn: async () => {
            if (!union?.id) return [];
            
            const { data, error } = await supabase
                .from('questions')
                .select('*, author:users!questions_author_id_fkey(id, name)')
                .eq('union_id', union.id)
                .eq('is_secret', false) // 공개 질문만
                .order('created_at', { ascending: false })
                .limit(4);
            
            if (error) throw error;
            return data as (Question & { author: { id: string; name: string } | null })[];
        },
        enabled: !!union?.id,
    });

    // 자유 게시판 목록 조회 (최신순, 4개)
    const { data: freeBoards, isLoading: isFreeBoardsLoading, error: freeBoardsError, refetch: refetchFreeBoards } = useQuery({
        queryKey: ['freeBoards-home', union?.id],
        queryFn: async () => {
            if (!union?.id) return [];
            
            const { data, error } = await supabase
                .from('free_boards')
                .select('*, author:users!free_boards_author_id_fkey(id, name)')
                .eq('union_id', union.id)
                .order('created_at', { ascending: false })
                .limit(4);
            
            if (error) throw error;
            return data as (FreeBoard & { author: { id: string; name: string } | null })[];
        },
        enabled: !!union?.id,
    });

    // 클릭 핸들러 - 공지사항 상세 페이지로 이동
    const handleNoticeClick = useCallback((noticeId: number) => {
        router.push(`/${slug}/news/notice/${noticeId}`);
    }, [router, slug]);

    // 클릭 핸들러 - 자유 게시판 상세 페이지로 이동
    const handleFreeBoardClick = useCallback((freeBoardId: number) => {
        router.push(`/${slug}/free-board/${freeBoardId}`);
    }, [router, slug]);

    // 클릭 핸들러 - 질문 상세 페이지로 이동
    const handleQuestionClick = useCallback((questionId: number) => {
        router.push(`/${slug}/news/qna/${questionId}`);
    }, [router, slug]);

    // 공지사항 작성자 ID 목록 추출
    const authorIds = useMemo(() => {
        if (!notices || notices.length === 0) return [];
        return [...new Set(notices.map((n) => n.author_id))];
    }, [notices]);

    // 작성자 정보 조회
    const { data: authors } = useQuery({
        queryKey: ['authors', authorIds],
        queryFn: async () => {
            if (authorIds.length === 0) return [];
            const { data, error } = await supabase
                .from('users')
                .select('id, name')
                .in('id', authorIds);

            if (error) {
                console.error('Failed to fetch authors:', error);
                return [];
            }

            return data || [];
        },
        enabled: authorIds.length > 0,
    });

    // 작성자 이름 매핑
    const authorMap = useMemo(() => {
        const map: Record<string, string> = {};
        if (authors) {
            authors.forEach((author) => {
                map[author.id] = author.name;
            });
        }
        return map;
    }, [authors]);

    // 날짜 포맷팅 헬퍼
    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko });
        } catch {
            return dateString;
        }
    };

    // HTML 태그 제거 함수
    const stripHtmlTags = (html: string): string => {
        if (!html) return '';
        
        // HTML 요소 제거 (모든 태그 제거)
        let text = html.replace(/<[^>]*>/g, '');
        
        // HTML 엔티티 디코딩
        text = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'");
        
        // 연속된 공백을 하나로 정리
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    };

    // 공지사항 내용 요약 (HTML 제거 후 최대 100자)
    const truncateContent = (content: string, maxLength: number = 100) => {
        if (!content) return '';
        
        // HTML 태그 제거
        const plainText = stripHtmlTags(content);
        
        // 길이 제한 적용
        if (plainText.length <= maxLength) return plainText;
        return plainText.substring(0, maxLength) + '\u2026';
    };

    // 공지사항 작성자 이름 가져오기
    const getAuthorName = (notice: Notice) => {
        return authorMap[notice.author_id] || '조합 사무국';
    };

    return (
        <section className="bg-gray-50 py-8 md:py-[54px] px-4">
            <div className="container mx-auto max-w-[1296px]">
                {/* 섹션 제목 */}
                <h2
                    className="font-bold text-[#4e8c6d] mb-6 md:mb-[54px] [text-wrap:balance]"
                    style={{
                        fontSize: 'var(--text-section-title)',
                        lineHeight: 'var(--leading-section-title)'
                    }}
                >
                    조합 소식
                </h2>

                {/* 탭 메뉴 */}
                <div className="flex gap-2 md:gap-[18px] border-b-2 border-gray-200 pb-[2px] overflow-x-auto" role="tablist" aria-label="조합 소식 카테고리">
                    <button
                        onClick={() => setActiveTab('notice')}
                        className={cn(
                            'h-auto md:h-[52.375px] px-3 md:px-[27px] py-2 md:pb-[22px] md:pt-0 rounded-tl-[8px] md:rounded-tl-[13.5px] rounded-tr-[8px] md:rounded-tr-[13.5px] transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2',
                            activeTab === 'notice'
                                ? 'bg-[#4e8c6d] text-white font-bold'
                                : 'text-[#4a5565] font-medium hover:text-[#4e8c6d]'
                        )}
                        role="tab"
                        aria-selected={activeTab === 'notice'}
                        aria-controls="tabpanel-notice"
                        id="tab-notice"
                    >
                        <span style={{ fontSize: 'var(--text-tab)' }}>공지사항</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            'h-auto md:h-[52.375px] px-3 md:px-[27px] py-2 md:pb-[22px] md:pt-0 transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2',
                            activeTab === 'general'
                                ? 'bg-[#4e8c6d] text-white font-bold rounded-tl-[8px] md:rounded-tl-[13.5px] rounded-tr-[8px] md:rounded-tr-[13.5px]'
                                : 'text-[#4a5565] font-medium hover:text-[#4e8c6d]'
                        )}
                        role="tab"
                        aria-selected={activeTab === 'general'}
                        aria-controls="tabpanel-general"
                        id="tab-general"
                    >
                        <span style={{ fontSize: 'var(--text-tab)' }}>일반 게시물</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('question')}
                        className={cn(
                            'h-auto md:h-[52.375px] px-3 md:px-[27px] py-2 md:pb-[22px] md:pt-0 transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2',
                            activeTab === 'question'
                                ? 'bg-[#4e8c6d] text-white font-bold rounded-tl-[8px] md:rounded-tl-[13.5px] rounded-tr-[8px] md:rounded-tr-[13.5px]'
                                : 'text-[#4a5565] font-medium hover:text-[#4e8c6d]'
                        )}
                        role="tab"
                        aria-selected={activeTab === 'question'}
                        aria-controls="tabpanel-question"
                        id="tab-question"
                    >
                        <span style={{ fontSize: 'var(--text-tab)' }}>질문</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('partner')}
                        className={cn(
                            'h-auto md:h-[52.375px] px-3 md:px-[27px] py-2 md:pb-[22px] md:pt-0 transition-colors cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2',
                            activeTab === 'partner'
                                ? 'bg-[#4e8c6d] text-white font-bold rounded-tl-[8px] md:rounded-tl-[13.5px] rounded-tr-[8px] md:rounded-tr-[13.5px]'
                                : 'text-[#4a5565] font-medium hover:text-[#4e8c6d]'
                        )}
                        role="tab"
                        aria-selected={activeTab === 'partner'}
                        aria-controls="tabpanel-partner"
                        id="tab-partner"
                    >
                        <span style={{ fontSize: 'var(--text-tab)' }}>협력 업체</span>
                    </button>
                </div>

                {/* 콘텐츠 영역 */}
                <div className="mt-4 md:mt-[27px] space-y-4 md:space-y-[27px]" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                    {activeTab === 'notice' && (
                        <>
                            {isLoading ? (
                                <div className="w-full">
                                    <Skeleton className="w-full h-[400px] rounded-[24px] opacity-70" />
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <AlertCircle className="w-12 h-12 text-red-500" />
                                    <p className="text-lg text-gray-600">공지사항을 불러오는 중 오류가 발생했습니다.</p>
                                    <button
                                        onClick={() => refetch()}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#4e8c6d] text-white rounded-lg hover:bg-[#3d7a5c] transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        다시 시도
                                    </button>
                                </div>
                            ) : notices && notices.length > 0 ? (
                                <>
                                    {/* 주요 공지 카드 */}
                                    {notices[0] && (
                                        <article
                                            onClick={() => handleNoticeClick(notices[0].id)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleNoticeClick(notices[0].id)}
                                            role="button"
                                            tabIndex={0}
                                            className="bg-white border-l-4 border-[#5fa37c] border-r border-t border-b rounded-[12px] md:rounded-[17.5px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] pl-4 md:pl-[40px] pr-4 md:pr-px py-5 md:py-[37px] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2"
                                            aria-label={`공지사항: ${notices[0].title}`}
                                        >
                                            <div className="space-y-3 md:space-y-[18px]">
                                                <h3
                                                    className="font-bold text-[#333333] line-clamp-2"
                                                    style={{
                                                        fontSize: 'var(--text-card-title-lg)',
                                                        lineHeight: 'var(--leading-card-title-lg)'
                                                    }}
                                                    title={notices[0].title}
                                                >
                                                    {notices[0].title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2 md:gap-[18px]">
                                                    <span 
                                                        className="text-[#6a7282]"
                                                        style={{ fontSize: 'var(--text-body-md)', lineHeight: 'var(--leading-body-md)' }}
                                                    >
                                                        작성자: {getAuthorName(notices[0])}
                                                    </span>
                                                    <span className="text-[#6a7282] hidden md:inline" style={{ fontSize: 'var(--text-body-md)' }}>•</span>
                                                    <span
                                                        className="text-[#6a7282] tabular-nums"
                                                        style={{ fontSize: 'var(--text-body-md)', lineHeight: 'var(--leading-body-md)' }}
                                                    >
                                                        {formatDate(notices[0].created_at)}
                                                    </span>
                                                </div>
                                                <p 
                                                    className="text-[#364153]"
                                                    style={{ fontSize: 'var(--text-body-lg)', lineHeight: 'var(--leading-body-lg)' }}
                                                >
                                                    {truncateContent(notices[0].content)}
                                                </p>
                                            </div>
                                        </article>
                                    )}

                                    {/* 하단 3개 카드 그리드 */}
                                    {notices.length > 1 && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[18px]">
                                            {notices.slice(1, 4).map((notice) => (
                                                <article
                                                    key={notice.id}
                                                    onClick={() => handleNoticeClick(notice.id)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleNoticeClick(notice.id)}
                                                    role="button"
                                                    tabIndex={0}
                                                    className="bg-white border border-gray-200 rounded-[10px] md:rounded-[13.5px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] pl-4 md:pl-[28px] pr-4 md:pr-px py-4 md:py-[28px] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#4E8C6D] focus-visible:ring-offset-2"
                                                    aria-label={`공지사항: ${notice.title}`}
                                                >
                                                    <div className="space-y-2 md:space-y-[13.5px]">
                                                        <h4 
                                                            className="font-bold text-[#333333] line-clamp-2"
                                                            style={{ 
                                                                fontSize: 'var(--text-card-title-md)', 
                                                                lineHeight: 'var(--leading-card-title-md)' 
                                                            }}
                                                        >
                                                            {notice.title}
                                                        </h4>
                                                        <div className="space-y-1 md:space-y-[4.5px]">
                                                            <p 
                                                                className="text-[#6a7282]"
                                                                style={{ fontSize: 'var(--text-body-sm)', lineHeight: 'var(--leading-body-sm)' }}
                                                            >
                                                                작성자: {getAuthorName(notice)}
                                                            </p>
                                                            <p
                                                                className="text-[#6a7282] tabular-nums"
                                                                style={{ fontSize: 'var(--text-body-sm)', lineHeight: 'var(--leading-body-sm)' }}
                                                            >
                                                                {formatDate(notice.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-lg text-gray-500">등록된 공지사항이 없습니다.</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'general' && (
                        <>
                            {isFreeBoardsLoading ? (
                                <div className="w-full">
                                    <Skeleton className="w-full h-[400px] rounded-[24px] opacity-70" />
                                </div>
                            ) : freeBoardsError ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <AlertCircle className="w-12 h-12 text-red-500" />
                                    <p className="text-lg text-gray-600">게시물을 불러오는 중 오류가 발생했습니다.</p>
                                    <button
                                        onClick={() => refetchFreeBoards()}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#4e8c6d] text-white rounded-lg hover:bg-[#3d7a5c] transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        다시 시도
                                    </button>
                                </div>
                            ) : freeBoards && freeBoards.length > 0 ? (
                                <div className="space-y-4 md:space-y-[27px]">
                                    {/* 주요 게시물 카드 */}
                                    {freeBoards[0] && (
                                        <div 
                                            onClick={() => handleFreeBoardClick(freeBoards[0].id)}
                                            className="bg-white border-l-4 border-[#5fa37c] border-r border-t border-b rounded-[12px] md:rounded-[17.5px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] pl-4 md:pl-[40px] pr-4 md:pr-px py-5 md:py-[37px] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                                        >
                                            <div className="space-y-3 md:space-y-[18px]">
                                                <h3
                                                    className="font-bold text-[#333333] line-clamp-2"
                                                    style={{
                                                        fontSize: 'var(--text-card-title-lg)',
                                                        lineHeight: 'var(--leading-card-title-lg)'
                                                    }}
                                                    title={freeBoards[0].title}
                                                >
                                                    {freeBoards[0].title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2 md:gap-[18px]">
                                                    <span 
                                                        className="text-[#6a7282]"
                                                        style={{ fontSize: 'var(--text-body-md)', lineHeight: 'var(--leading-body-md)' }}
                                                    >
                                                        작성자: {freeBoards[0].author?.name || '익명'}
                                                    </span>
                                                    <span className="text-[#6a7282] hidden md:inline" style={{ fontSize: 'var(--text-body-md)' }}>•</span>
                                                    <span
                                                        className="text-[#6a7282] tabular-nums"
                                                        style={{ fontSize: 'var(--text-body-md)', lineHeight: 'var(--leading-body-md)' }}
                                                    >
                                                        {formatDate(freeBoards[0].created_at)}
                                                    </span>
                                                </div>
                                                <p 
                                                    className="text-[#364153]"
                                                    style={{ fontSize: 'var(--text-body-lg)', lineHeight: 'var(--leading-body-lg)' }}
                                                >
                                                    {truncateContent(freeBoards[0].content)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 하단 3개 카드 그리드 */}
                                    {freeBoards.length > 1 && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[18px]">
                                            {freeBoards.slice(1, 4).map((post) => (
                                                <div
                                                    key={post.id}
                                                    onClick={() => handleFreeBoardClick(post.id)}
                                                    className="bg-white border border-gray-200 rounded-[10px] md:rounded-[13.5px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] pl-4 md:pl-[28px] pr-4 md:pr-px py-4 md:py-[28px] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                                                >
                                                    <div className="space-y-2 md:space-y-[13.5px]">
                                                        <h4 
                                                            className="font-bold text-[#333333] line-clamp-2"
                                                            style={{ 
                                                                fontSize: 'var(--text-card-title-md)', 
                                                                lineHeight: 'var(--leading-card-title-md)' 
                                                            }}
                                                        >
                                                            {post.title}
                                                        </h4>
                                                        <div className="space-y-1 md:space-y-[4.5px]">
                                                            <p 
                                                                className="text-[#6a7282]"
                                                                style={{ fontSize: 'var(--text-body-sm)', lineHeight: 'var(--leading-body-sm)' }}
                                                            >
                                                                작성자: {post.author?.name || '익명'}
                                                            </p>
                                                            <p
                                                                className="text-[#6a7282] tabular-nums"
                                                                style={{ fontSize: 'var(--text-body-sm)', lineHeight: 'var(--leading-body-sm)' }}
                                                            >
                                                                {formatDate(post.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-lg text-gray-500">등록된 게시물이 없습니다.</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'question' && (
                        <>
                            {isQuestionsLoading ? (
                                <div className="w-full">
                                    <Skeleton className="w-full h-[400px] rounded-[24px] opacity-70" />
                                </div>
                            ) : questionsError ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <AlertCircle className="w-12 h-12 text-red-500" />
                                    <p className="text-lg text-gray-600">질문을 불러오는 중 오류가 발생했습니다.</p>
                                    <button
                                        onClick={() => refetchQuestions()}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#4e8c6d] text-white rounded-lg hover:bg-[#3d7a5c] transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        다시 시도
                                    </button>
                                </div>
                            ) : questions && questions.length > 0 ? (
                                <div className="space-y-4 md:space-y-[27px]">
                                    {/* 주요 질문 카드 */}
                                    {questions[0] && (
                                        <div 
                                            onClick={() => handleQuestionClick(questions[0].id)}
                                            className="bg-white border-l-4 border-[#5fa37c] border-r border-t border-b rounded-[12px] md:rounded-[17.5px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] pl-4 md:pl-[40px] pr-4 md:pr-px py-5 md:py-[37px] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                                        >
                                            <div className="space-y-3 md:space-y-[18px]">
                                                <div className="flex flex-wrap items-center gap-2 md:gap-[12px]">
                                                    <h3
                                                        className="font-bold text-[#333333] line-clamp-2"
                                                        style={{
                                                            fontSize: 'var(--text-card-title-lg)',
                                                            lineHeight: 'var(--leading-card-title-lg)'
                                                        }}
                                                        title={questions[0].title}
                                                    >
                                                        {questions[0].title}
                                                    </h3>
                                                    {questions[0].answered_at && (
                                                        <span className="inline-flex items-center gap-1 px-2 md:px-3 py-1 bg-[#4e8c6d] text-white text-[12px] md:text-[14px] rounded-full">
                                                            <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                                                            답변완료
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 md:gap-[18px]">
                                                    <span 
                                                        className="text-[#6a7282]"
                                                        style={{ fontSize: 'var(--text-body-md)', lineHeight: 'var(--leading-body-md)' }}
                                                    >
                                                        작성자: {questions[0].author?.name || '익명'}
                                                    </span>
                                                    <span className="text-[#6a7282] hidden md:inline" style={{ fontSize: 'var(--text-body-md)' }}>•</span>
                                                    <span
                                                        className="text-[#6a7282] tabular-nums"
                                                        style={{ fontSize: 'var(--text-body-md)', lineHeight: 'var(--leading-body-md)' }}
                                                    >
                                                        {formatDate(questions[0].created_at || '')}
                                                    </span>
                                                </div>
                                                <p 
                                                    className="text-[#364153]"
                                                    style={{ fontSize: 'var(--text-body-lg)', lineHeight: 'var(--leading-body-lg)' }}
                                                >
                                                    {truncateContent(questions[0].content)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 하단 3개 카드 그리드 */}
                                    {questions.length > 1 && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[18px]">
                                            {questions.slice(1, 4).map((question) => (
                                                <div
                                                    key={question.id}
                                                    onClick={() => handleQuestionClick(question.id)}
                                                    className="bg-white border border-gray-200 rounded-[10px] md:rounded-[13.5px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] pl-4 md:pl-[28px] pr-4 md:pr-px py-4 md:py-[28px] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                                                >
                                                    <div className="space-y-2 md:space-y-[13.5px]">
                                                        <div className="flex items-center gap-2 md:gap-[8px]">
                                                            <h4 
                                                                className="font-bold text-[#333333] line-clamp-2"
                                                                style={{ 
                                                                    fontSize: 'var(--text-card-title-md)', 
                                                                    lineHeight: 'var(--leading-card-title-md)' 
                                                                }}
                                                            >
                                                                {question.title}
                                                            </h4>
                                                            {question.answered_at && (
                                                                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-[#4e8c6d] shrink-0" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-1 md:space-y-[4.5px]">
                                                            <p 
                                                                className="text-[#6a7282]"
                                                                style={{ fontSize: 'var(--text-body-sm)', lineHeight: 'var(--leading-body-sm)' }}
                                                            >
                                                                작성자: {question.author?.name || '익명'}
                                                            </p>
                                                            <p
                                                                className="text-[#6a7282] tabular-nums"
                                                                style={{ fontSize: 'var(--text-body-sm)', lineHeight: 'var(--leading-body-sm)' }}
                                                            >
                                                                {formatDate(question.created_at || '')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-lg text-gray-500">등록된 질문이 없습니다.</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'partner' && (
                        <div className="py-4">
                            <BoardAdWidget />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

