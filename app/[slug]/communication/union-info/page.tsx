'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Search, Paperclip, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUnionInfos } from '@/app/_lib/features/union-info/api/useUnionInfoHook';
import useUnionInfoStore from '@/app/_lib/features/union-info/model/useUnionInfoStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';

const UnionInfoListPage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { filters, setFilters, totalCount } = useUnionInfoStore();
    
    const [keywordInput, setKeywordInput] = useState(filters.keyword);
    const [authorInput, setAuthorInput] = useState(filters.author);
    
    const { data, isLoading, error } = useUnionInfos(!isUnionLoading);

    const handleSearch = () => {
        setFilters({ keyword: keywordInput, author: authorInput, page: 1 });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePageChange = (newPage: number) => {
        setFilters({ page: newPage });
    };

    const totalPages = Math.ceil(totalCount / filters.pageSize);

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

    const posts = data?.data || [];

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h2 className={cn('text-[32px] font-bold text-[#5FA37C]')}>조합 정보 공유</h2>
                    <Button 
                        className="bg-[#4E8C6D] hover:bg-[#5FA37C] text-white text-[16px] px-6 py-2 rounded-[8px] cursor-pointer" 
                        onClick={() => router.push(`/${slug}/communication/union-info/new`)}
                    >
                        글쓰기
                    </Button>
                </div>

                {/* 검색 영역 */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                        <Input
                            type="text"
                            placeholder="제목, 내용으로 검색"
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="pl-10 h-[44px] text-[16px] border-[#CCCCCC] rounded-[8px]"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <div className="relative flex-1 min-w-[150px] max-w-[200px]">
                        <Input
                            type="text"
                            placeholder="작성자 검색"
                            value={authorInput}
                            onChange={(e) => setAuthorInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="h-[44px] text-[16px] border-[#CCCCCC] rounded-[8px]"
                        />
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
                                <TableHead className="w-[80px] text-center text-[#4A4A4A] font-bold text-[16px]">썸네일</TableHead>
                                <TableHead className="text-[#4A4A4A] font-bold text-[16px]">제목</TableHead>
                                <TableHead className="w-[120px] text-center text-[#4A4A4A] font-bold text-[16px]">작성자</TableHead>
                                <TableHead className="w-[120px] text-center text-[#4A4A4A] font-bold text-[16px]">작성일</TableHead>
                                <TableHead className="w-[80px] text-center text-[#4A4A4A] font-bold text-[16px]">조회수</TableHead>
                                <TableHead className="w-[80px] text-center text-[#4A4A4A] font-bold text-[16px]">첨부</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {posts && posts.length > 0 ? (
                                posts.map((post, index) => {
                                    const authorName = (post.author as { name: string } | null)?.name || '알 수 없음';
                                    const rowNumber = totalCount - ((filters.page - 1) * filters.pageSize) - index;
                                    
                                    return (
                                        <TableRow
                                            key={post.id}
                                            className="cursor-pointer hover:bg-[#F5F5F5] h-[72px] border-b border-[#CCCCCC] last:border-0 transition-colors"
                                            onClick={() => router.push(`/${slug}/communication/union-info/${post.id}`)}
                                        >
                                            <TableCell className="text-center text-[16px] text-gray-600">{rowNumber}</TableCell>
                                            <TableCell className="text-center">
                                                {post.thumbnail_url ? (
                                                    <div className="w-[50px] h-[50px] mx-auto rounded-[8px] overflow-hidden bg-[#E6E6E6] relative">
                                                        <Image 
                                                            src={post.thumbnail_url} 
                                                            alt="썸네일" 
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-[50px] h-[50px] mx-auto rounded-[8px] bg-[#F5F5F5] flex items-center justify-center">
                                                        <ImageIcon className="h-5 w-5 text-[#AFAFAF]" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <span className="truncate text-[16px] text-gray-800 block max-w-[400px]">
                                                    {post.title}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">{authorName}</TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">
                                                {new Date(post.created_at).toLocaleDateString('ko-KR')}
                                            </TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">{post.views}</TableCell>
                                            <TableCell className="text-center">
                                                {post.has_attachments ? (
                                                    <Paperclip className="h-4 w-4 text-[#5FA37C] mx-auto" />
                                                ) : (
                                                    <span className="text-[#AFAFAF]">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-32 text-[#AFAFAF] text-[16px]">
                                        {filters.keyword || filters.author ? '검색 결과가 없습니다.' : '등록된 게시글이 없습니다.'}
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
                                    pageNum === filters.page && 'bg-[#4E8C6D] hover:bg-[#5FA37C]'
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

export default UnionInfoListPage;

