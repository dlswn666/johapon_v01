'use client';

import { useMemo } from 'react';
import { Smartphone } from 'lucide-react';
import useSmsStore from '../model/useSmsStore';

// 변수 치환 함수
function replaceVariables(template: string, name: string): string {
  return template.replace(/{이름}/g, name);
}

export default function SmsPreview() {
  const { title, message, msgType, validRecipients } = useSmsStore();

  // 미리보기용 샘플 수신자
  const sampleRecipient = useMemo(() => {
    if (validRecipients.length > 0) {
      return validRecipients[0];
    }
    return { name: '홍길동', phone: '01012345678', isValid: true };
  }, [validRecipients]);

  // 변수가 치환된 메시지
  const previewMessage = useMemo(() => {
    return replaceVariables(message || '메시지를 입력해주세요.', sampleRecipient.name);
  }, [message, sampleRecipient.name]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Smartphone className="w-5 h-5 text-gray-500" />
        <span className="font-medium text-gray-700">미리보기</span>
        <span className="text-xs text-gray-400">
          (수신자: {sampleRecipient.name})
        </span>
      </div>

      {/* 스마트폰 프레임 */}
      <div className="mx-auto w-64 bg-gray-900 rounded-3xl p-2">
        {/* 노치 */}
        <div className="bg-gray-900 rounded-t-2xl pt-2 pb-1">
          <div className="w-20 h-5 bg-black rounded-full mx-auto" />
        </div>

        {/* 화면 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900 text-center">
              {msgType === 'SMS' ? '단문 메시지' : '장문 메시지'}
            </p>
          </div>

          {/* 메시지 영역 */}
          <div className="p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
            {/* 발신자 */}
            <div className="text-center mb-4">
              <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
                발신번호
              </span>
            </div>

            {/* 메시지 버블 */}
            <div className="space-y-2">
              {/* 제목 (LMS) */}
              {msgType === 'LMS' && title && (
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                  <p className="text-sm font-semibold text-gray-900">
                    {title}
                  </p>
                </div>
              )}

              {/* 메시지 내용 */}
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {previewMessage}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 바 */}
        <div className="bg-gray-900 rounded-b-2xl py-2">
          <div className="w-24 h-1 bg-white rounded-full mx-auto opacity-50" />
        </div>
      </div>

      {/* 안내 문구 */}
      <p className="text-xs text-gray-400 text-center mt-4">
        실제 발송 시 {'{이름}'} 부분이 각 수신자의 이름으로 변환됩니다.
      </p>
    </div>
  );
}
