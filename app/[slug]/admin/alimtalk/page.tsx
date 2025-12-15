'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlimtalkLogsByUnion } from '@/app/_lib/features/alimtalk/api/useAlimtalkLogHook';
import useAlimtalkLogStore from '@/app/_lib/features/alimtalk/model/useAlimtalkLogStore';
import { useUnions } from '@/app/_lib/entities/union/api/useUnionHook';
import { AlimtalkLogWithUnion } from '@/app/_lib/shared/type/database.types';
import { Search, MessageSquare, Phone, AlertCircle, Wallet } from 'lucide-react';

// 비용 포맷
function formatCost(cost: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(cost);
}

// 날짜 포맷
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function UnionAlimtalkPage() {
    const params = useParams();
    const slug = params.slug as string;

    // 조합 정보 조회
    const { data: unions } = useUnions();
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

    if (!currentUnion) {
        return (
            <div className="container mx-auto py-8">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">조합 정보를 불러오는 중...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* 페이지 헤더 */}
            <div>
                <h1 className="text-2xl font-bold">알림톡 발송 내역</h1>
                <p className="text-muted-foreground mt-1">
                    {currentUnion.name}의 알림톡 발송 내역을 확인합니다.
                </p>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            총 발송
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            카카오톡
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {stats.kakaoSuccessCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            대체문자
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.smsSuccessCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            실패
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats.failCount}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Wallet className="w-4 h-4" />
                            예상 비용
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCost(stats.totalCost)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 검색 및 필터 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="제목 또는 템플릿명으로 검색..."
                                value={filters.searchTerm}
                                onChange={handleSearchChange}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 로그 테이블 */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                            <p className="text-red-500">데이터를 불러오는데 실패했습니다.</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">발송 내역이 없습니다.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>일시</TableHead>
                                    <TableHead>템플릿명</TableHead>
                                    <TableHead>제목</TableHead>
                                    <TableHead className="text-center">카카오</TableHead>
                                    <TableHead className="text-center">문자</TableHead>
                                    <TableHead className="text-center">실패</TableHead>
                                    <TableHead className="text-right">비용</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {formatDate(log.sent_at)}
                                        </TableCell>
                                        <TableCell>{log.template_name || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {log.title}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-yellow-600 font-medium">
                                                {log.kakao_success_count || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-blue-600 font-medium">
                                                {log.sms_success_count || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-red-600 font-medium">
                                                {log.fail_count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            {formatCost(log.estimated_cost || 0)}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetail(log)}
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>알림톡 발송 상세</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">발송 일시</p>
                                    <p className="font-medium">
                                        {new Date(selectedLog.sent_at).toLocaleString('ko-KR')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">발송 채널</p>
                                    <p className="font-medium">
                                        {selectedLog.sender_channel_name}
                                        {selectedLog.sender_channel_name === '조합온' && (
                                            <span className="ml-1 text-blue-500">🔷</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">템플릿 코드</p>
                                    <p className="font-medium font-mono">
                                        {selectedLog.template_code || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">템플릿명</p>
                                    <p className="font-medium">{selectedLog.template_name || '-'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">제목</p>
                                <p className="font-medium">{selectedLog.title}</p>
                            </div>

                            {selectedLog.content && (
                                <div>
                                    <p className="text-sm text-muted-foreground">내용</p>
                                    <p className="font-medium whitespace-pre-wrap bg-muted p-3 rounded">
                                        {selectedLog.content}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">총 수신자</p>
                                    <p className="text-xl font-bold">{selectedLog.recipient_count}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">카카오톡</p>
                                    <p className="text-xl font-bold text-yellow-600">
                                        {selectedLog.kakao_success_count || 0}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">대체문자</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {selectedLog.sms_success_count || 0}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">실패</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {selectedLog.fail_count}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">예상 비용</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCost(selectedLog.estimated_cost || 0)}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

