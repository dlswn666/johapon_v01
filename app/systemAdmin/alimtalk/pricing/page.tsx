'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useAlimtalkPricing,
    useUpdateAlimtalkPricing,
} from '@/app/_lib/features/alimtalk/api/useAlimtalkPricingHook';
import useAlimtalkPricingStore from '@/app/_lib/features/alimtalk/model/useAlimtalkPricingStore';
import { AlertCircle, Wallet, Edit2, MessageSquare, Phone, FileText } from 'lucide-react';
import Link from 'next/link';

// 메시지 타입 한글 변환
function getMessageTypeLabel(type: string): string {
    switch (type) {
        case 'KAKAO':
            return '카카오 알림톡';
        case 'SMS':
            return 'SMS';
        case 'LMS':
            return 'LMS';
        default:
            return type;
    }
}

// 메시지 타입 아이콘
function getMessageTypeIcon(type: string) {
    switch (type) {
        case 'KAKAO':
            return <MessageSquare className="w-4 h-4 text-yellow-600" />;
        case 'SMS':
        case 'LMS':
            return <Phone className="w-4 h-4 text-blue-600" />;
        default:
            return <FileText className="w-4 h-4" />;
    }
}

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
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

export default function SystemAdminPricingPage() {
    // 단가 목록 조회
    const { isLoading, error } = useAlimtalkPricing();
    const { pricingList, currentPricing } = useAlimtalkPricingStore();

    // 수정 mutation
    const updateMutation = useUpdateAlimtalkPricing();

    // 수정 모달 상태
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingType, setEditingType] = useState<string>('');
    const [newPrice, setNewPrice] = useState<string>('');
    const [effectiveDate, setEffectiveDate] = useState<string>('');

    // 현재 단가를 배열로 변환
    const currentPricingArray = Array.from(currentPricing.entries()).map(
        ([messageType, unitPrice]) => ({
            messageType,
            unitPrice,
        })
    );

    // 수정 모달 열기
    const handleOpenEdit = (messageType: string) => {
        const currentPrice = currentPricing.get(messageType) || 0;
        setEditingType(messageType);
        setNewPrice(currentPrice.toString());
        setEffectiveDate(new Date().toISOString().split('T')[0]);
        setIsEditOpen(true);
    };

    // 수정 저장
    const handleSave = () => {
        if (!editingType || !newPrice || !effectiveDate) return;

        updateMutation.mutate(
            {
                messageType: editingType,
                unitPrice: parseFloat(newPrice),
                effectiveFrom: new Date(effectiveDate).toISOString(),
            },
            {
                onSuccess: () => {
                    setIsEditOpen(false);
                },
            }
        );
    };

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* 페이지 헤더 */}
            <div>
                <h1 className="text-2xl font-bold">발송 단가 설정</h1>
                <p className="text-muted-foreground mt-1">
                    알림톡 및 대체 문자 발송 단가를 관리합니다.
                </p>
            </div>

            {/* 탭 네비게이션 */}
            <Tabs defaultValue="pricing" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="logs" asChild>
                        <Link href="/systemAdmin/alimtalk">발송 내역</Link>
                    </TabsTrigger>
                    <TabsTrigger value="templates" asChild>
                        <Link href="/systemAdmin/alimtalk/templates">템플릿 관리</Link>
                    </TabsTrigger>
                    <TabsTrigger value="pricing">단가 설정</TabsTrigger>
                </TabsList>

                <TabsContent value="pricing" className="space-y-6">
                    {/* 현재 적용 단가 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="w-5 h-5" />
                                현재 적용 단가
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                                    <p className="text-red-500">데이터를 불러오는데 실패했습니다.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {currentPricingArray.map(({ messageType, unitPrice }) => (
                                        <Card key={messageType} className="relative">
                                            <CardContent className="pt-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {getMessageTypeIcon(messageType)}
                                                    <span className="font-medium">
                                                        {getMessageTypeLabel(messageType)}
                                                    </span>
                                                </div>
                                                <div className="text-3xl font-bold">
                                                    {formatCost(unitPrice)}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    건당 단가
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={() => handleOpenEdit(messageType)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 단가 변경 이력 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>단가 변경 이력</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : pricingList.length === 0 ? (
                                <div className="text-center py-8">
                                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">단가 이력이 없습니다.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>발송 유형</TableHead>
                                            <TableHead>단가</TableHead>
                                            <TableHead>적용 시작일</TableHead>
                                            <TableHead>등록일</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pricingList.map((pricing) => (
                                            <TableRow key={pricing.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getMessageTypeIcon(pricing.message_type)}
                                                        {getMessageTypeLabel(pricing.message_type)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {formatCost(pricing.unit_price)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(pricing.effective_from)}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {formatDate(pricing.created_at)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* 안내 메시지 */}
                    <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground">
                                ℹ️ 단가 변경 시 새로운 단가가 추가되며, 이전 단가는 이력으로 보관됩니다.
                                적용 시작일 이후의 발송 건에 대해 새 단가가 적용됩니다.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 수정 모달 */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {getMessageTypeLabel(editingType)} 단가 수정
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">현재 단가</p>
                            <p className="text-lg font-bold">
                                {formatCost(currentPricing.get(editingType) || 0)}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPrice">새 단가 (원)</Label>
                            <Input
                                id="newPrice"
                                type="number"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                placeholder="0"
                                min="0"
                                step="1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="effectiveDate">적용 시작일</Label>
                            <Input
                                id="effectiveDate"
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            취소
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={updateMutation.isPending || !newPrice || !effectiveDate}
                        >
                            {updateMutation.isPending ? '저장 중...' : '저장'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

