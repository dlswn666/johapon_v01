'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Users, UserPlus, Activity, ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUnions, useUnionStats } from '@/app/_lib/features/union-management/api/useUnionManagementHook';

export default function SystemAdminDashboard() {
    const { data: unions, isLoading: unionsLoading } = useUnions();
    const { data: stats, isLoading: statsLoading } = useUnionStats();

    const isLoading = unionsLoading || statsLoading;

    // 최근 등록된 조합 5개
    const recentUnions = unions?.slice(0, 5) || [];

    return (
        <div className="space-y-8">
            {/* 페이지 헤더 */}
            <div>
                <h1 className="text-3xl font-bold text-white">대시보드</h1>
                <p className="mt-2 text-slate-400">시스템 현황을 한눈에 확인하세요</p>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">전체 조합</CardTitle>
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{isLoading ? '-' : stats?.total || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">등록된 조합 수</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">활성 조합</CardTitle>
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{isLoading ? '-' : stats?.active || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">운영 중인 조합</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">비활성 조합</CardTitle>
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{isLoading ? '-' : stats?.inactive || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">일시 중지된 조합</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">조합 관리자</CardTitle>
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">-</div>
                        <p className="text-xs text-slate-500 mt-1">등록된 관리자 수</p>
                    </CardContent>
                </Card>
            </div>

            {/* 빠른 액션 & 최근 조합 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 빠른 액션 */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">빠른 액션</CardTitle>
                        <CardDescription className="text-slate-400">자주 사용하는 기능</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link href="/systemAdmin/unions/new" className="block cursor-pointer">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
                            >
                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                </div>
                                새 조합 등록
                            </Button>
                        </Link>
                        <Link href="/systemAdmin/unions" className="block cursor-pointer">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
                            >
                                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-emerald-400" />
                                </div>
                                관리자 초대
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* 최근 등록된 조합 */}
                <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-white">최근 등록된 조합</CardTitle>
                            <CardDescription className="text-slate-400">최근 추가된 조합 목록</CardDescription>
                        </div>
                        <Link href="/systemAdmin/unions" className="cursor-pointer">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                전체 보기
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-16 bg-slate-700/50 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : recentUnions.length === 0 ? (
                            <div className="text-center py-8">
                                <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">등록된 조합이 없습니다</p>
                                <Link href="/systemAdmin/unions/new" className="cursor-pointer">
                                    <Button className="mt-4 bg-blue-600 hover:bg-blue-700">첫 조합 등록하기</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentUnions.map((union) => (
                                    <Link
                                        key={union.id}
                                        href={`/systemAdmin/unions/${union.id}`}
                                        className="flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white group-hover:text-blue-400 transition-colors">
                                                    {union.name}
                                                </p>
                                                <p className="text-sm text-slate-400">/{union.slug}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    union.is_active
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-slate-600 text-slate-400'
                                                }`}
                                            >
                                                {union.is_active ? '활성' : '비활성'}
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
