'use client';

import { Monitor, FileText, MapPin, UserCheck } from 'lucide-react';
import type { EvoteParticipation } from '@/app/_lib/features/evote/api/useEvoteDashboard';

interface ParticipationByMethodProps {
  participation: EvoteParticipation;
}

const METHOD_CONFIG = [
  {
    key: 'electronic' as const,
    label: '전자투표',
    icon: Monitor,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    isDirect: true,
  },
  {
    key: 'written' as const,
    label: '서면결의',
    icon: FileText,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    isDirect: false,
  },
  {
    key: 'onsite' as const,
    label: '현장투표',
    icon: MapPin,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    isDirect: true,
  },
  {
    key: 'proxy' as const,
    label: '대리인',
    icon: UserCheck,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    isDirect: false,
  },
] as const;

export default function ParticipationByMethod({ participation }: ParticipationByMethodProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">참여 방식별 현황</h2>
        <span className="text-sm text-gray-500">
          총 참여: <span className="font-semibold text-gray-900">{participation.total}명</span>
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METHOD_CONFIG.map((method) => {
          const Icon = method.icon;
          const count = participation[method.key];
          return (
            <div key={method.key} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method.iconBg}`}>
                <Icon className={`w-5 h-5 ${method.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{method.label}</p>
                <p className="text-lg font-bold text-gray-900">{count}명</p>
                <p className={`text-xs ${method.isDirect ? 'text-green-600' : 'text-gray-400'}`}>
                  {method.isDirect ? '직접출석 ✓' : '출석만'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
