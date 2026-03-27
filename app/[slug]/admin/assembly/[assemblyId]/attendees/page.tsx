'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useQuorumStatus } from '@/app/_lib/features/assembly/api/useQuorumHook';
import { useAttendanceList } from '@/app/_lib/features/assembly/api/useAttendanceHook';
import { AttendanceType } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, CheckCircle, XCircle } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';

const ATTENDANCE_TYPE_LABELS: Record<AttendanceType, string> = {
  ONLINE: '온라인',
  ONSITE: '현장',
  WRITTEN_PROXY: '서면/위임',
};

const ATTENDANCE_TYPE_COLORS: Record<AttendanceType, string> = {
  ONLINE: 'bg-blue-100 text-blue-700',
  ONSITE: 'bg-green-100 text-green-700',
  WRITTEN_PROXY: 'bg-purple-100 text-purple-700',
};

export default function AttendeesPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly, isLoading: isAssemblyLoading } = useAssembly(assemblyId);
  const { data: quorum, isLoading: isQuorumLoading } = useQuorumStatus(assemblyId);
  const { data: attendanceLogs, isLoading: isAttendanceLoading } = useAttendanceList(assemblyId);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading || isAssemblyLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // 현재 체크인 중인 로그만 (퇴장하지 않은)
  const activeLogs = (attendanceLogs || []).filter((log) => !log.exit_at);

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">출석/정족수 현황</h1>
          <p className="text-sm text-gray-500">{assembly?.title}</p>
        </div>
      </div>

      {/* 정족수 요약 카드 */}
      {isQuorumLoading ? (
        <Skeleton className="h-36 rounded-lg" />
      ) : quorum ? (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-900">정족수 현황</h2>
            {quorum.quorumMet ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" />
                정족수 충족
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <XCircle className="w-3 h-3" />
                정족수 미달
              </span>
            )}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <dt className="text-xs text-gray-500 mb-1">총 조합원</dt>
              <dd className="text-2xl font-bold text-gray-900">{quorum.totalMembers}명</dd>
            </div>
            <div className="text-center">
              <dt className="text-xs text-gray-500 mb-1">현재 출석</dt>
              <dd className="text-2xl font-bold text-blue-600">{quorum.totalAttendance}명</dd>
            </div>
            <div className="text-center">
              <dt className="text-xs text-gray-500 mb-1">정족수 기준</dt>
              <dd className="text-2xl font-bold text-gray-700">{quorum.quorumThresholdPct}%</dd>
            </div>
            <div className="text-center">
              <dt className="text-xs text-gray-500 mb-1">출석률</dt>
              <dd className="text-2xl font-bold text-gray-700">
                {quorum.totalMembers > 0
                  ? Math.round((quorum.totalAttendance / quorum.totalMembers) * 1000) / 10
                  : 0}
                %
              </dd>
            </div>
          </dl>
          {/* 유형별 출석 */}
          <div className="mt-4 flex gap-4 text-sm text-gray-600">
            <span>현장: {quorum.onsiteCount}명</span>
            <span>온라인: {quorum.onlineCount}명</span>
            <span>서면/위임: {quorum.writtenProxyCount}명</span>
          </div>
        </div>
      ) : null}

      {/* 출석자 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          출석자 목록 {activeLogs.length > 0 ? `(${activeLogs.length}명 현재 참석)` : ''}
        </h2>
        {isAttendanceLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 rounded" />
            ))}
          </div>
        ) : activeLogs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">현재 출석 중인 조합원이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">번호</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">출석 유형</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">입장 시간</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ATTENDANCE_TYPE_COLORS[log.attendance_type]
                        }`}
                      >
                        {ATTENDANCE_TYPE_LABELS[log.attendance_type]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      {log.entry_at
                        ? new Date(log.entry_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : log.qr_checkin_at
                        ? new Date(log.qr_checkin_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        참석
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 안건별 정족수 */}
      {quorum && quorum.perAgenda.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">안건별 정족수</h2>
          <div className="space-y-3">
            {quorum.perAgenda.map((item) => (
              <div key={item.agendaId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">
                    기준: {item.requiredThreshold}% | 현재: {item.currentPct}%
                  </p>
                </div>
                {item.met ? (
                  <span className="ml-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                    <CheckCircle className="w-3 h-3" />
                    충족
                  </span>
                ) : (
                  <span className="ml-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 shrink-0">
                    <XCircle className="w-3 h-3" />
                    미달
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
