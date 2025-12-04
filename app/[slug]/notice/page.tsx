'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Paperclip, Layers, MessageCircle } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useNotices } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';

const NoticePage = () => {
    const router = useRouter();
    const { slug, isLoading: isUnionLoading } = useSlug();
    const { data: notices, isLoading, error } = useNotices(!isUnionLoading);

    if (isUnionLoading || isLoading) {
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
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex justify-between items-center">
                        <UnionHeader />
                        <UnionNavigation />
                    </div>
                    <Separator />
                </div>

                <div className={cn('flex justify-between items-center mb-6')}>
                    <h1 className={cn('text-3xl font-bold')}>공지사항</h1>
                    <Button variant="outline" onClick={() => router.push(`/${slug}/notice/new`)}>
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
                                        onClick={() => router.push(`/${slug}/notice/${notice.id}`)}
                                    >
                                        <TableCell className="text-center">{notice.id}</TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate">{notice.title}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {notice.files && notice.files[0]?.count > 0 && (
                                                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {notice.is_popup && (
                                                        <Layers className="h-4 w-4 text-blue-500" />
                                                    )}
                                                    {notice.alimtalk_logs && notice.alimtalk_logs[0]?.count > 0 && (
                                                        <MessageCircle className="h-4 w-4 text-yellow-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
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

export default NoticePage;

