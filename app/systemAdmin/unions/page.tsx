'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, Search, Filter, ExternalLink, Users, Settings, Trash2, MessageSquare } from 'lucide-react';
import { useUnions, useUnionStats, useDeleteUnion, useToggleUnionActive } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { useUnionManagementStore } from '@/app/_lib/features/union-management/model/useUnionManagementStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';

export default function SystemAdminUnionsPage() {
    const { data: unions, isLoading, refetch } = useUnions();
    const { data: stats, isLoading: isStatsLoading } = useUnionStats();
    const deleteMutation = useDeleteUnion();
    const toggleActiveMutation = useToggleUnionActive();

    const searchKeyword = useUnionManagementStore((state) => state.searchKeyword);
    const filterStatus = useUnionManagementStore((state) => state.filterStatus);
    const setSearchKeyword = useUnionManagementStore((state) => state.setSearchKeyword);
    const setFilterStatus = useUnionManagementStore((state) => state.setFilterStatus);

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteTargetName, setDeleteTargetName] = useState<string>('');
    const [toggleTarget, setToggleTarget] = useState<{ id: string; name: string; currentStatus: boolean } | null>(null);

    const handleSearch = useCallback(() => {
        refetch();
    }, [refetch]);

    const openToggleDialog = (id: string, name: string, currentStatus: boolean) => {
        setToggleTarget({ id, name, currentStatus });
    };

    const handleToggleActive = async () => {
        if (!toggleTarget) return;

        try {
            await toggleActiveMutation.mutateAsync({ id: toggleTarget.id, isActive: !toggleTarget.currentStatus });
            toast.success(toggleTarget.currentStatus ? '조합이 비활성화되었습니다.' : '조합이 활성화되었습니다.');
            setToggleTarget(null);
        } catch {
            toast.error('상태 변경에 실패했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!deleteTargetId) return;

        try {
            await deleteMutation.mutateAsync(deleteTargetId);
            toast.success('조합이 삭제되었습니다.');
            setDeleteTargetId(null);
        } catch {
            toast.error('조합 삭제에 실패했습니다.');
        }
    };

    const openDeleteDialog = (id: string, name: string) => {
        setDeleteTargetId(id);
        setDeleteTargetName(name);
    };

    return (
        <div className="space-y-8">
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">조합 관리</h1>
                    <p className="mt-2 text-slate-400">등록된 조합을 관리하고 새로운 조합을 추가할 수 있습니다</p>
                </div>
                <Link href="/systemAdmin/unions/new" className="cursor-pointer">
                    <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <Plus className="w-4 h-4" />
                        새 조합 등록
                    </Button>
                </Link>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">전체</CardTitle>
                        <Building2 className="w-5 h-5 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">
                            {isStatsLoading ? '-' : stats?.total || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">활성</CardTitle>
                        <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">
                            {isStatsLoading ? '-' : stats?.active || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">비활성</CardTitle>
                        <div className="w-3 h-3 bg-slate-500 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-400">
                            {isStatsLoading ? '-' : stats?.inactive || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 검색 & 필터 */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="조합명으로 검색..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-40 bg-slate-700/50 border-slate-600 text-white">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="상태 필터" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체</SelectItem>
                                    <SelectItem value="active">활성</SelectItem>
                                    <SelectItem value="inactive">비활성</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                                검색
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 조합 목록 */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">조합 목록</CardTitle>
                    <CardDescription className="text-slate-400">
                        총 {unions?.length || 0}개의 조합
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-slate-700/50 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : unions?.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <p className="text-lg text-slate-400 mb-4">등록된 조합이 없습니다</p>
                            <Link href="/systemAdmin/unions/new" className="cursor-pointer">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    첫 조합 등록하기
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {unions?.map((union) => (
                                <div
                                    key={union.id}
                                    className="flex items-center justify-between p-5 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                            <Building2 className="w-7 h-7 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                    {union.name}
                                                </h3>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        union.is_active
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-slate-600 text-slate-400'
                                                    }`}
                                                >
                                                    {union.is_active ? '활성' : '비활성'}
                                                </span>
                                                {/* 알림톡 채널 상태 */}
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        union.vault_sender_key_id
                                                            ? 'bg-yellow-500/20 text-yellow-400'
                                                            : 'bg-slate-600/50 text-slate-400'
                                                    }`}
                                                    title={union.vault_sender_key_id ? '자체 채널 설정됨' : '조합온 채널 사용'}
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    {union.vault_sender_key_id
                                                        ? union.kakao_channel_id || '자체'
                                                        : '조합온'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <p className="text-sm text-slate-400">/{union.slug}</p>
                                                {union.phone && (
                                                    <p className="text-sm text-slate-500">{union.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* 활성화 토글 */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">활성화</span>
                                            <Switch
                                                checked={union.is_active}
                                                onCheckedChange={() => openToggleDialog(union.id, union.name, union.is_active)}
                                                disabled={toggleActiveMutation.isPending}
                                            />
                                        </div>

                                        {/* 액션 버튼들 */}
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`/${union.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="cursor-pointer"
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-white hover:bg-slate-600"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </a>
                                            <Link href={`/systemAdmin/unions/${union.id}/admins`} className="cursor-pointer">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-white hover:bg-slate-600"
                                                >
                                                    <Users className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/systemAdmin/unions/${union.id}`} className="cursor-pointer">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-white hover:bg-slate-600"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openDeleteDialog(union.id, union.name)}
                                                className="text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">조합 삭제</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            <span className="text-red-400 font-semibold">&quot;{deleteTargetName}&quot;</span> 조합을 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없으며, 조합의 모든 데이터가 삭제됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 활성화/비활성화 확인 다이얼로그 */}
            <AlertDialog open={!!toggleTarget} onOpenChange={() => setToggleTarget(null)}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                            조합 {toggleTarget?.currentStatus ? '비활성화' : '활성화'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            <span className="text-blue-400 font-semibold">&quot;{toggleTarget?.name}&quot;</span> 조합을{' '}
                            {toggleTarget?.currentStatus ? '비활성화' : '활성화'}하시겠습니까?
                            {toggleTarget?.currentStatus && (
                                <>
                                    <br />
                                    <span className="text-amber-400">비활성화하면 해당 조합 홈페이지에 접근할 수 없습니다.</span>
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleToggleActive}
                            className={toggleTarget?.currentStatus 
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }
                            disabled={toggleActiveMutation.isPending}
                        >
                            {toggleActiveMutation.isPending 
                                ? '처리 중...' 
                                : toggleTarget?.currentStatus ? '비활성화' : '활성화'
                            }
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

