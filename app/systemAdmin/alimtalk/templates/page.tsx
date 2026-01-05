'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useAlimtalkTemplates,
    useSyncAlimtalkTemplates,
    useUpdateAlimtalkTemplate,
} from '@/app/_lib/features/alimtalk/api/useAlimtalkTemplateHook';
import useAlimtalkTemplateStore from '@/app/_lib/features/alimtalk/model/useAlimtalkTemplateStore';
import { AlimtalkTemplate } from '@/app/_lib/shared/type/database.types';
import {
    RefreshCw,
    ExternalLink,
    FileText,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    MessageSquare,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useState } from 'react';
import { DataTable, ColumnDef } from '@/app/_lib/widgets/common/data-table';

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string | null }) {
    switch (status) {
        case 'A':
            return (
                <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    정상
                </Badge>
            );
        case 'R':
            return (
                <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    대기
                </Badge>
            );
        case 'S':
            return (
                <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    중단
                </Badge>
            );
        default:
            return (
                <Badge variant="outline">
                    알 수 없음
                </Badge>
            );
    }
}

// 승인상태 배지 컴포넌트
function InspStatusBadge({ status }: { status: string | null }) {
    switch (status) {
        case 'APR':
            return (
                <Badge variant="default" className="bg-green-500">
                    승인
                </Badge>
            );
        case 'REQ':
            return (
                <Badge variant="secondary">
                    심사중
                </Badge>
            );
        case 'REJ':
            return (
                <Badge variant="destructive">
                    반려
                </Badge>
            );
        case 'REG':
            return (
                <Badge variant="outline">
                    등록
                </Badge>
            );
        default:
            return (
                <Badge variant="outline">
                    -
                </Badge>
            );
    }
}

// 날짜 포맷
function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// 템플릿 테이블 컬럼 정의
const templateColumns: ColumnDef<AlimtalkTemplate>[] = [
    {
        key: 'template_code',
        header: '템플릿 코드',
        className: 'font-mono',
    },
    {
        key: 'template_name',
        header: '템플릿 이름',
    },
    {
        key: 'status',
        header: '상태',
        render: (value) => <StatusBadge status={value as string | null} />,
    },
    {
        key: 'insp_status',
        header: '승인상태',
        render: (value) => <InspStatusBadge status={value as string | null} />,
    },
    {
        key: 'synced_at',
        header: '마지막 동기화',
        render: (value) => formatDate(value as string | null),
    },
];

export default function SystemAdminTemplatesPage() {
    // 템플릿 목록 조회
    const { isLoading, error } = useAlimtalkTemplates();
    const { templates, isSyncing, lastSyncedAt } = useAlimtalkTemplateStore();

    // 동기화 mutation
    const syncMutation = useSyncAlimtalkTemplates();

    // 템플릿 업데이트 mutation
    const updateMutation = useUpdateAlimtalkTemplate();

    // 상세 모달 상태
    const [selectedTemplate, setSelectedTemplate] = useState<AlimtalkTemplate | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // 동기화 실행
    const handleSync = () => {
        syncMutation.mutate();
    };

    // 알리고 콘솔 열기
    const handleOpenAligoConsole = () => {
        window.open('https://smartsms.aligo.in', '_blank');
    };

    // 상세 보기
    const handleViewDetail = (template: AlimtalkTemplate) => {
        setSelectedTemplate(template);
        setIsDetailOpen(true);
    };

    // LMS 대체 발송 토글
    const handleToggleFailover = (checked: boolean) => {
        if (!selectedTemplate) return;
        
        updateMutation.mutate({
            id: selectedTemplate.id,
            updates: { use_failover: checked },
        });
    };

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* 페이지 헤더 */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">템플릿 관리</h1>
                    <p className="text-muted-foreground mt-1">
                        알리고에 등록된 알림톡 템플릿을 관리합니다.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleOpenAligoConsole}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        알리고 콘솔 열기
                    </Button>
                    <Button onClick={handleSync} disabled={isSyncing}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        알리고 동기화
                    </Button>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <Tabs defaultValue="templates" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="logs" asChild>
                        <Link href="/systemAdmin/alimtalk">발송 내역</Link>
                    </TabsTrigger>
                    <TabsTrigger value="templates">템플릿 관리</TabsTrigger>
                    <TabsTrigger value="pricing" asChild>
                        <Link href="/systemAdmin/alimtalk/pricing">단가 설정</Link>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-6">
                    {/* 동기화 정보 */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            마지막 동기화
                                        </p>
                                        <p className="font-medium">
                                            {lastSyncedAt ? formatDate(lastSyncedAt) : '동기화 기록 없음'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            총 템플릿 수
                                        </p>
                                        <p className="font-medium">{templates.length}개</p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    ℹ️ 템플릿 등록/수정은 알리고 콘솔에서 진행해주세요.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 템플릿 테이블 */}
                    <Card>
                        <CardContent className="pt-6">
                            {error ? (
                                <div className="text-center py-12">
                                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                                    <p className="text-red-500">데이터를 불러오는데 실패했습니다.</p>
                                </div>
                            ) : (
                                <DataTable<AlimtalkTemplate>
                                    data={templates}
                                    columns={templateColumns}
                                    keyExtractor={(row) => row.id}
                                    isLoading={isLoading}
                                    emptyMessage="등록된 템플릿이 없습니다."
                                    emptyIcon={<FileText className="w-12 h-12 text-muted-foreground" />}
                                    onRowClick={handleViewDetail}
                                    actions={{
                                        render: (template) => (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-[#4E8C6D] hover:text-[#3d7058] hover:bg-[#4E8C6D]/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewDetail(template);
                                                }}
                                            >
                                                상세
                                            </Button>
                                        ),
                                        headerText: '',
                                    }}
                                    minWidth="700px"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 상세 모달 */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>템플릿 상세</DialogTitle>
                    </DialogHeader>
                    {selectedTemplate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">템플릿 코드</p>
                                    <p className="font-medium font-mono">
                                        {selectedTemplate.template_code}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">템플릿 이름</p>
                                    <p className="font-medium">{selectedTemplate.template_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">상태</p>
                                    <StatusBadge status={selectedTemplate.status} />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">승인상태</p>
                                    <InspStatusBadge status={selectedTemplate.insp_status} />
                                </div>
                            </div>

                            {selectedTemplate.template_content && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">템플릿 내용</p>
                                    <div className="bg-muted p-4 rounded whitespace-pre-wrap text-sm font-mono">
                                        {selectedTemplate.template_content}
                                    </div>
                                </div>
                            )}

                            {selectedTemplate.buttons && Array.isArray(selectedTemplate.buttons) && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">버튼 정보</p>
                                    <div className="space-y-2">
                                        {(selectedTemplate.buttons as Array<{ name: string; linkType: string }>).map(
                                            (button, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-muted p-3 rounded flex justify-between items-center"
                                                >
                                                    <span>{button.name}</span>
                                                    <Badge variant="outline">{button.linkType}</Badge>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* LMS 대체 발송 설정 */}
                            <div className="border-t pt-4 mt-4">
                                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                    <Checkbox
                                        id="use_failover"
                                        checked={selectedTemplate.use_failover ?? false}
                                        onCheckedChange={handleToggleFailover}
                                        disabled={updateMutation.isPending}
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor="use_failover"
                                            className="flex items-center gap-2 font-medium cursor-pointer"
                                        >
                                            <MessageSquare className="w-4 h-4 text-blue-500" />
                                            LMS 대체 발송 사용
                                        </label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            카카오톡 발송 실패 시 template_title과 template_content로 LMS 발송
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">마지막 동기화</p>
                                <p className="font-medium">
                                    {formatDate(selectedTemplate.synced_at)}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

