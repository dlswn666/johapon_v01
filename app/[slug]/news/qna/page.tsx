'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, Lock, CheckCircle, User } from 'lucide-react';
import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useQuestions } from '@/app/_lib/features/question/api/useQuestionHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { ListCard, ListCardItem } from '@/app/_lib/widgets/common/list-card';
import { formatDate, formatAuthorName } from '@/app/_lib/shared/utils/commonUtil';

const QnAPage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { user } = useAuth();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: questions, isLoading, isFetching, error } = useQuestions(!isUnionLoading, searchQuery);

    // isLoading: 첫 로딩, isFetching: 새로고침/재조회 시
    const showSkeleton = isUnionLoading || isLoading || (isFetching && !questions);

    const handleSearch = () => {
        setSearchQuery(searchInput);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    if (showSkeleton) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">데이터를 불러오는 중 오류가 발생했습니다.</p>
                </div>
            </div>
        );
    }

    // QnA 데이터를 ListCardItem 형태로 변환
    const listItems: ListCardItem[] = (questions || []).map((question) => {
        const isMine = question.author_id === user?.id;

        return {
            id: question.id,
            title: question.is_secret && !isMine ? '비밀글입니다.' : question.title,
            author: formatAuthorName((question.author as { name: string } | null)?.name),
            date: question.created_at ? formatDate(question.created_at) : '-',
            views: question.views ?? 0,
            isMine,
        };
    });

    // 답변 상태 배지 렌더링
    const renderBadge = (item: ListCardItem) => {
        const question = questions?.find((q) => q.id === item.id);
        if (!question) return null;

        return question.answered_at ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#4E8C6D] text-white text-[12px] rounded-full">
                <CheckCircle className="h-3 w-3" />
                답변완료
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F0AD4E] text-white text-[12px] rounded-full">
                대기중
            </span>
        );
    };

    // 비밀글 아이콘 렌더링
    const renderTitlePrefix = (item: ListCardItem) => {
        const question = questions?.find((q) => q.id === item.id);
        if (!question?.is_secret) return null;

        return <Lock className="h-4 w-4 text-[#AFAFAF] shrink-0" />;
    };

    // 내 글 표시 렌더링
    const renderTitleSuffix = (item: ListCardItem) => {
        if (!item.isMine) return null;

        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#5FA37C] text-white text-[10px] rounded-full shrink-0">
                <User className="h-3 w-3" />내 글
            </span>
        );
    };

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h2 className={cn('text-[32px] font-bold text-[#5FA37C]')}>질문 게시판</h2>
                    <Button
                        className="bg-[#4E8C6D] hover:bg-[#5FA37C] text-white text-[16px] px-6 py-2 rounded-[8px] cursor-pointer"
                        onClick={() => router.push(`/${slug}/news/qna/new`)}
                    >
                        질문하기
                    </Button>
                </div>

                {/* 검색 영역 */}
                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1 max-w-[400px]">
                        <Input
                            type="text"
                            placeholder="제목, 내용, 작성자로 검색"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="pl-10 h-[44px] text-[16px] border-[#CCCCCC] rounded-[8px]"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <Button
                        onClick={handleSearch}
                        className="bg-[#E6E6E6] text-[#4A4A4A] hover:bg-[#D9D9D9] px-6 h-[44px] rounded-[8px] cursor-pointer"
                    >
                        검색
                    </Button>
                </div>

                <ListCard
                    items={listItems}
                    onItemClick={(id) => router.push(`/${slug}/news/qna/${id}`)}
                    emptyMessage={searchQuery ? '검색 결과가 없습니다.' : '등록된 질문이 없습니다.'}
                    renderBadge={renderBadge}
                    renderTitlePrefix={renderTitlePrefix}
                    renderTitleSuffix={renderTitleSuffix}
                />
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default QnAPage;
