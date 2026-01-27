'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Info, MessageSquare, Send } from 'lucide-react';
import { SmsMessageType } from '@/app/_lib/shared/type/sms.types';
import useSmsStore from '../model/useSmsStore';
import SmsPreview from './SmsPreview';

// SMS 바이트 제한
const SMS_BYTE_LIMIT = 90;
const LMS_BYTE_LIMIT = 2000;

// 한글/영문 바이트 계산 (한글 2바이트, 영문/숫자 1바이트)
function calculateBytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // 한글 범위: AC00-D7A3 (완성형), 3131-318E (자모)
    // 그 외 2바이트 문자 포함
    if (
      (charCode >= 0xac00 && charCode <= 0xd7a3) ||
      (charCode >= 0x3131 && charCode <= 0x318e) ||
      charCode >= 0x80
    ) {
      bytes += 2;
    } else {
      bytes += 1;
    }
  }
  return bytes;
}

// 메시지 타입 추천
function getRecommendedType(bytes: number): SmsMessageType {
  if (bytes <= SMS_BYTE_LIMIT) {
    return 'SMS';
  }
  return 'LMS';
}

interface SmsComposerProps {
  onSend: () => void;
}

export default function SmsComposer({ onSend }: SmsComposerProps) {
  const {
    title,
    setTitle,
    message,
    setMessage,
    msgType,
    setMsgType,
    setByteCount,
    validRecipients,
    pricing,
    setCurrentStep,
  } = useSmsStore();

  const [showConfirm, setShowConfirm] = useState(false);

  // 바이트 계산
  const bytes = useMemo(() => calculateBytes(message), [message]);
  const recommendedType = useMemo(() => getRecommendedType(bytes), [bytes]);
  const maxBytes = msgType === 'SMS' ? SMS_BYTE_LIMIT : LMS_BYTE_LIMIT;
  const isOverLimit = bytes > maxBytes;

  // 바이트 카운트 업데이트
  useEffect(() => {
    setByteCount(bytes);
  }, [bytes, setByteCount]);

  // 메시지 타입이 바이트에 맞지 않으면 자동 변경 제안
  useEffect(() => {
    if (msgType === 'SMS' && bytes > SMS_BYTE_LIMIT) {
      setMsgType('LMS');
    }
  }, [bytes, msgType, setMsgType]);

  // 예상 비용 계산
  const estimatedCost = useMemo(() => {
    const unitPrice = pricing[msgType.toLowerCase() as keyof typeof pricing];
    return validRecipients.length * unitPrice;
  }, [validRecipients.length, msgType, pricing]);

  // 변수 버튼 클릭
  const handleInsertVariable = useCallback((variable: string) => {
    setMessage(message + variable);
  }, [message, setMessage]);

  // 이전 단계로
  const handleBack = useCallback(() => {
    setCurrentStep('upload');
  }, [setCurrentStep]);

  // 전송 확인
  const handleConfirm = useCallback(() => {
    if (!message.trim()) {
      alert('메시지 내용을 입력해주세요.');
      return;
    }
    if (isOverLimit) {
      alert(`메시지가 ${maxBytes}바이트를 초과했습니다.`);
      return;
    }
    setShowConfirm(true);
  }, [message, isOverLimit, maxBytes]);

  // 전송 실행
  const handleSend = useCallback(() => {
    setShowConfirm(false);
    onSend();
  }, [onSend]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">문자 메시지 작성</h2>
          <p className="text-sm text-gray-500 mt-1">
            수신자 {validRecipients.length}명에게 발송할 메시지를 작성하세요
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 작성 영역 */}
        <div className="space-y-4">
          {/* 메시지 타입 선택 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              문자 유형
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="msgType"
                  value="SMS"
                  checked={msgType === 'SMS'}
                  onChange={(e) => setMsgType(e.target.value as SmsMessageType)}
                  disabled={bytes > SMS_BYTE_LIMIT}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`text-sm ${bytes > SMS_BYTE_LIMIT ? 'text-gray-400' : 'text-gray-700'}`}>
                  SMS (90byte)
                </span>
                <span className="text-xs text-gray-400">
                  {pricing.sms}원/건
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="msgType"
                  value="LMS"
                  checked={msgType === 'LMS'}
                  onChange={(e) => setMsgType(e.target.value as SmsMessageType)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">LMS (2000byte)</span>
                <span className="text-xs text-gray-400">
                  {pricing.lms}원/건
                </span>
              </label>
            </div>
            {recommendedType !== msgType && (
              <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                현재 바이트 수에 따라 {recommendedType} 발송을 권장합니다.
              </p>
            )}
          </div>

          {/* 제목 (LMS만) */}
          {msgType === 'LMS' && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 (선택)
              </label>
              <input
                type="text"
                name="sms-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="[조합명] 안내 문자"
                maxLength={100}
                autoComplete="off"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {/* 메시지 내용 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                메시지 내용
              </label>
              <span className={`text-sm ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {bytes} / {maxBytes} byte
              </span>
            </div>
            <textarea
              name="sms-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="{이름}님 안녕하세요.&#10;&#10;OO재개발조합입니다.&#10;중요한 안내사항을 전달드립니다.&#10;&#10;감사합니다."
              rows={8}
              autoComplete="off"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none ${
                isOverLimit ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {isOverLimit && (
              <p className="mt-2 text-sm text-red-600">
                메시지가 {maxBytes}바이트를 초과했습니다. 내용을 줄여주세요.
              </p>
            )}
          </div>

          {/* 변수 삽입 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              사용 가능한 변수
            </p>
            <p className="text-xs text-gray-500 mb-3">
              클릭하면 메시지에 변수가 삽입됩니다. 발송 시 실제 값으로 치환됩니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleInsertVariable('{이름}')}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {'{이름}'}
              </button>
            </div>
          </div>
        </div>

        {/* 미리보기 영역 */}
        <div className="space-y-4">
          <SmsPreview />

          {/* 발송 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-800">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">발송 정보</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>수신자: {validRecipients.length}명</p>
              <p>문자 유형: {msgType} ({msgType === 'SMS' ? '단문' : '장문'})</p>
              <p>예상 비용: {estimatedCost.toLocaleString()}원 ({pricing[msgType.toLowerCase() as keyof typeof pricing]}원 x {validRecipients.length}건)</p>
            </div>
          </div>

          {/* 전송 버튼 */}
          <button
            onClick={handleConfirm}
            disabled={!message.trim() || isOverLimit}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
            전송하기
          </button>
        </div>
      </div>

      {/* 전송 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              문자 전송 확인
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
              <p className="text-sm text-gray-600">
                수신자: <span className="font-medium text-gray-900">{validRecipients.length}명</span>
              </p>
              <p className="text-sm text-gray-600">
                문자 유형: <span className="font-medium text-gray-900">{msgType} ({msgType === 'SMS' ? '단문' : '장문'})</span>
              </p>
              <p className="text-sm text-gray-600">
                예상 비용: <span className="font-medium text-gray-900">{estimatedCost.toLocaleString()}원</span>
                <span className="text-xs text-gray-400 ml-1">
                  ({pricing[msgType.toLowerCase() as keyof typeof pricing]}원 x {validRecipients.length}건)
                </span>
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              전송을 진행하시겠습니까? 전송 후에는 취소할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                전송 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
