'use client';

import { Calendar, Users, FileText, ChevronRight } from 'lucide-react';
import { Evote, EVOTE_STATUS_LABELS, EVOTE_TYPE_LABELS } from '@/app/_lib/features/evote/types/evote.types';
import { EVOTE_STATUS_BADGE, EVOTE_TYPE_BADGE } from './evoteConstants';

interface EvoteCardProps {
  evote: Evote;
  onClick: () => void;
}

export default function EvoteCard({ evote, onClick }: EvoteCardProps) {
  const isClosed = evote.status === 'CLOSED' || evote.status === 'CANCELLED';
  const statusBadge = EVOTE_STATUS_BADGE[evote.status];
  const typeBadge = EVOTE_TYPE_BADGE[evote.evote_type];
  const itemCount = evote.items?.length ?? 0;

  // 참여율 계산 (total_voters가 있을 때만)
  const participationText = evote.total_voters != null ? `${evote.total_voters}명` : '-';

  // 기간 포맷
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const periodText =
    evote.start_at || evote.end_at
      ? `${formatDate(evote.start_at)} ~ ${formatDate(evote.end_at)}`
      : '기간 미설정';

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer ${isClosed ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{evote.title}</h3>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${typeBadge.bg} ${typeBadge.text}`}>
            {EVOTE_TYPE_LABELS[evote.evote_type]}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-3 ${statusBadge.bg} ${statusBadge.text}`}>
          {EVOTE_STATUS_LABELS[evote.status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>안건 {itemCount}건</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{periodText}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>대상 {participationText}</span>
        </div>
      </div>

      {evote.description && (
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{evote.description}</p>
      )}

      <div className="flex items-center justify-end mt-4 pt-3 border-t border-gray-100">
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}
