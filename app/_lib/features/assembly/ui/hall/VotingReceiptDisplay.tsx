'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useVoteReceipt, useDownloadReceipt } from '../../api/useVoteReceiptHook';

interface VotingReceiptDisplayProps {
  pollId: string;
  assemblyId: string;
}

export default function VotingReceiptDisplay({ pollId, assemblyId }: VotingReceiptDisplayProps) {
  const { data: receipt, isLoading } = useVoteReceipt(pollId, assemblyId);
  const downloadMutation = useDownloadReceipt(assemblyId);

  if (isLoading) return null;
  if (!receipt) return null;

  const votedAt = new Date(receipt.voted_at).toLocaleString('ko-KR');

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm font-bold text-green-800">투표 완료</p>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p>총회: {receipt.assembly_name}</p>
        <p>안건: {receipt.agenda_title}</p>
        <p>투표 일시: {votedAt}</p>
        <p className="font-mono">영수증: {receipt.receipt_token_truncated}...</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => downloadMutation.mutate({ pollId })}
        disabled={downloadMutation.isPending}
        className="text-xs"
      >
        {downloadMutation.isPending ? '저장 중...' : '영수증 저장'}
      </Button>
    </div>
  );
}
