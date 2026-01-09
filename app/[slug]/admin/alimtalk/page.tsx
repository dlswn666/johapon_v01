'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, Search, MessageSquare, Phone, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useAlimtalkLogsByUnion } from '@/app/_lib/features/alimtalk/api/useAlimtalkLogHook';
import useAlimtalkLogStore from '@/app/_lib/features/alimtalk/model/useAlimtalkLogStore';
import { useUnions } from '@/app/_lib/entities/union/api/useUnionHook';
import { AlimtalkLogWithUnion } from '@/app/_lib/shared/type/database.types';

// 비용 포맷
function formatCost(cost: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(cost);
}

// 날짜 포맷 (2026년 1월 9일 오후 2시 30분 형식)
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

// 테이블용 짧은 날짜 포맷 (1월 9일 오후 2:30)
function formatShortDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function UnionAlimtalkPage() {
    const params = useParams();
    const slug = params.slug as string;

    // 조합 정보 조회
    const { data: unions, isLoading: unionsLoading } = useUnions();
    const currentUnion = unions?.find((u) => u.slug === slug);

    // 알림톡 로그 조회
    const { isLoading, error } = useAlimtalkLogsByUnion(currentUnion?.id);
    const { logs, stats, filters, setFilters } = useAlimtalkLogStore();

    // 상세 모달 상태
    const [selectedLog, setSelectedLog] = useState<AlimtalkLogWithUnion | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // 검색어 변경
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters({ searchTerm: e.target.value });
    };

    // 상세 보기
    const handleViewDetail = (log: AlimtalkLogWithUnion) => {
        setSelectedLog(log);
        setIsDetailOpen(true);
    };

    // 로딩 중
    if (unionsLoading || isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (!currentUnion) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600">조합 정보를 불러올 수 없습니다</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-lg text-red-600">데이터를 불러오는데 실패했습니다.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* 페이지 헤더 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">알림톡 발송 내역</h1>
                    <p className="text-gray-600">{currentUnion.name}의 알림톡 발송 내역을 확인합니다</p>
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground mb-1">총 발송</p>
                            <p className="text-2xl font-bold text-foreground">{stats.totalCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                <MessageSquare className="w-4 h-4" />
                                카카오톡
                            </div>
                            <p className="text-2xl font-bold text-yellow-600">{stats.kakaoSuccessCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                <Phone className="w-4 h-4" />
                                대체문자
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{stats.smsSuccessCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                <AlertCircle className="w-4 h-4" />
                                실패
                            </div>
                            <p className="text-2xl font-bold text-red-600">{stats.failCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                <Wallet className="w-4 h-4" />
                                예상 비용
                            </div>
                            <p className="text-2xl font-bold text-[#4E8C6D]">{formatCost(stats.totalCost)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 검색 */}
                <Card>
                    <CardContent className="p-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="제목 또는 발송자명으로 검색..."
                                value={filters.searchTerm}
                                onChange={handleSearchChange}
                                className="w-full h-12 pl-12 pr-4 rounded-xl text-[16px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 로그 테이블 */}
                <Card>
                    <CardContent className="p-0">
                        {logs.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                                <p className="text-muted-foreground">발송 내역이 없습니다</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6 py-4 font-bold">일시</TableHead>
                                        <TableHead className="px-6 py-4 font-bold">발송자</TableHead>
                                        <TableHead className="px-6 py-4 font-bold">제목</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-center">카카오</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-center">문자</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-center">실패</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-right">비용</TableHead>
                                        <TableHead className="px-6 py-4"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                                {formatShortDate(log.sent_at)}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-foreground">
                                                {log.sender?.name || '-'}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">
                                                {log.title}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <span className="text-yellow-600 font-medium">
                                                    {log.kakao_success_count || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <span className="text-blue-600 font-medium">
                                                    {log.sms_success_count || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <span className="text-red-600 font-medium">
                                                    {log.fail_count}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right text-foreground whitespace-nowrap">
                                                {formatCost(log.estimated_cost || 0)}
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewDetail(log)}
                                                    className="text-[#4E8C6D] hover:text-[#4E8C6D] hover:bg-[#4E8C6D]/10 cursor-pointer"
                                                >
                                                    상세
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* 상세 모달 */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">알림톡 발송 상세</DialogTitle>
                        </DialogHeader>

                        {selectedLog && (
                            <div className="space-y-6 py-4">
                                {/* 제목, 발송일시, 발송자 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-muted rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">제목</p>
                                        <p className="font-medium text-foreground">{selectedLog.title}</p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">발송 일시</p>
                                        <p className="font-medium text-foreground">
                                            {formatDate(selectedLog.sent_at)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">발송자</p>
                                        <p className="font-medium text-foreground">
                                            {selectedLog.sender?.name || '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* 내용 */}
                                {selectedLog.content && (
                                    <div className="p-4 bg-muted rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-2">내용</p>
                                        <p className="font-medium whitespace-pre-wrap bg-background p-4 rounded-lg border text-foreground">
                                            {selectedLog.content}
                                        </p>
                                    </div>
                                )}

                                {/* 발송 결과 통계 */}
                                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                                    <div className="text-center p-4 bg-muted rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">총 수신자</p>
                                        <p className="text-xl font-bold text-foreground">{selectedLog.recipient_count}</p>
                                    </div>
                                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">카카오톡</p>
                                        <p className="text-xl font-bold text-yellow-600">
                                            {selectedLog.kakao_success_count || 0}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">대체문자</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {selectedLog.sms_success_count || 0}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">실패</p>
                                        <p className="text-xl font-bold text-red-600">
                                            {selectedLog.fail_count}
                                        </p>
                                    </div>
                                </div>

                                {/* 예상 비용 */}
                                <div className="pt-4 border-t">
                                    <div className="p-4 bg-[#4E8C6D]/10 rounded-xl">
                                        <p className="text-sm text-muted-foreground mb-1">예상 비용</p>
                                        <p className="text-2xl font-bold text-[#4E8C6D]">
                                            {formatCost(selectedLog.estimated_cost || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsDetailOpen(false)}
                                className="w-full cursor-pointer"
                            >
                                닫기
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
