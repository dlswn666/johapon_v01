'use client';

import React from 'react';
import { use } from 'react';
import DelegationStateMachineUI from '@/app/_lib/features/assembly/ui/DelegationStateMachineUI';

interface PageProps {
  params: Promise<{ slug: string; assemblyId: string }>;
}

export default function DelegationPage({ params }: PageProps) {
  const { assemblyId } = use(params);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">위임 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          위임은 투표 종료 전까지 취소할 수 있습니다. 대리인이 투표를 완료하면 취소가 불가합니다.
        </p>
      </div>

      {/* 내 위임 현황 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">내 위임 현황</h2>
        <DelegationStateMachineUI assemblyId={assemblyId} mode="DELEGATOR" />
      </section>

      {/* 내게 온 위임 요청 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">내게 온 위임 요청</h2>
        <DelegationStateMachineUI assemblyId={assemblyId} mode="DELEGATE" />
      </section>
    </div>
  );
}
