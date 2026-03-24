'use client';

import React from 'react';
import { CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

interface VoteCompleteViewProps {
  receiptToken?: string;
  votedAt?: string;
  assemblyTitle: string;
}

/**
 * 투표 완료 화면: 체크 아이콘 + 완료 메시지 + 영수증 토큰 + 복사 버튼
 */
export default function VoteCompleteView({
  receiptToken,
  votedAt,
  assemblyTitle,
}: VoteCompleteViewProps) {
  const { openAlertModal } = useModalStore();

  const copyReceipt = async () => {
    if (!receiptToken) return;
    try {
      await navigator.clipboard.writeText(receiptToken);
      openAlertModal({
        title: '복사 완료',
        message: '투표 영수증이 클립보드에 복사되었습니다.',
        type: 'success',
      });
    } catch {
      openAlertModal({
        title: '복사 실패',
        message: '클립보드 접근이 거부되었습니다.',
        type: 'error',
      });
    }
  };

  return (
    <div data-testid="vote-complete" className="flex flex-col items-center justify-center px-6 py-12">
      {/* 성공 아이콘 */}
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">투표가 완료되었습니다</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">{assemblyTitle}</p>

      {/* 영수증 */}
      {receiptToken && (
        <div className="w-full max-w-sm bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-xs text-gray-500 font-medium">투표 영수증</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-700 bg-white px-3 py-2 rounded border border-gray-200 flex-1 truncate">
              {receiptToken}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReceipt}
              className="flex-shrink-0"
              aria-label="투표 영수증 복사"
            >
              <Copy className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            이 코드로 나중에 투표 내역을 확인하실 수 있습니다
          </p>
        </div>
      )}

      {/* 투표 일시 */}
      {votedAt && (
        <p className="text-xs text-gray-400 mt-4">
          투표 일시: {new Date(votedAt).toLocaleString('ko-KR')}
        </p>
      )}
    </div>
  );
}
