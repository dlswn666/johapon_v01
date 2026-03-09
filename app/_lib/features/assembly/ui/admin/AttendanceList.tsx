'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendanceLive } from '@/app/_lib/features/assembly/api/useAttendanceLiveHook';

interface AttendanceListProps {
  assemblyId: string;
}

type FilterType = 'ALL' | 'ONSITE' | 'ONLINE' | 'WRITTEN_PROXY';

const FILTER_LABELS: Record<FilterType, string> = {
  ALL: '전체',
  ONSITE: '현장',
  ONLINE: '온라인',
  WRITTEN_PROXY: '서면',
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  UNSTABLE: 'bg-yellow-400',
  DISCONNECTED: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '접속중',
  UNSTABLE: '불안정',
  DISCONNECTED: '연결끊김',
};

export default function AttendanceList({ assemblyId }: AttendanceListProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAttendanceLive(assemblyId);

  // 온라인 세션을 목록으로 변환 (+ 출석 타입 정보)
  const allAttendees = useMemo(() => {
    if (!data) return [];

    const online = (data.onlineSessions ?? []).map((s) => ({
      id: s.snapshotId,
      name: s.memberName,
      type: 'ONLINE' as const,
      entryAt: s.entryAt,
      status: s.status,
    }));

    // attendance API에서 현장/서면 정보도 따로 올 수 있으나,
    // live endpoint가 onlineSessions만 주므로 attendance 수치로 보완
    return online;
  }, [data]);

  const filtered = useMemo(() => {
    let list = allAttendees;
    if (filter !== 'ALL') {
      list = list.filter((a) => a.type === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    return list;
  }, [allAttendees, filter, search]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 출석 수치 요약 */}
      {data && (
        <div className="grid grid-cols-4 gap-2 text-center" aria-live="polite">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-lg font-bold text-gray-700">{data.attendance.total}</p>
            <p className="text-xs text-gray-500">전체</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-lg font-bold text-blue-700">{data.attendance.onsite}</p>
            <p className="text-xs text-blue-500">현장</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <p className="text-lg font-bold text-green-700">{data.attendance.online}</p>
            <p className="text-xs text-green-500">온라인</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-700">{data.attendance.writtenProxy}</p>
            <p className="text-xs text-purple-500">서면</p>
          </div>
        </div>
      )}

      {/* 필터 탭 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 검색"
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">이름</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">유형</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">입장 시각</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                  {search ? '검색 결과가 없습니다' : '출석자가 없습니다'}
                </td>
              </tr>
            ) : (
              filtered.map((attendee) => (
                <tr key={attendee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{attendee.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {attendee.type === 'ONLINE' ? '온라인' : attendee.type === 'ONSITE' ? '현장' : '서면'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(attendee.entryAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2">
                    {attendee.type === 'ONLINE' && (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[attendee.status] || 'bg-gray-300'}`} />
                        {STATUS_LABEL[attendee.status] || attendee.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
