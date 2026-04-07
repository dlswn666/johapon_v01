'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useAgendaItems, useCreateAgendaItem, useDeleteAgendaItem } from '@/app/_lib/features/assembly/api/useAgendaHook';
import {
  AGENDA_TYPE_LABELS,
  ASSEMBLY_STATUS_LABELS,
  AgendaType,
  QUORUM_DEFAULTS,
} from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { ArrowLeft, Plus, Trash2, GripVertical, FileText } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';

export default function AgendasPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly } = useAssembly(assemblyId);
  const { data: agendaItems, isLoading: isAgendasLoading } = useAgendaItems(assemblyId);
  const createMutation = useCreateAgendaItem(assemblyId);
  const deleteMutation = useDeleteAgendaItem(assemblyId);
  const { openConfirmModal } = useModalStore();

  // 새 안건 입력 폼
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<AgendaType>('GENERAL');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate(
      { title: newTitle, agenda_type: newType, description: newDescription || undefined },
      {
        onSuccess: () => {
          setNewTitle('');
          setNewType('GENERAL');
          setNewDescription('');
          setShowForm(false);
        },
      }
    );
  };

  const handleDelete = (agendaId: string, title: string) => {
    openConfirmModal({
      title: '안건 삭제',
      message: `"${title}" 안건을 삭제하시겠습니까?\n연결된 투표 세션도 함께 삭제됩니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => deleteMutation.mutate(agendaId),
    });
  };

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-10 w-28 rounded-md" style={{ animationDelay: '100ms' }} />
        </div>
        {/* 안건 아이템 */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 flex items-start gap-3">
            <Skeleton className="w-5 h-5 mt-1" style={{ animationDelay: `${200 + i * 150}ms` }} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-14 rounded" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isAdmin) return null;

  const isEditable = assembly && ['DRAFT', 'NOTICE_SENT'].includes(assembly.status);

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">안건 관리</h1>
            <p className="text-sm text-gray-500">
              {assembly?.title} | {assembly ? ASSEMBLY_STATUS_LABELS[assembly.status] : ''}
            </p>
          </div>
        </div>
        {isEditable && (
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            안건 추가
          </Button>
        )}
      </div>

      {/* 새 안건 입력 폼 */}
      {showForm && isEditable && (
        <div className="bg-white rounded-lg border border-blue-200 p-5 space-y-4">
          <h3 className="font-medium text-gray-900">새 안건 등록</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">안건 제목 *</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 2026년도 예산안 승인"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">안건 유형</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AgendaType)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.entries(AGENDA_TYPE_LABELS) as [AgendaType, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">설명 (선택)</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="안건에 대한 간단한 설명"
            />
          </div>
          {/* 정족수 기본값 안내 */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
            정족수 기본값: 출석 {QUORUM_DEFAULTS[newType]?.quorumThresholdPct}% 이상,
            찬성 {QUORUM_DEFAULTS[newType]?.approvalThresholdPct}% 이상
            {QUORUM_DEFAULTS[newType]?.requiresDirect && ' (직접출석만)'}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? '등록 중...' : '안건 등록'}
            </Button>
          </div>
        </div>
      )}

      {/* 안건 목록 */}
      {isAgendasLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 flex items-start gap-3">
              <Skeleton className="w-5 h-5 mt-1" style={{ animationDelay: `${i * 150}ms` }} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : agendaItems && agendaItems.length > 0 ? (
        <div className="space-y-3">
          {agendaItems.map((agenda) => (
            <div
              key={agenda.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3"
            >
              <div className="text-gray-400 mt-1">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-blue-600">
                    제{agenda.seq_order}호
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                    {AGENDA_TYPE_LABELS[agenda.agenda_type] || agenda.agenda_type}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900">{agenda.title}</h3>
                {agenda.description && (
                  <p className="text-sm text-gray-500 mt-1">{agenda.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  정족수: 출석 {agenda.quorum_threshold_pct ?? 50}% / 찬성 {agenda.approval_threshold_pct ?? 50}%
                  {agenda.quorum_requires_direct && ' (직접출석만)'}
                </p>
              </div>
              {isEditable && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(agenda.id, agenda.title)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">등록된 안건이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">안건을 추가하여 총회를 준비하세요</p>
        </div>
      )}
    </div>
  );
}
