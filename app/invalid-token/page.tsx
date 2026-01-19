'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const REASON_MESSAGES: Record<string, string> = {
  not_found: '존재하지 않는 링크입니다.',
  deleted: '관리자가 이 링크를 비활성화했습니다.',
  expired: '이 링크는 만료되었습니다.',
  max_usage_reached: '이 링크의 사용 횟수가 초과되었습니다.',
  wrong_union: '이 링크로는 해당 조합에 접근할 수 없습니다.',
  invalid: '유효하지 않은 링크입니다.',
};

function InvalidTokenContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'invalid';
  const message = REASON_MESSAGES[reason] || REASON_MESSAGES.invalid;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* 아이콘 */}
        <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-amber-600" />
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          접근할 수 없습니다
        </h1>

        {/* 메시지 */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* 안내 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-500 mb-2">이 링크는 만료되었거나 유효하지 않습니다.</p>
          <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
            <li>링크가 만료되었을 수 있습니다</li>
            <li>관리자가 링크를 비활성화했을 수 있습니다</li>
            <li>링크가 잘못 입력되었을 수 있습니다</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-center"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}

export default function InvalidTokenPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InvalidTokenContent />
    </Suspense>
  );
}
