'use client';

import React, { useState } from 'react';
import { use } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  useVoterRollPreview,
  useSnapshotList,
  useSnapshotDiff,
  useCreateSnapshot,
  useLockSnapshot,
  useExportSnapshotCsv,
} from '@/app/_lib/features/assembly/api/useVoterRollHook';

interface PageProps {
  params: Promise<{ slug: string; assemblyId: string }>;
}

export default function VoterRollPage({ params }: PageProps) {
  const { assemblyId } = use(params);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | undefined>();

  const { data: preview, isLoading: previewLoading } = useVoterRollPreview(assemblyId);
  const { data: snapshots = [], isLoading: snapshotsLoading } = useSnapshotList(assemblyId);
  const { data: diff } = useSnapshotDiff(assemblyId, selectedSnapshotId);

  const createMutation = useCreateSnapshot(assemblyId);
  const lockMutation = useLockSnapshot(assemblyId);
  const exportMutation = useExportSnapshotCsv(assemblyId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">유권자 명부 관리</h1>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
          <TabsTrigger value="snapshots">스냅샷</TabsTrigger>
        </TabsList>

        {/* 미리보기 탭 */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          {previewLoading ? (
            <p className="text-sm text-gray-500">로딩 중...</p>
          ) : preview ? (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="font-medium">전체: {preview.total}명</span>
                <span className="text-green-700 font-medium">자격자: {preview.eligible}명</span>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left text-xs text-gray-500">
                        <th className="px-4 py-2 font-medium">이름</th>
                        <th className="px-4 py-2 font-medium">연락처</th>
                        <th className="px-4 py-2 font-medium">의결권</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.members.map((m) => (
                        <tr key={m.id}>
                          <td className="px-4 py-2">{m.member_name}</td>
                          <td className="px-4 py-2 text-gray-500">{m.member_phone ?? '-'}</td>
                          <td className="px-4 py-2">{m.voting_weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">미리보기 데이터가 없습니다.</p>
          )}
        </TabsContent>

        {/* 스냅샷 탭 */}
        <TabsContent value="snapshots" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '생성 중...' : '새 스냅샷 생성'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              CSV 내보내기
            </Button>
          </div>

          {snapshotsLoading ? (
            <p className="text-sm text-gray-500">로딩 중...</p>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-gray-400">생성된 스냅샷이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className={`p-4 rounded-lg border ${
                    selectedSnapshotId === snap.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(snap.created_at).toLocaleString('ko-KR')}
                      </p>
                      <p className="text-xs text-gray-500">{snap.member_count}명</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {snap.is_locked && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">확정됨</span>
                      )}
                      {!snap.is_locked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => lockMutation.mutate({ snapshotId: snap.id })}
                          disabled={lockMutation.isPending}
                        >
                          명부 확정 (다중 승인)
                        </Button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setSelectedSnapshotId(snap.id === selectedSnapshotId ? undefined : snap.id)}
                      >
                        {selectedSnapshotId === snap.id ? '비교 닫기' : '변경 비교'}
                      </button>
                    </div>
                  </div>

                  {/* 변경분 표시 */}
                  {selectedSnapshotId === snap.id && diff && (
                    <div className="mt-3 pt-3 border-t border-blue-200 text-xs space-y-1">
                      <p className="font-medium text-gray-700">이전 대비 변경: {diff.total_changes}건</p>
                      {diff.added.length > 0 && (
                        <p className="text-green-700">추가: {diff.added.join(', ')}</p>
                      )}
                      {diff.removed.length > 0 && (
                        <p className="text-red-700">제거: {diff.removed.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
