'use client';

import { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  XCircle,
  Send,
  Download,
  Home,
  RefreshCw,
  MessageSquare,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import useSmsStore from '../model/useSmsStore';

export default function SmsResult() {
  const { progress, msgType, pricing, invalidRecipients, resetForNewSend } = useSmsStore();
  const [activeTab, setActiveTab] = useState<'all' | 'failed'>('all');

  // 성공률 계산
  const successRate = useMemo(() => {
    const total = progress.successCount + progress.failCount;
    if (total === 0) return 0;
    return Math.round((progress.successCount / total) * 100);
  }, [progress.successCount, progress.failCount]);

  // 실제 비용 (성공 건수 기준)
  const actualCost = useMemo(() => {
    const unitPrice = pricing[msgType.toLowerCase() as keyof typeof pricing];
    return progress.successCount * unitPrice;
  }, [progress.successCount, msgType, pricing]);

  // 전송 완료 시간 포맷
  const completedTime = useMemo(() => {
    if (!progress.completedAt) return '-';
    return progress.completedAt.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [progress.completedAt]);

  // 실패 목록 다운로드
  const handleDownloadFailedList = useCallback(() => {
    // 실패한 배치에서 실패 정보 추출 (실제로는 상세 정보가 필요)
    const failedRecipients = progress.batchResults
      .filter((batch) => batch.status === 'failed' || batch.status === 'partial')
      .map((batch) => ({
        배치번호: batch.batchIndex + 1,
        시작번호: batch.startIndex + 1,
        종료번호: batch.endIndex + 1,
        실패건수: batch.failCount,
        오류메시지: batch.errorMessage || '알 수 없음',
      }));

    if (failedRecipients.length === 0) {
      alert('실패 내역이 없습니다.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(failedRecipients);
    XLSX.utils.book_append_sheet(workbook, worksheet, '실패 목록');
    XLSX.writeFile(workbook, `sms_failed_list_${Date.now()}.xlsx`);
  }, [progress.batchResults]);

  // 새 문자 보내기
  const handleNewSend = useCallback(() => {
    resetForNewSend();
  }, [resetForNewSend]);

  return (
    <div className="space-y-6">
      {/* 완료 헤더 */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          전송이 완료되었습니다!
        </h2>
        <p className="text-gray-500 mt-2">{completedTime}</p>
      </div>

      {/* 전송 결과 요약 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          전송 결과 요약
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Send className="w-6 h-6 mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-500">총 발송 시도</p>
            <p className="text-2xl font-bold text-gray-900">
              {progress.totalRecipients}건
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-gray-500">전송 성공</p>
            <p className="text-2xl font-bold text-green-600">
              {progress.successCount}건
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-gray-500">전송 실패</p>
            <p className="text-2xl font-bold text-red-600">
              {progress.failCount}건
            </p>
          </div>
        </div>

        {/* 비용 정보 */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">예상 결제 금액 (VAT 별도)</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {actualCost.toLocaleString()}원
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ({msgType} {pricing[msgType.toLowerCase() as keyof typeof pricing]}원 x {progress.successCount}건 성공)
            <span className="text-gray-400 ml-2">* 실패 건은 과금되지 않음</span>
          </p>
        </div>
      </div>

      {/* 성공률 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-700">전송 성공률</span>
          <span className="text-2xl font-bold text-gray-900">{successRate}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {/* 상세 내역 탭 */}
      {(progress.failCount > 0 || invalidRecipients.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              전체 로그
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'failed'
                  ? 'bg-gray-50 text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <XCircle className="w-4 h-4" />
              실패 목록 ({progress.failCount + invalidRecipients.length})
            </button>
          </div>

          <div className="p-4 max-h-60 overflow-y-auto">
            {activeTab === 'all' ? (
              <div className="space-y-2">
                {progress.batchResults.map((result) => (
                  <div
                    key={result.batchIndex}
                    className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-gray-700">
                      Batch {result.batchIndex + 1}: {result.startIndex + 1}~{result.endIndex + 1}번
                    </span>
                    <span
                      className={`font-medium ${
                        result.status === 'success'
                          ? 'text-green-600'
                          : result.status === 'partial'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {result.status === 'success'
                        ? `성공 ${result.successCount}건`
                        : result.status === 'partial'
                        ? `성공 ${result.successCount} / 실패 ${result.failCount}`
                        : `실패`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* 업로드 시 유효하지 않은 수신자 */}
                {invalidRecipients.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      유효하지 않은 수신자 (업로드 시 제외됨)
                    </p>
                    {invalidRecipients.slice(0, 5).map((recipient, index) => (
                      <div key={index} className="text-sm text-gray-600 py-1">
                        {recipient.name || '(이름없음)'} - {recipient.phone || '(번호없음)'}: {recipient.errorMessage}
                      </div>
                    ))}
                    {invalidRecipients.length > 5 && (
                      <p className="text-xs text-gray-400">...외 {invalidRecipients.length - 5}건</p>
                    )}
                  </div>
                )}

                {/* 전송 실패 배치 */}
                {progress.batchResults
                  .filter((r) => r.status === 'failed' || r.status === 'partial')
                  .map((result) => (
                    <div
                      key={result.batchIndex}
                      className="text-sm py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">
                          Batch {result.batchIndex + 1}: {result.startIndex + 1}~{result.endIndex + 1}번
                        </span>
                        <span className="text-red-600 font-medium">
                          실패 {result.failCount}건
                        </span>
                      </div>
                      {result.errorMessage && (
                        <p className="text-xs text-gray-500 mt-1">
                          사유: {result.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}

                {progress.failCount > 0 && (
                  <button
                    onClick={handleDownloadFailedList}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    실패 목록 엑셀 다운로드
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={() => window.location.href = '../'}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Home className="w-5 h-5" />
          대시보드로 이동
        </button>
        <button
          onClick={handleNewSend}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          다른 문자 보내기
        </button>
      </div>
    </div>
  );
}
