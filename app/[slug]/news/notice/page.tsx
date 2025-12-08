'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Paperclip, Layers, MessageCircle } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';

const NoticePage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { data: notices, isLoading, error } = useNotices(!isUnionLoading);

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
                    <h2 className={cn('text-[32px] font-bold text-[#5FA37C]')}>공지사항</h2>
                    <Button 
                        className="bg-[#4E8C6D] hover:bg-[#5FA37C] text-white text-[16px] px-6 py-2 rounded-[8px] cursor-pointer" 
                        onClick={() => router.push(`/${slug}/news/notice/new`)}
                    >
                        글쓰기
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
                            {notices && notices.length > 0 ? (
                                notices.map((notice) => (
                                    <TableRow
                                        key={notice.id}
                                        className="cursor-pointer hover:bg-[#F5F5F5] h-[56px] border-b border-[#CCCCCC] last:border-0 transition-colors"
                                        onClick={() => router.push(`/${slug}/news/notice/${notice.id}`)}
                                    >
                                        <TableCell className="text-center text-[16px] text-gray-600">{notice.id}</TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-[16px] text-gray-800">{notice.title}</span>
                                                {notice.comment_count > 0 && (
                                                    <span className="text-xs text-[#4E8C6D] font-bold shrink-0">
                                                        [{notice.comment_count}]
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {notice.file_count > 0 && (
                                                        <Paperclip className="h-4 w-4 text-gray-400" />
                                                    )}
                                                    {notice.is_popup && (
                                                        <Layers className="h-4 w-4 text-[#5FA37C]" />
                                                    )}
                                                    {notice.alimtalk_logs && notice.alimtalk_logs[0]?.count > 0 && (
                                                        <MessageCircle className="h-4 w-4 text-[#F0AD4E]" />
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center text-[14px] text-gray-500">{notice.author_id}</TableCell>
                                        <TableCell className="text-center text-[14px] text-gray-500">
                                            {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                                        </TableCell>
                                        <TableCell className="text-center text-[14px] text-gray-500">{notice.views}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-32 text-[#AFAFAF] text-[16px]">
                                        등록된 공지사항이 없습니다.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* 모달 컴포넌트 */}
            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default NoticePage;

