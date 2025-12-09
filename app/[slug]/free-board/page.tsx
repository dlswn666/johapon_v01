'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Search, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFreeBoards } from '@/app/_lib/features/free-board/api/useFreeBoardHook';
import useFreeBoardStore from '@/app/_lib/features/free-board/model/useFreeBoardStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';

const FreeBoardPage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { user } = useAuth();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const { currentPage, pageSize, totalCount, setCurrentPage } = useFreeBoardStore();
    const { data, isLoading, error } = useFreeBoards(!isUnionLoading, searchQuery, currentPage, pageSize);

    const freeBoards = data?.data || [];
    const totalPages = Math.ceil(totalCount / pageSize);

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setCurrentPage(1); // 검색 시 첫 페이지로
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // 페이지네이션 숫자 생성
    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    if (isUnionLoading || isLoading) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-gray-400">로딩 중...</p>
                </div>
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

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col gap-6 mb-[80px]">
                    <div className="flex justify-between items-center">
                        <UnionHeader />
                        <UnionNavigation />
                    </div>
                    <Separator className="bg-[#CCCCCC]" />
                </div>

                <div className={cn('flex justify-between items-center mb-6')}>
                    <h2 className={cn('text-[32px] font-bold text-[#5FA37C]')}>자유 게시판</h2>
                    <Button 
                        className="bg-[#4E8C6D] hover:bg-[#5FA37C] text-white text-[16px] px-6 py-2 rounded-[8px] cursor-pointer" 
                        onClick={() => router.push(`/${slug}/free-board/new`)}
                    >
                        글쓰기
                    </Button>
                </div>

                {/* 검색 영역 */}
                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1 max-w-[400px]">
                        <Input
                            type="text"
                            placeholder="제목, 내용으로 검색"
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

                <div className={cn('border border-[#CCCCCC] rounded-[12px] overflow-hidden')}>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#E6E6E6] h-[56px] border-b border-[#CCCCCC] hover:bg-[#E6E6E6]">
                                <TableHead className="w-[80px] text-center text-[#4A4A4A] font-bold text-[16px]">번호</TableHead>
                                <TableHead className="text-[#4A4A4A] font-bold text-[16px]">제목</TableHead>
                                <TableHead className="w-[120px] text-center text-[#4A4A4A] font-bold text-[16px]">작성자</TableHead>
                                <TableHead className="w-[120px] text-center text-[#4A4A4A] font-bold text-[16px]">작성일</TableHead>
                                <TableHead className="w-[100px] text-center text-[#4A4A4A] font-bold text-[16px]">조회수</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {freeBoards && freeBoards.length > 0 ? (
                                freeBoards.map((freeBoard) => {
                                    const isMine = freeBoard.author_id === user?.id;
                                    const authorName = (freeBoard.author as { name: string } | null)?.name || freeBoard.author_id;
                                    
                                    return (
                                        <TableRow
                                            key={freeBoard.id}
                                            className={cn(
                                                "cursor-pointer hover:bg-[#F5F5F5] h-[56px] border-b border-[#CCCCCC] last:border-0 transition-colors",
                                                isMine && "bg-[#F0F7F4]"
                                            )}
                                            onClick={() => router.push(`/${slug}/free-board/${freeBoard.id}`)}
                                        >
                                            <TableCell className="text-center text-[16px] text-gray-600">{freeBoard.id}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-[16px] text-gray-800">{freeBoard.title}</span>
                                                    {freeBoard.comment_count > 0 && (
                                                        <span className="text-xs text-[#4E8C6D] font-bold shrink-0">
                                                            [{freeBoard.comment_count}]
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {freeBoard.file_count > 0 && (
                                                            <Paperclip className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">{authorName}</TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">
                                                {new Date(freeBoard.created_at).toLocaleDateString('ko-KR')}
                                            </TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">{freeBoard.views}</TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-32 text-[#AFAFAF] text-[16px]">
                                        {searchQuery ? '검색 결과가 없습니다.' : '등록된 게시글이 없습니다.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="h-[40px] w-[40px] p-0 border-[#CCCCCC] disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        {getPageNumbers().map((page) => (
                            <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className={cn(
                                    "h-[40px] w-[40px] p-0",
                                    currentPage === page 
                                        ? "bg-[#4E8C6D] text-white hover:bg-[#5FA37C]" 
                                        : "border-[#CCCCCC] text-gray-600 hover:bg-[#F5F5F5]"
                                )}
                            >
                                {page}
                            </Button>
                        ))}
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="h-[40px] w-[40px] p-0 border-[#CCCCCC] disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* 검색 결과 정보 */}
                {totalCount > 0 && (
                    <div className="text-center mt-4 text-[14px] text-gray-500">
                        총 {totalCount}개의 게시글 중 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)}개 표시
                    </div>
                )}
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default FreeBoardPage;



