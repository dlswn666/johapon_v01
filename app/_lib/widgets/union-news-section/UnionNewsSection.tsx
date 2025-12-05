'use client';

import React, { useState, useMemo } from 'react';
import { useNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { Notice } from '@/app/_lib/shared/type/database.types';
import { mockGeneralPosts, mockQuestions } from './mockData';
import { NewsTabType } from './types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface UnionNewsSectionProps {
    unionId: string;
}

export function UnionNewsSection({ unionId }: UnionNewsSectionProps) {
    // unionId는 추후 확장성을 위해 유지 (현재는 useSlug 내부에서 처리)
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    unionId;
    
    const [activeTab, setActiveTab] = useState<NewsTabType>('notice');
    const { data: notices, isLoading, error, refetch } = useNotices();

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
        return plainText.substring(0, maxLength) + '...';
    };

    // 공지사항 작성자 이름 가져오기
    const getAuthorName = (notice: Notice) => {
        return authorMap[notice.author_id] || '조합 사무국';
    };

    return (
        <section className="bg-gray-50 py-[54px] px-4">
            <div className="container mx-auto max-w-[1296px]">
                {/* 섹션 제목 */}
                <h2 className="text-[54px] font-bold text-[#4e8c6d] leading-[70.2px] mb-[54px]">
                    조합 소식
                </h2>

                {/* 탭 메뉴 */}
                <div className="flex gap-[18px] border-b-2 border-gray-200 pb-[2px]">
                    <button
                        onClick={() => setActiveTab('notice')}
                        className={cn(
                            'h-[52.375px] px-[27px] pb-[22px] pt-0 rounded-tl-[13.5px] rounded-tr-[13.5px] transition-colors cursor-pointer',
                            activeTab === 'notice'
                                ? 'bg-[#4e8c6d] text-white font-bold'
                                : 'text-[#4a5565] font-medium hover:text-[#4e8c6d]'
                        )}
                        aria-label="공지사항 탭"
                    >
                        <span className="text-[20.25px] leading-[30.375px]">공지사항</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            'h-[52.375px] px-[27px] pb-[22px] pt-0 transition-colors cursor-pointer',
                            activeTab === 'general'
                                ? 'bg-[#4e8c6d] text-white font-bold rounded-tl-[13.5px] rounded-tr-[13.5px]'
                                : 'text-[#4a5565] font-medium hover:text-[#4e8c6d]'
                        )}
                        aria-label="일반 게시물 탭"
                    >
                        <span className="text-[20.25px] leading-[30.375px]">일반 게시물</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('question')}
                        className={cn(
                            'h-[52.375px] px-[27px] pb-[22px] pt-0 transition-colors cursor-pointer',
                            activeTab === 'question'
                                ? 'bg-[#4e8c6d] text-white font-bold rounded-tl-[13.5px] rounded-tr-[13.5px]'
                                : 'text-[#4a5565] font-medium hover:text-[#4e8c6d]'
                        )}
                        aria-label="질문 탭"
                    >
                        <span className="text-[20.25px] leading-[30.375px]">질문</span>
                    </button>
                </div>

                {/* 콘텐츠 영역 */}
                <div className="mt-[27px] space-y-[27px]">
                    {activeTab === 'notice' && (
                        <>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-[#4e8c6d]" />
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
                                        <div className="bg-white border-l-4 border-[#5fa37c] border-r border-t border-b rounded-[17.5px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] pl-[40px] pr-px py-[37px]">
                                            <div className="space-y-[18px]">
                                                <h3 className="text-[33.75px] font-bold text-[#333333] leading-[47.25px]">
                                                    {notices[0].title}
                                                </h3>
                                                <div className="flex items-center gap-[18px]">
                                                    <span className="text-[18px] text-[#6a7282] leading-[27px]">
                                                        작성자: {getAuthorName(notices[0])}
                                                    </span>
                                                    <span className="text-[18px] text-[#6a7282] leading-[27px]">•</span>
                                                    <span className="text-[18px] text-[#6a7282] leading-[27px]">
                                                        {formatDate(notices[0].created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[20.25px] text-[#364153] leading-[34.425px]">
                                                    {truncateContent(notices[0].content)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 하단 3개 카드 그리드 */}
                                    {notices.length > 1 && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
                                            {notices.slice(1, 4).map((notice) => (
                                                <div
                                                    key={notice.id}
                                                    className="bg-white border border-gray-200 rounded-[13.5px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] pl-[28px] pr-px py-[28px]"
                                                >
                                                    <div className="space-y-[13.5px]">
                                                        <h4 className="text-[20.25px] font-bold text-[#333333] leading-[30.375px] line-clamp-2">
                                                            {notice.title}
                                                        </h4>
                                                        <div className="space-y-[4.5px]">
                                                            <p className="text-[15.75px] text-[#6a7282] leading-[23.625px]">
                                                                작성자: {getAuthorName(notice)}
                                                            </p>
                                                            <p className="text-[15.75px] text-[#6a7282] leading-[23.625px]">
                                                                {formatDate(notice.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
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
                        <div className="space-y-[27px]">
                            {mockGeneralPosts.length > 0 && (
                                <>
                                    {/* 주요 게시물 카드 */}
                                    <div className="bg-white border-l-4 border-[#5fa37c] border-r border-t border-b rounded-[17.5px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] pl-[40px] pr-px py-[37px]">
                                        <div className="space-y-[18px]">
                                            <h3 className="text-[33.75px] font-bold text-[#333333] leading-[47.25px]">
                                                {mockGeneralPosts[0].title}
                                            </h3>
                                            <div className="flex items-center gap-[18px]">
                                                <span className="text-[18px] text-[#6a7282] leading-[27px]">
                                                    작성자: {mockGeneralPosts[0].author}
                                                </span>
                                                <span className="text-[18px] text-[#6a7282] leading-[27px]">•</span>
                                                <span className="text-[18px] text-[#6a7282] leading-[27px]">
                                                    {mockGeneralPosts[0].date}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 하단 3개 카드 그리드 */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
                                        {mockGeneralPosts.slice(1).map((post) => (
                                            <div
                                                key={post.id}
                                                className="bg-white border border-gray-200 rounded-[13.5px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] pl-[28px] pr-px py-[28px]"
                                            >
                                                <div className="space-y-[13.5px]">
                                                    <h4 className="text-[20.25px] font-bold text-[#333333] leading-[30.375px] line-clamp-2">
                                                        {post.title}
                                                    </h4>
                                                    <div className="space-y-[4.5px]">
                                                        <p className="text-[15.75px] text-[#6a7282] leading-[23.625px]">
                                                            작성자: {post.author}
                                                        </p>
                                                        <p className="text-[15.75px] text-[#6a7282] leading-[23.625px]">
                                                            {post.date}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'question' && (
                        <div className="space-y-[27px]">
                            {mockQuestions.length > 0 && (
                                <>
                                    {/* 주요 질문 카드 */}
                                    <div className="bg-white border-l-4 border-[#5fa37c] border-r border-t border-b rounded-[17.5px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] pl-[40px] pr-px py-[37px]">
                                        <div className="space-y-[18px]">
                                            <h3 className="text-[33.75px] font-bold text-[#333333] leading-[47.25px]">
                                                {mockQuestions[0].title}
                                            </h3>
                                            <div className="flex items-center gap-[18px]">
                                                <span className="text-[18px] text-[#6a7282] leading-[27px]">
                                                    작성자: {mockQuestions[0].author}
                                                </span>
                                                <span className="text-[18px] text-[#6a7282] leading-[27px]">•</span>
                                                <span className="text-[18px] text-[#6a7282] leading-[27px]">
                                                    {mockQuestions[0].date}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 하단 3개 카드 그리드 */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
                                        {mockQuestions.slice(1).map((question) => (
                                            <div
                                                key={question.id}
                                                className="bg-white border border-gray-200 rounded-[13.5px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] pl-[28px] pr-px py-[28px]"
                                            >
                                                <div className="space-y-[13.5px]">
                                                    <h4 className="text-[20.25px] font-bold text-[#333333] leading-[30.375px] line-clamp-2">
                                                        {question.title}
                                                    </h4>
                                                    <div className="space-y-[4.5px]">
                                                        <p className="text-[15.75px] text-[#6a7282] leading-[23.625px]">
                                                            작성자: {question.author}
                                                        </p>
                                                        <p className="text-[15.75px] text-[#6a7282] leading-[23.625px]">
                                                            {question.date}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

