'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useUnionInfos } from '@/app/_lib/features/union-info/api/useUnionInfoHook';
import useUnionInfoStore from '@/app/_lib/features/union-info/model/useUnionInfoStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { BoardListCard, ListCardItem } from '@/app/_lib/widgets/common/list-card';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { formatDate, formatAuthorName } from '@/app/_lib/shared/utils/commonUtil';

export default function UnionInfoListPage() {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { user, isAdmin, isSystemAdmin } = useAuth();
    const { filters, setFilters, totalCount, resetFilters } = useUnionInfoStore();
    
    const [searchInput, setSearchInput] = useState('');

    // 페이지 진입 시 필터 초기화
    useEffect(() => {
        resetFilters();
    }, [resetFilters]);
    
    const { data, isLoading, isFetching, error } = useUnionInfos(!isUnionLoading);

    // isLoading: 첫 로딩, isFetching: 새로고침/재조회 시
    const showSkeleton = isUnionLoading || isLoading || (isFetching && !data);

    const handleSearch = () => {
        setFilters({ search: searchInput, page: 1 });
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePageChange = (newPage: number) => {
        setFilters({ page: newPage });
    };

    const totalPages = Math.ceil(totalCount / filters.pageSize);

    if (showSkeleton) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <div className="space-y-6">
                    {/* 페이지 제목 + 글쓰기 버튼 */}
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-10 w-44" />
                        <Skeleton className="h-10 w-24 rounded-[8px]" style={{ animationDelay: '50ms' }} />
                    </div>
                    {/* 검색바 */}
                    <Skeleton className="h-[44px] w-full max-w-[400px] rounded-[8px]" style={{ animationDelay: '100ms' }} />
                    {/* 게시글 목록 */}
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100">
                            <Skeleton className="h-5 flex-1" style={{ animationDelay: `${150 + i * 75}ms` }} />
                            <Skeleton className="h-4 w-20" style={{ animationDelay: `${150 + i * 75}ms` }} />
                            <Skeleton className="h-4 w-16" style={{ animationDelay: `${150 + i * 75}ms` }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-error-text">데이터를 불러오는 중 오류가 발생했습니다.</p>
                </div>
            </div>
        );
    }

    const posts = data?.data || [];

    // 조합 정보 데이터를 ListCardItem 형태로 변환
    const listItems: ListCardItem[] = posts.map((post) => {
        const isMine = post.author_id === user?.id;

        return {
            id: post.id,
            title: post.title,
            author: formatAuthorName((post.author as { name: string } | null)?.name),
            date: formatDate(post.created_at),
            views: post.views,
            commentCount: post.comment_count,
            hasAttachment: post.file_count > 0 || post.has_attachments,
            isMine,
        };
    });

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h2 className={cn('text-[32px] font-bold text-brand-light')}>조합 정보 공유</h2>
                    {(isAdmin || isSystemAdmin) && (
                        <Button
                            className="bg-brand hover:bg-brand-hover text-white text-[16px] px-6 py-2 rounded-[8px] cursor-pointer"
                            onClick={() => router.push(`/${slug}/communication/union-info/new`)}
                        >
                            글쓰기
                        </Button>
                    )}
                </div>

                {/* 검색 영역 */}
                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1 max-w-[400px]">
                        <Input
                            type="text"
                            placeholder="제목, 내용, 작성자로 검색"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="pl-10 h-[44px] text-[16px] border-subtle-border rounded-[8px]"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <Button
                        onClick={handleSearch}
                        className="bg-subtle-bg text-muted-foreground hover:bg-muted px-6 h-[44px] rounded-[8px] cursor-pointer"
                    >
                        검색
                    </Button>
                </div>

                <BoardListCard
                    items={listItems}
                    onItemClick={(id) => router.push(`/${slug}/communication/union-info/${id}`)}
                    emptyMessage={filters.search ? '검색 결과가 없습니다.' : '등록된 게시글이 없습니다.'}
                />

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePageChange(filters.page - 1)}
                            disabled={filters.page === 1}
                            className="h-[40px] w-[40px] rounded-[8px] cursor-pointer disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <Button
                                key={pageNum}
                                variant={pageNum === filters.page ? 'default' : 'outline'}
                                onClick={() => handlePageChange(pageNum)}
                                className={cn(
                                    'h-[40px] w-[40px] rounded-[8px] cursor-pointer',
                                    pageNum === filters.page && 'bg-brand hover:bg-brand-hover'
                                )}
                            >
                                {pageNum}
                            </Button>
                        ))}
                        
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePageChange(filters.page + 1)}
                            disabled={filters.page === totalPages}
                            className="h-[40px] w-[40px] rounded-[8px] cursor-pointer disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

