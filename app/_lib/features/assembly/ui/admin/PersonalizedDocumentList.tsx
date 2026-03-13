'use client';

import React from 'react';
import { Users } from 'lucide-react';
import StatusBadge from '@/app/_lib/widgets/common/StatusBadge';
import HashDisplay from '@/app/_lib/widgets/common/HashDisplay';
import { usePersonalizedInstances } from '@/app/_lib/features/assembly/api/useDocumentHook';

// DB 반환값은 snake_case — PersonalizedInstance 타입과 다를 수 있음
interface RawInstance {
  id: string;
  user_id: string;
  status: string;
  viewed_at: string | null;
  signed_at: string | null;
  personalization_hash: string;
}

interface PersonalizedDocumentListProps {
  assemblyId: string;
  documentId: string;
}

const INSTANCE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-blue-100 text-blue-700' },
  VIEWED: { label: '열람', color: 'bg-gray-100 text-gray-600' },
  SIGNED: { label: '서명 완료', color: 'bg-green-100 text-green-700' },
  SEALED: { label: '봉인됨', color: 'bg-indigo-100 text-indigo-700' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/** 관리자용 개인화 인스턴스 목록 */
export default function PersonalizedDocumentList({ assemblyId, documentId }: PersonalizedDocumentListProps) {
  const { data: rawInstances, isLoading } = usePersonalizedInstances(assemblyId, documentId);
  // 타입 캐스트: DB 반환값은 snake_case
  const instances = rawInstances as unknown as RawInstance[] | undefined;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16" />
        ))}
      </div>
    );
  }

  if (!instances || instances.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>아직 열람한 조합원이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
            <th className="py-2 px-3 font-medium">조합원</th>
            <th className="py-2 px-3 font-medium">상태</th>
            <th className="py-2 px-3 font-medium">열람 일시</th>
            <th className="py-2 px-3 font-medium">서명 일시</th>
            <th className="py-2 px-3 font-medium">해시</th>
          </tr>
        </thead>
        <tbody>
          {instances.map((inst) => {
            const statusConfig = INSTANCE_STATUS_CONFIG[inst.status] || INSTANCE_STATUS_CONFIG.PENDING;
            return (
              <tr key={inst.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 px-3 text-gray-900">{inst.user_id}</td>
                <td className="py-2.5 px-3">
                  <StatusBadge label={statusConfig.label} colorClass={statusConfig.color} />
                </td>
                <td className="py-2.5 px-3 text-gray-500">{formatDate(inst.viewed_at)}</td>
                <td className="py-2.5 px-3 text-gray-500">{formatDate(inst.signed_at)}</td>
                <td className="py-2.5 px-3">
                  <HashDisplay hash={inst.personalization_hash} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
