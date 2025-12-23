'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Loader2, AlertCircle, Search, MessageSquare, Phone, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <p className="text-sm text-gray-500 mb-1">총 발송</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                            <MessageSquare className="w-4 h-4" />
                            카카오톡
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">{stats.kakaoSuccessCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                            <Phone className="w-4 h-4" />
                            대체문자
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{stats.smsSuccessCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                            <AlertCircle className="w-4 h-4" />
                            실패
                        </div>
                        <p className="text-2xl font-bold text-red-600">{stats.failCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                            <Wallet className="w-4 h-4" />
                            예상 비용
                        </div>
                        <p className="text-2xl font-bold text-[#4E8C6D]">{formatCost(stats.totalCost)}</p>
                    </div>
                </div>

                {/* 검색 */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="제목 또는 템플릿명으로 검색..."
                            value={filters.searchTerm}
                            onChange={handleSearchChange}
                            className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-[16px]"
                        />
                    </div>
                </div>

                {/* 로그 테이블 */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">발송 내역이 없습니다</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">일시</th>
                                        <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">템플릿명</th>
                                        <th className="px-6 py-4 text-left text-[14px] font-bold text-gray-700">제목</th>
                                        <th className="px-6 py-4 text-center text-[14px] font-bold text-gray-700">카카오</th>
                                        <th className="px-6 py-4 text-center text-[14px] font-bold text-gray-700">문자</th>
                                        <th className="px-6 py-4 text-center text-[14px] font-bold text-gray-700">실패</th>
                                        <th className="px-6 py-4 text-right text-[14px] font-bold text-gray-700">비용</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-[14px] text-gray-600 whitespace-nowrap">
                                                {formatDate(log.sent_at)}
                                            </td>
                                            <td className="px-6 py-4 text-[14px] text-gray-900">
                                                {log.template_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-[14px] text-gray-600 max-w-[200px] truncate">
                                                {log.title}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-yellow-600 font-medium text-[14px]">
                                                    {log.kakao_success_count || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-blue-600 font-medium text-[14px]">
                                                    {log.sms_success_count || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-red-600 font-medium text-[14px]">
                                                    {log.fail_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-[14px] text-gray-900 whitespace-nowrap">
                                                {formatCost(log.estimated_cost || 0)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleViewDetail(log)}
                                                    className="px-4 py-2 text-sm font-medium text-[#4E8C6D] hover:bg-[#4E8C6D]/10 rounded-lg transition-colors"
                                                >
                                                    상세
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 상세 모달 */}
                {isDetailOpen && selectedLog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-[20px] font-bold text-gray-900">알림톡 발송 상세</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">발송 일시</p>
                                        <p className="font-medium text-gray-900">
                                            {new Date(selectedLog.sent_at).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">발송 채널</p>
                                        <p className="font-medium text-gray-900">
                                            {selectedLog.sender_channel_name}
                                            {selectedLog.sender_channel_name === '조합온' && (
                                                <span className="ml-1 text-blue-500">🔷</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">템플릿 코드</p>
                                        <p className="font-medium font-mono text-gray-900">
                                            {selectedLog.template_code || '-'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">템플릿명</p>
                                        <p className="font-medium text-gray-900">{selectedLog.template_name || '-'}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-1">제목</p>
                                    <p className="font-medium text-gray-900">{selectedLog.title}</p>
                                </div>

                                {selectedLog.content && (
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-2">내용</p>
                                        <p className="font-medium whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 text-gray-900">
                                            {selectedLog.content}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">총 수신자</p>
                                        <p className="text-xl font-bold text-gray-900">{selectedLog.recipient_count}</p>
                                    </div>
                                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">카카오톡</p>
                                        <p className="text-xl font-bold text-yellow-600">
                                            {selectedLog.kakao_success_count || 0}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">대체문자</p>
                                        <p className="text-xl font-bold text-blue-600">
                                            {selectedLog.sms_success_count || 0}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 rounded-xl">
                                        <p className="text-sm text-gray-500 mb-1">실패</p>
                                        <p className="text-xl font-bold text-red-600">
                                            {selectedLog.fail_count}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <div className="p-4 bg-[#4E8C6D]/10 rounded-xl">
                                        <p className="text-sm text-gray-600 mb-1">예상 비용</p>
                                        <p className="text-2xl font-bold text-[#4E8C6D]">
                                            {formatCost(selectedLog.estimated_cost || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={() => setIsDetailOpen(false)}
                                    className="w-full h-12 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-[14px] font-medium"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
