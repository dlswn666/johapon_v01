'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Search, Lock, CheckCircle, User } from 'lucide-react';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestions } from '@/app/_lib/features/question/api/useQuestionHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';

const QnAPage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { user } = useAuth();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: questions, isLoading, error } = useQuestions(!isUnionLoading, searchQuery);

    const handleSearch = () => {
        setSearchQuery(searchInput);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
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

                <div className={cn('border border-[#CCCCCC] rounded-[12px] overflow-hidden')}>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#E6E6E6] h-[56px] border-b border-[#CCCCCC] hover:bg-[#E6E6E6]">
                                <TableHead className="w-[80px] text-center text-[#4A4A4A] font-bold text-[16px]">
                                    번호
                                </TableHead>
                                <TableHead className="w-[100px] text-center text-[#4A4A4A] font-bold text-[16px]">
                                    상태
                                </TableHead>
                                <TableHead className="text-[#4A4A4A] font-bold text-[16px]">제목</TableHead>
                                <TableHead className="w-[120px] text-center text-[#4A4A4A] font-bold text-[16px]">
                                    작성자
                                </TableHead>
                                <TableHead className="w-[120px] text-center text-[#4A4A4A] font-bold text-[16px]">
                                    작성일
                                </TableHead>
                                <TableHead className="w-[100px] text-center text-[#4A4A4A] font-bold text-[16px]">
                                    조회수
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions && questions.length > 0 ? (
                                questions.map((question) => {
                                    const isMine = question.author_id === user?.id;
                                    const authorName =
                                        (question.author as { name: string } | null)?.name || question.author_id;

                                    return (
                                        <TableRow
                                            key={question.id}
                                            className={cn(
                                                'cursor-pointer hover:bg-[#F5F5F5] h-[56px] border-b border-[#CCCCCC] last:border-0 transition-colors',
                                                isMine && 'bg-[#F0F7F4]'
                                            )}
                                            onClick={() => router.push(`/${slug}/news/qna/${question.id}`)}
                                        >
                                            <TableCell className="text-center text-[16px] text-gray-600">
                                                {question.id}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {question.answered_at ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#4E8C6D] text-white text-[12px] rounded-full">
                                                        <CheckCircle className="h-3 w-3" />
                                                        답변완료
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F0AD4E] text-white text-[12px] rounded-full">
                                                        대기중
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {question.is_secret && (
                                                        <Lock className="h-4 w-4 text-[#AFAFAF] shrink-0" />
                                                    )}
                                                    <span className="truncate text-[16px] text-gray-800">
                                                        {question.is_secret && !isMine
                                                            ? '비밀글입니다.'
                                                            : question.title}
                                                    </span>
                                                    {isMine && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#5FA37C] text-white text-[10px] rounded-full shrink-0">
                                                            <User className="h-3 w-3" />내 글
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">
                                                {authorName}
                                            </TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">
                                                {new Date(question.created_at).toLocaleDateString('ko-KR')}
                                            </TableCell>
                                            <TableCell className="text-center text-[14px] text-gray-500">
                                                {question.views}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-32 text-[#AFAFAF] text-[16px]">
                                        {searchQuery ? '검색 결과가 없습니다.' : '등록된 질문이 없습니다.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default QnAPage;
