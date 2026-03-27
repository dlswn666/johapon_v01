'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly, useTransitionAssemblyStatus } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import {
  ASSEMBLY_STATUS_LABELS,
  ASSEMBLY_TYPE_LABELS,
  AssemblyStatus,
} from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { ArrowLeft, Settings, FileText, Vote, Users, QrCode, ClipboardList, BarChart2, UserPlus, FileCheck, Bell, Shield } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import QuorumDashboard from '@/app/_lib/features/assembly/ui/QuorumDashboard';
import AdminLiveDashboard from '@/app/_lib/features/assembly/ui/admin/AdminLiveDashboard';
import ComplianceBanner from '@/app/_lib/features/assembly/ui/ComplianceBanner';
import { useComplianceCheck } from '@/app/_lib/features/assembly/api/useComplianceHook';
import { getTransitionCheckpoint } from '@/app/_lib/features/assembly/domain/assemblyStateMachine';
import type { ComplianceCheckpoint } from '@/app/_lib/shared/type/assembly.types';

// 상태 전이 버튼 설정
const STATUS_ACTIONS: Record<string, { nextStatus: AssemblyStatus; label: string; variant: 'default' | 'destructive' | 'outline' }[]> = {
  DRAFT: [
    { nextStatus: 'NOTICE_SENT', label: '소집공고 발송', variant: 'default' },
    { nextStatus: 'CANCELLED', label: '취소', variant: 'destructive' },
  ],
  NOTICE_SENT: [
    { nextStatus: 'CONVENED', label: '소집완료', variant: 'default' },
    { nextStatus: 'CANCELLED', label: '취소', variant: 'destructive' },
  ],
  CONVENED: [
    { nextStatus: 'IN_PROGRESS', label: '개회', variant: 'default' },
    { nextStatus: 'CANCELLED', label: '취소', variant: 'destructive' },
  ],
  IN_PROGRESS: [
    { nextStatus: 'VOTING', label: '투표 개시', variant: 'default' },
  ],
  VOTING: [
    { nextStatus: 'VOTING_CLOSED', label: '투표 마감', variant: 'default' },
  ],
  VOTING_CLOSED: [
    { nextStatus: 'CLOSED', label: '총회 종료', variant: 'default' },
  ],
  CLOSED: [
    { nextStatus: 'ARCHIVED', label: '보관 처리', variant: 'outline' },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  NOTICE_SENT: 'bg-blue-100 text-blue-700',
  CONVENED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  VOTING: 'bg-yellow-100 text-yellow-700',
  VOTING_CLOSED: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-200 text-gray-500',
  CANCELLED: 'bg-red-200 text-red-600',
};

// 정족수 대시보드를 표시할 총회 상태
const QUORUM_VISIBLE_STATUSES = ['IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'];

// 통합 라이브 대시보드를 표시할 총회 상태
const LIVE_DASHBOARD_STATUSES = ['IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'];

export default function AssemblyDashboardPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly, isLoading } = useAssembly(assemblyId);
  const transitionMutation = useTransitionAssemblyStatus();
  const { openConfirmModal } = useModalStore();

  // 현재 상태에 맞는 컴플라이언스 체크포인트 결정
  const complianceCheckpoint = assembly
    ? (getTransitionCheckpoint(assembly.status, STATUS_ACTIONS[assembly.status]?.[0]?.nextStatus || assembly.status) as ComplianceCheckpoint | null)
    : null;
  const { data: complianceResult, isLoading: isComplianceLoading } = useComplianceCheck(
    assemblyId,
    complianceCheckpoint || undefined
  );

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  const handleStatusTransition = (nextStatus: AssemblyStatus) => {
    const label = ASSEMBLY_STATUS_LABELS[nextStatus];
    openConfirmModal({
      title: '상태 변경 확인',
      message: `총회 상태를 "${label}"(으)로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      variant: nextStatus === 'CANCELLED' ? 'danger' : 'default',
      onConfirm: () => {
        transitionMutation.mutate({ assemblyId, status: nextStatus });
      },
    });
  };

  if (isUnionLoading || isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

  if (!assembly) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold text-gray-700">총회를 찾을 수 없습니다</p>
          <Button variant="outline" onClick={() => router.push(getUnionPath(slug, '/admin/assembly'))}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const statusActions = STATUS_ACTIONS[assembly.status] || [];
  const isEditable = ['DRAFT', 'NOTICE_SENT'].includes(assembly.status);
  const showQuorum = QUORUM_VISIBLE_STATUSES.includes(assembly.status);
  const showLiveDashboard = LIVE_DASHBOARD_STATUSES.includes(assembly.status);

  // 총회 진행 중에는 통합 라이브 대시보드 표시
  if (showLiveDashboard) {
    return (
      <div className="space-y-3">
        {/* 헤더 (뒤로가기) */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(getUnionPath(slug, '/admin/assembly'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <p className="text-sm text-gray-500">
            {ASSEMBLY_TYPE_LABELS[assembly.assembly_type]} | {new Date(assembly.scheduled_at).toLocaleDateString('ko-KR')}
          </p>
        </div>

        <AdminLiveDashboard assemblyId={assemblyId} assembly={assembly} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, '/admin/assembly'))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{assembly.title}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[assembly.status] || ''}`}>
              {ASSEMBLY_STATUS_LABELS[assembly.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {ASSEMBLY_TYPE_LABELS[assembly.assembly_type]} | {new Date(assembly.scheduled_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>

      {/* 상태 전이 버튼 */}
      {statusActions.length > 0 && (
        <div className="flex gap-3 p-4 bg-white rounded-lg border border-gray-200">
          <span className="text-sm text-gray-500 self-center mr-2">다음 단계:</span>
          {statusActions.map((action) => (
            <Button
              key={action.nextStatus}
              variant={action.variant}
              onClick={() => handleStatusTransition(action.nextStatus)}
              disabled={transitionMutation.isPending}
              size="sm"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* 컴플라이언스 배너 (준비 단계에서 표시) */}
      {isEditable && complianceCheckpoint && (
        <ComplianceBanner
          checkResult={complianceResult}
          isLoading={isComplianceLoading}
        />
      )}

      {/* 정족수 대시보드 (총회 진행 중/투표 중에만 표시) */}
      {showQuorum && <QuorumDashboard assemblyId={assemblyId} />}

      {/* 총회 정보 카드 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">총회 정보</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">일시</dt>
            <dd className="text-sm font-medium text-gray-900">
              {new Date(assembly.scheduled_at).toLocaleString('ko-KR')}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">장소</dt>
            <dd className="text-sm font-medium text-gray-900">{assembly.venue_address || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">영상 송출</dt>
            <dd className="text-sm font-medium text-gray-900">{assembly.stream_type || '미설정'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">법적 근거</dt>
            <dd className="text-sm font-medium text-gray-900">{assembly.legal_basis || '-'}</dd>
          </div>
          {assembly.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-gray-500">설명</dt>
              <dd className="text-sm font-medium text-gray-900">{assembly.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* 관리 메뉴 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/agendas`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">안건 관리</p>
            <p className="text-xs text-gray-500">안건 등록/수정/삭제</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/voting`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Vote className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">투표 관리</p>
            <p className="text-xs text-gray-500">투표 개폐/서면투표</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/attendees`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">출석/정족수</p>
            <p className="text-xs text-gray-500">출석 현황 조회</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/qr-codes`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">입장 QR 코드</p>
            <p className="text-xs text-gray-500">조합원 입장코드 생성/인쇄</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/checkin`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">QR 체크인</p>
            <p className="text-xs text-gray-500">현장 출석 체크인</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/onsite-ballot`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">현장투표 입력</p>
            <p className="text-xs text-gray-500">이중 승인 투표 처리</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/proxy`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">대리인 관리</p>
            <p className="text-xs text-gray-500">위임장 등록/해제</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/report`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">결과 보고서</p>
            <p className="text-xs text-gray-500">집계/의사록/증거패키지</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/documents`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">공식 문서</p>
            <p className="text-xs text-gray-500">문서 생성/서명/봉인</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/notifications`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">알림 관리</p>
            <p className="text-xs text-gray-500">발송 이력/추적</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/compliance`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">컴플라이언스</p>
            <p className="text-xs text-gray-500">법적 검증 상세</p>
          </div>
        </button>

        {isEditable && (
          <button
            onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/settings`))}
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
          >
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">총회 설정</p>
              <p className="text-xs text-gray-500">기본정보 수정</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
