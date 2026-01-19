'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Building2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import RecipientUploader from '@/app/_lib/features/sms/ui/RecipientUploader';
import SmsComposer from '@/app/_lib/features/sms/ui/SmsComposer';
import SmsProgress from '@/app/_lib/features/sms/ui/SmsProgress';
import SmsResult from '@/app/_lib/features/sms/ui/SmsResult';
import useSmsStore from '@/app/_lib/features/sms/model/useSmsStore';

// 조합 목록 조회 훅
function useUnionsList() {
  return useQuery({
    queryKey: ['system-admin-unions-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unions')
        .select('id, name, slug')
        .order('name', { ascending: true });

      if (error) {
        throw new Error('조합 목록을 불러오는데 실패했습니다.');
      }

      return data || [];
    },
  });
}

// SMS 전송 API 호출 함수
async function sendSmsBatch(
  unionId: string,
  recipients: { name: string; phone: string }[],
  message: string,
  msgType: 'SMS' | 'LMS' | 'MMS',
  title?: string,
  startIndex: number = 0
) {
  const response = await fetch('/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      unionId,
      recipients,
      message,
      msgType,
      title,
      startIndex,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'SMS 전송 실패');
  }

  return response.json();
}

export default function SystemAdminSmsPage() {
  const [selectedUnionId, setSelectedUnionId] = useState<string>('');
  const { data: unions, isLoading: isUnionsLoading, error: unionsError } = useUnionsList();

  const {
    currentStep,
    setCurrentStep,
    validRecipients,
    message,
    msgType,
    title,
    initProgress,
    updateBatchResult,
    completeProgress,
    reset,
  } = useSmsStore();

  // 컴포넌트 마운트 시 스토어 리셋
  useEffect(() => {
    reset();
  }, [reset]);

  // SMS 전송 처리
  const handleSend = useCallback(async () => {
    if (!selectedUnionId) {
      alert('조합을 선택해주세요.');
      return;
    }

    if (validRecipients.length === 0) {
      alert('수신자가 없습니다.');
      return;
    }

    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(validRecipients.length / BATCH_SIZE);

    // 진행 상태 초기화
    initProgress(validRecipients.length, BATCH_SIZE);
    setCurrentStep('sending');

    // 배치별 전송
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, validRecipients.length);
      const batchRecipients = validRecipients.slice(startIndex, endIndex);

      try {
        const result = await sendSmsBatch(
          selectedUnionId,
          batchRecipients.map((r) => ({ name: r.name, phone: r.phone })),
          message,
          msgType,
          title,
          startIndex
        );

        updateBatchResult({
          batchIndex,
          startIndex,
          endIndex: endIndex - 1,
          status: result.error_cnt > 0 ? 'partial' : 'success',
          successCount: result.success_cnt || batchRecipients.length,
          failCount: result.error_cnt || 0,
          msgId: result.msg_id?.toString(),
        });
      } catch (error) {
        console.error(`Batch ${batchIndex} 전송 실패:`, error);
        updateBatchResult({
          batchIndex,
          startIndex,
          endIndex: endIndex - 1,
          status: 'failed',
          successCount: 0,
          failCount: batchRecipients.length,
          errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }

      // 배치 간 딜레이 (API rate limit 대응)
      if (batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // 전송 완료
    completeProgress();
  }, [
    selectedUnionId,
    validRecipients,
    message,
    msgType,
    title,
    initProgress,
    setCurrentStep,
    updateBatchResult,
    completeProgress,
  ]);

  // 단계별 렌더링
  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return <RecipientUploader />;
      case 'compose':
        return <SmsComposer onSend={handleSend} />;
      case 'sending':
        return <SmsProgress />;
      case 'result':
        return <SmsResult />;
      default:
        return <RecipientUploader />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SMS 문자 발송</h1>
            <p className="text-slate-400 text-sm">시스템 관리자 전용 대량 문자 발송</p>
          </div>
        </div>
      </div>

      {/* 조합 선택 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">발송 대상 조합 선택</h2>
        </div>

        {isUnionsLoading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            조합 목록을 불러오는 중...
          </div>
        ) : unionsError ? (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            조합 목록을 불러오는데 실패했습니다.
          </div>
        ) : (
          <select
            value={selectedUnionId}
            onChange={(e) => setSelectedUnionId(e.target.value)}
            disabled={currentStep !== 'upload'}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">조합을 선택하세요</option>
            {unions?.map((union) => (
              <option key={union.id} value={union.id}>
                {union.name}
              </option>
            ))}
          </select>
        )}

        {!selectedUnionId && currentStep === 'upload' && (
          <p className="mt-2 text-sm text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            조합을 선택해야 문자를 발송할 수 있습니다.
          </p>
        )}
      </div>

      {/* 메인 컨텐츠 */}
      {selectedUnionId ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          {renderStep()}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">먼저 발송 대상 조합을 선택해주세요.</p>
        </div>
      )}

      {/* 안내 사항 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-2">📌 발송 안내</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• SMS (단문): 90byte 이하, 약 45자 (한글 기준)</li>
          <li>• LMS (장문): 2,000byte 이하, 약 1,000자 (한글 기준)</li>
          <li>• 발송 비용은 성공 건수에 대해서만 과금됩니다.</li>
          <li>• 대량 발송 시 배치 단위(50건)로 처리되며, API 제한으로 인해 약간의 지연이 발생할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}
