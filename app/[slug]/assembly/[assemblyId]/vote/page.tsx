import { redirect } from 'next/navigation';
import { use } from 'react';

/**
 * 투표 페이지 → 총회장으로 리다이렉트
 * 기존 알림톡 링크 하위 호환
 */
export default function VotePage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  redirect(`../assembly/${assemblyId}/hall`);
}
