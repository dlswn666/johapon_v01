'use client';

import React from 'react';
import { useQuorumStatus } from '@/app/_lib/features/assembly/api/useQuorumHook';
import { AGENDA_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface QuorumDashboardProps {
  assemblyId: string;
}

export default function QuorumDashboard({ assemblyId }: QuorumDashboardProps) {
  const { data: quorum, isLoading, error } = useQuorumStatus(assemblyId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">정족수 현황</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-8 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !quorum) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">정족수 현황</h2>
        <p className="text-sm text-red-500">정족수 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const attendancePct = quorum.totalMembers > 0
    ? Math.round((quorum.totalAttendance / quorum.totalMembers) * 1000) / 10
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">정족수 현황</h2>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${quorum.quorumMet ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {quorum.quorumMet ? '정족수 충족' : '정족수 미달'}
        </span>
      </div>

      {/* 출석 현황 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{quorum.onsiteCount}</p>
          <p className="text-xs text-blue-600 mt-1">현장</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{quorum.onlineCount}</p>
          <p className="text-xs text-green-600 mt-1">온라인</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{quorum.writtenProxyCount}</p>
          <p className="text-xs text-purple-600 mt-1">서면</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-700">{quorum.totalAttendance}</p>
          <p className="text-xs text-gray-600 mt-1">총 {quorum.totalMembers}명 중</p>
        </div>
      </div>

      {/* 전체 출석률 바 */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">전체 출석률</span>
          <span className="font-medium text-gray-900">{attendancePct}% (기준: {quorum.quorumThresholdPct}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${quorum.quorumMet ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(attendancePct, 100)}%` }}
          />
        </div>
      </div>

      {/* 안건별 정족수 */}
      {quorum.perAgenda.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">안건별 정족수</p>
          <div className="space-y-2">
            {quorum.perAgenda.map((item) => (
              <div key={item.agendaId} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.met ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className="flex-1 text-gray-700 truncate">{item.title}</span>
                <span className="text-xs text-gray-500">
                  {AGENDA_TYPE_LABELS[item.agendaType as keyof typeof AGENDA_TYPE_LABELS] || item.agendaType}
                </span>
                <span className={`text-xs font-medium ${item.met ? 'text-green-600' : 'text-red-500'}`}>
                  {item.currentPct}% / {item.requiredThreshold}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">10초마다 자동 갱신</p>
    </div>
  );
}
