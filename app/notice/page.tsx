'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useNotices } from '@/app/_lib/shared/hooks/notice/useNoticeHook';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';

const Notice = () => {
    const router = useRouter();
    const { data: notices, isLoading, error } = useNotices();

    if (isLoading) {
        return (
            <div className={cn('container mx-auto p-6')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-muted-foreground">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn('container mx-auto p-6')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-red-600">데이터를 불러오는 중 오류가 발생했습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto p-6')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h1 className={cn('text-3xl font-bold')}>공지사항</h1>
                </div>

                <Separator className="mb-6" />
                <div className={cn('flex justify-end p-4')}>
                    <Button variant="outline" onClick={() => router.push('/notice/new')}>
                        글쓰기
                    </Button>
                </div>
                <div className={cn('border rounded-lg')}>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 h-15">
                                <TableHead className="w-[80px] text-center">번호</TableHead>
                                <TableHead>제목</TableHead>
                                <TableHead className="w-[120px] text-center">작성자</TableHead>
                                <TableHead className="w-[120px] text-center">작성일</TableHead>
                                <TableHead className="w-[100px] text-center">조회수</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notices && notices.length > 0 ? (
                                notices.map((notice) => (
                                    <TableRow
                                        key={notice.id}
                                        className="cursor-pointer hover:bg-muted/50 h-12"
                                        onClick={() => router.push(`/notice/${notice.id}`)}
                                    >
                                        <TableCell className="text-center">{notice.id}</TableCell>
                                        <TableCell className="font-medium">{notice.title}</TableCell>
                                        <TableCell className="text-center">{notice.author_id}</TableCell>
                                        <TableCell className="text-center">
                                            {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                                        </TableCell>
                                        <TableCell className="text-center">{notice.views}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
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

export default Notice;
