'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEvoteVoters, VoterFilter } from '@/app/_lib/features/evote/api/useEvoteVoters';
import { useSendReminder } from '@/app/_lib/features/evote/api/useSendReminder';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

interface VoterListModalProps {
  evoteId: string;
  open: boolean;
  onClose: () => void;
}

const FILTER_TABS: { label: string; value: VoterFilter }[] = [
  { label: '전체', value: 'ALL' },
  { label: '투표완료', value: 'VOTED' },
  { label: '미투표', value: 'NOT_VOTED' },
];

export default function VoterListModal({ evoteId, open, onClose }: VoterListModalProps) {
  const [filter, setFilter] = useState<VoterFilter>('ALL');
  const { data: voters, isLoading } = useEvoteVoters(open ? evoteId : undefined, filter);
  const sendReminder = useSendReminder(evoteId);
  const openConfirmModal = useModalStore((state) => state.openConfirmModal);

  const notVotedCount = voters?.filter((v) => !v.has_voted).length ?? 0;

  const handleSendReminder = () => {
    openConfirmModal({
      title: '리마인더 발송',
      message: `미투표자 ${notVotedCount}명에게 리마인더를 발송하시겠습니까?`,
      confirmText: '발송',
      cancelText: '취소',
      onConfirm: () => {
        sendReminder.mutate();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900">투표 대상자</DialogTitle>
        </DialogHeader>

        {/* 필터 탭 */}
        <div className="flex gap-2">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={filter === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">불러오는 중...</span>
            </div>
          ) : !voters || voters.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <span className="text-sm">대상자가 없습니다.</span>
            </div>
          ) : (
            voters.map((voter) => (
              <div
                key={voter.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{voter.name}</span>
                  {voter.has_voted ? (
                    <Badge className="bg-green-100 text-green-700 border-transparent">
                      <CheckCircle2 className="w-3 h-3" />
                      투표완료
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-500 border-transparent">
                      <Clock className="w-3 h-3" />
                      미투표
                    </Badge>
                  )}
                </div>
                {voter.voted_at && (
                  <span className="text-xs text-gray-400">
                    {new Date(voter.voted_at).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* 하단 액션 */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            onClick={handleSendReminder}
            disabled={sendReminder.isPending || notVotedCount === 0}
          >
            {sendReminder.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            리마인더 발송 ({notVotedCount}명)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
