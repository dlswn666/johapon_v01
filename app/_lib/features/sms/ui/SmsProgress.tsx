'use client';

import { useMemo } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { SmsBatchResult } from '@/app/_lib/shared/type/sms.types';
import useSmsStore from '../model/useSmsStore';

// 배치 상태에 따른 아이콘
function BatchStatusIcon({ status }: { status: SmsBatchResult['status'] }) {
  switch (status) {
    case 'sending':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'partial':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
}

// 배치 상태에 따른 텍스트
function getBatchStatusText(result: SmsBatchResult): string {
  switch (result.status) {
    case 'sending':
      return '전송 중...';
    case 'success':
      return `성공 (${result.successCount}건)`;
    case 'partial':
      return `일부 실패 (성공: ${result.successCount}, 실패: ${result.failCount})`;
    case 'failed':
      return `실패 (${result.errorMessage || '알 수 없는 오류'})`;
    default:
      return '대기 중';
  }
}

export default function SmsProgress() {
  const { progress, validRecipients } = useSmsStore();

  // 진행률 계산
  const progressPercent = useMemo(() => {
    if (progress.totalRecipients === 0) return 0;
    return Math.round((progress.processedCount / progress.totalRecipients) * 100);
  }, [progress.processedCount, progress.totalRecipients]);

  // 예상 남은 시간 (1배치당 약 1초 + 처리시간)
  const estimatedRemainingTime = useMemo(() => {
    const remainingBatches = progress.totalBatches - progress.currentBatch;
    const seconds = remainingBatches * 1.5; // 배치당 약 1.5초 예상
    if (seconds < 60) {
      return `약 ${Math.ceil(seconds)}초`;
    }
    return `약 ${Math.ceil(seconds / 60)}분`;
  }, [progress.totalBatches, progress.currentBatch]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          문자 메시지 전송 중...
        </h2>
        <p className="text-gray-500 mt-2">
          {validRecipients.length}명에게 메시지를 발송하고 있습니다.
        </p>
      </div>

      {/* 진행률 바 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            전송 진행률
          </span>
          <span className="text-sm text-gray-500">
            {progress.processedCount} / {progress.totalRecipients}명
          </span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xl font-bold text-blue-600">
            {progressPercent}%
          </span>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            예상 남은 시간: {estimatedRemainingTime}
          </span>
        </div>
      </div>

      {/* 실시간 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">전송 성공</p>
          <p className="text-2xl font-bold text-green-600">{progress.successCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">전송 실패</p>
          <p className="text-2xl font-bold text-red-600">{progress.failCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">진행 배치</p>
          <p className="text-2xl font-bold text-gray-900">
            {progress.currentBatch} / {progress.totalBatches}
          </p>
        </div>
      </div>

      {/* 배치 로그 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">전송 진행 로그</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {progress.batchResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-gray-400" />
              <p>첫 번째 배치 처리 중...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* 역순으로 표시 (최신이 위로) */}
              {[...progress.batchResults].reverse().map((result) => (
                <div
                  key={result.batchIndex}
                  className={`px-4 py-3 flex items-start gap-3 ${
                    result.status === 'sending' ? 'bg-blue-50' : ''
                  }`}
                >
                  <BatchStatusIcon status={result.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      [Batch {result.batchIndex + 1}] {result.startIndex + 1}번째 ~ {result.endIndex + 1}번째 수신자
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {getBatchStatusText(result)}
                    </p>
                    {result.msgId && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        메시지 ID: {result.msgId}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 주의사항 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>주의:</strong> 전송 중에 페이지를 닫거나 새로고침하면 전송이 중단될 수 있습니다.
          전송이 완료될 때까지 이 페이지를 유지해주세요.
        </p>
      </div>
    </div>
  );
}
