'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useExecuteTally, useAssemblyReport } from '@/app/_lib/features/assembly/api/useReportHook';
import { useGenerateMinutes, useMinutesDraft, useUpdateMinutes, useConfirmMinutes, useCreateMinutesCorrection } from '@/app/_lib/features/assembly/api/useMinutesHook';
import { useGenerateEvidencePackage, useEvidencePackage } from '@/app/_lib/features/assembly/api/useEvidenceHook';
import { usePublishResults, useResultPublication } from '@/app/_lib/features/assembly/api/useResultPublicationHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BarChart2, FileText, Package, CheckCircle, AlertCircle, Download, Printer, Globe } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useEffect } from 'react';

type TabType = 'tally' | 'minutes' | 'evidence';

export default function AssemblyReportPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('tally');
  const [minutesText, setMinutesText] = useState<string | null>(null);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const { openConfirmModal } = useModalStore();

  const { data: assembly, isLoading: isAssemblyLoading } = useAssembly(assemblyId);
  const { data: report, isLoading: isReportLoading, refetch: refetchReport } = useAssemblyReport(assemblyId);
  const { data: minutesData, isLoading: isMinutesLoading } = useMinutesDraft(assemblyId);
  const { data: evidenceData, isLoading: isEvidenceLoading } = useEvidencePackage(assemblyId);

  const executeTallyMutation = useExecuteTally(assemblyId);
  const generateMinutesMutation = useGenerateMinutes(assemblyId);
  const updateMinutesMutation = useUpdateMinutes(assemblyId);
  const confirmMinutesMutation = useConfirmMinutes(assemblyId);
  const generateEvidenceMutation = useGenerateEvidencePackage(assemblyId);
  const correctionMutation = useCreateMinutesCorrection(assemblyId);
  const publishResultsMutation = usePublishResults(assemblyId);
  const { data: publicationData } = useResultPublication(assemblyId);

  // P2-4: 의사록 정정 상태
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionContent, setCorrectionContent] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  const handleExecuteTally = () => {
    openConfirmModal({
      title: '투표 집계 실행',
      message: '투표를 집계하시겠습니까? 기존 집계 결과가 있으면 덮어씁니다.',
      confirmText: '집계 실행',
      cancelText: '취소',
      onConfirm: async () => {
        await executeTallyMutation.mutateAsync();
        refetchReport();
      },
    });
  };

  const canPublishResults = ['VOTING_CLOSED', 'CLOSED', 'ARCHIVED'].includes(assembly?.status || '');
  const isAlreadyPublished = !!publicationData;

  const handlePublishResults = () => {
    openConfirmModal({
      title: '투표 결과 공개',
      message: '투표 결과를 조합원에게 공개하시겠습니까? 공개 후에는 취소할 수 없습니다.',
      confirmText: '공개',
      cancelText: '취소',
      onConfirm: () => publishResultsMutation.mutate(),
    });
  };

  const handleGenerateMinutes = () => {
    openConfirmModal({
      title: '의사록 자동 생성',
      message: '집계 결과와 Q&A 기록을 바탕으로 의사록 초안을 자동 생성합니다. 기존 초안이 있으면 덮어씁니다.',
      confirmText: '생성',
      cancelText: '취소',
      onConfirm: () => generateMinutesMutation.mutate(),
    });
  };

  const handleSaveMinutes = () => {
    if (minutesText === null) return;
    updateMinutesMutation.mutate(minutesText, {
      onSuccess: () => {
        setIsEditingMinutes(false);
        setMinutesText(null);
      },
    });
  };

  const handleConfirmMinutes = (role: 'chair' | 'member') => {
    openConfirmModal({
      title: '의사록 확인 서명',
      message: role === 'chair'
        ? '의장으로서 의사록 내용을 확인하고 서명하시겠습니까?'
        : '출석 조합원으로서 의사록 내용을 확인하고 서명하시겠습니까?',
      confirmText: '서명',
      cancelText: '취소',
      onConfirm: () => confirmMinutesMutation.mutate(role),
    });
  };

  const handleStartEdit = () => {
    if ((minutesData?.minutes_confirmed_by || []).length > 0) {
      openConfirmModal({
        title: '주의: 서명 초기화',
        message: '의사록을 수정하면 기존 서명이 모두 초기화됩니다. 계속하시겠습니까?',
        confirmText: '수정',
        cancelText: '취소',
        onConfirm: () => {
          setMinutesText(minutesData!.minutes_draft);
          setIsEditingMinutes(true);
        },
      });
    } else {
      setMinutesText(minutesData!.minutes_draft);
      setIsEditingMinutes(true);
    }
  };

  const handleGenerateEvidence = () => {
    openConfirmModal({
      title: '증거 패키지 생성',
      message: '총회 전체 데이터(스냅샷, 출석, 투표, Q&A, 감사로그)를 패키징합니다. 시간이 소요될 수 있습니다.',
      confirmText: '생성',
      cancelText: '취소',
      onConfirm: () => generateEvidenceMutation.mutate(),
    });
  };

  const isLoading = isUnionLoading || isAuthLoading || isAssemblyLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'tally', label: '투표 집계', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'minutes', label: '의사록', icon: <FileText className="w-4 h-4" /> },
    { id: 'evidence', label: '증거 패키지', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">결과 보고서 및 의사록</h1>
          {assembly && (
            <p className="text-sm text-gray-500 mt-0.5">{assembly.title}</p>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      {activeTab === 'tally' && (
        <div className="space-y-6">
          {/* 집계 실행 영역 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">투표 집계</h2>
                <p className="text-sm text-gray-500">투표가 마감된 후 집계를 실행하세요.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="no-print"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  인쇄/PDF
                </Button>
                <Button
                  onClick={handleExecuteTally}
                  disabled={executeTallyMutation.isPending}
                >
                  {executeTallyMutation.isPending ? '집계 중...' : '집계 실행'}
                </Button>
              </div>
            </div>
          </div>

          {/* 결과 공개 영역 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">결과 공개</h2>
                <p className="text-sm text-gray-500">
                  {isAlreadyPublished
                    ? '투표 결과가 조합원에게 공개되었습니다.'
                    : '집계 완료 후 조합원에게 투표 결과를 공개할 수 있습니다.'}
                </p>
              </div>
              {isAlreadyPublished ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  공개 완료
                </span>
              ) : (
                <Button
                  onClick={handlePublishResults}
                  disabled={!canPublishResults || publishResultsMutation.isPending || !report}
                  variant="default"
                >
                  <Globe className="w-4 h-4 mr-1.5" />
                  {publishResultsMutation.isPending ? '공개 중...' : '결과 공개'}
                </Button>
              )}
            </div>
            {!canPublishResults && !isAlreadyPublished && (
              <p className="text-xs text-amber-600 mt-2">
                투표 마감(VOTING_CLOSED) 이후에만 결과를 공개할 수 있습니다.
              </p>
            )}
            {isAlreadyPublished && publicationData?.published_at && (
              <p className="text-xs text-gray-400 mt-2">
                공개 일시: {new Date(publicationData.published_at).toLocaleString('ko-KR')}
              </p>
            )}
          </div>

          {/* 보고서 요약 */}
          {isReportLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : report ? (
            <div className="space-y-4">
              {/* 출석 현황 */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">출석 현황</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{report.attendance.onsite}</p>
                    <p className="text-xs text-gray-500 mt-1">현장</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{report.attendance.online}</p>
                    <p className="text-xs text-gray-500 mt-1">온라인</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{report.attendance.written_proxy}</p>
                    <p className="text-xs text-gray-500 mt-1">서면/위임</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${report.attendance.quorum_met ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className={`text-2xl font-bold ${report.attendance.quorum_met ? 'text-green-700' : 'text-red-700'}`}>
                      {report.attendance.total}
                    </p>
                    <p className={`text-xs mt-1 ${report.attendance.quorum_met ? 'text-green-600' : 'text-red-600'}`}>
                      합계{report.attendance.quorum_total_members > 0 && `/${report.attendance.quorum_total_members}`}
                      {report.attendance.quorum_met !== null && (
                        <span className="ml-1">{report.attendance.quorum_met ? '(정족수 충족)' : '(정족수 미달)'}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 안건별 결과 */}
              {report.agendas.map((agenda) => (
                <div key={agenda.id} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                      제{agenda.seq_order}호
                    </span>
                    <h3 className="text-base font-semibold text-gray-900">{agenda.title}</h3>
                    <span className="text-xs text-gray-400">({agenda.type_label})</span>
                  </div>

                  {agenda.polls.length === 0 ? (
                    <p className="text-sm text-gray-400">집계 결과 없음 (집계를 먼저 실행하세요)</p>
                  ) : (
                    agenda.polls.map((poll) => (
                      <div key={poll.poll_id}>
                        {poll.options.length === 0 ? (
                          <p className="text-sm text-gray-400">투표 없음</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="text-left py-2 pr-4 font-medium text-gray-600">선택지</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-600">전자</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-600">현장</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-600">서면</th>
                                  <th className="text-right py-2 px-3 font-medium text-gray-600">위임</th>
                                  <th className="text-right py-2 pl-3 font-medium text-gray-600">합계</th>
                                </tr>
                              </thead>
                              <tbody>
                                {poll.options.map((opt, idx) => {
                                  const pct = poll.total_votes > 0
                                    ? ((opt.total_count / poll.total_votes) * 100).toFixed(1)
                                    : '0.0';
                                  return (
                                    <tr key={idx} className="border-b border-gray-50">
                                      <td className="py-2 pr-4 font-medium">{opt.label}</td>
                                      <td className="text-right py-2 px-3 text-gray-600">{opt.electronic_count}</td>
                                      <td className="text-right py-2 px-3 text-gray-600">{opt.onsite_count}</td>
                                      <td className="text-right py-2 px-3 text-gray-600">{opt.written_count}</td>
                                      <td className="text-right py-2 px-3 text-gray-600">{opt.proxy_count}</td>
                                      <td className="text-right py-2 pl-3 font-semibold">
                                        {opt.total_count} ({pct}%)
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr>
                                  <td className="py-2 pr-4 text-gray-500 text-xs">합계</td>
                                  <td colSpan={4} />
                                  <td className="text-right py-2 pl-3 font-bold">{poll.total_votes}표</td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="mt-3 flex items-center gap-2">
                              {poll.approved ? (
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  가결
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  부결
                                </span>
                              )}
                              {poll.quorum_met !== null && (
                                <span className={`text-xs ${poll.quorum_met ? 'text-green-600' : 'text-red-600'}`}>
                                  {poll.quorum_met ? '정족수 충족' : '정족수 미달'}
                                </span>
                              )}
                              {poll.tallied_at && (
                                <span className="text-xs text-gray-400 ml-auto">
                                  집계: {new Date(poll.tallied_at).toLocaleString('ko-KR')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400">
              집계 결과가 없습니다. 집계를 먼저 실행하세요.
            </div>
          )}
        </div>
      )}

      {activeTab === 'minutes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">의사록</h2>
                {minutesData?.minutes_finalized_at && (
                  <p className="text-xs text-green-600 mt-0.5">
                    확정일시: {new Date(minutesData.minutes_finalized_at).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!minutesData?.minutes_finalized_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateMinutes}
                    disabled={generateMinutesMutation.isPending}
                  >
                    {generateMinutesMutation.isPending ? '생성 중...' : '자동 생성'}
                  </Button>
                )}
                {minutesData?.minutes_draft && !minutesData.minutes_finalized_at && (
                  <>
                    {isEditingMinutes ? (
                      <>
                        <Button size="sm" onClick={handleSaveMinutes} disabled={updateMinutesMutation.isPending}>
                          {updateMinutesMutation.isPending ? '저장 중...' : '저장'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setIsEditingMinutes(false);
                          setMinutesText(null);
                        }}>
                          취소
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={handleStartEdit}>
                        수정
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {isMinutesLoading ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : minutesData?.minutes_draft ? (
            <div className="bg-white rounded-lg border border-gray-200">
              {isEditingMinutes ? (
                <textarea
                  className="w-full h-[600px] p-5 font-mono text-sm resize-none rounded-lg border-0 outline-none"
                  value={minutesText ?? ''}
                  onChange={(e) => setMinutesText(e.target.value)}
                  disabled={!!minutesData?.minutes_finalized_at}
                />
              ) : (
                <pre className="p-5 text-sm whitespace-pre-wrap font-mono leading-relaxed min-h-[300px]">
                  {minutesData.minutes_draft}
                </pre>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400">
              의사록 초안이 없습니다. &quot;자동 생성&quot; 버튼을 눌러 생성하세요.
            </div>
          )}

          {/* 서명 섹션 */}
          {minutesData?.minutes_draft && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                의사록 확인 서명
                {minutesData.minutes_finalized_at && (
                  <span className="ml-2 text-sm font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded">확정됨</span>
                )}
              </h3>

              {/* 서명 진행 상태 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>서명 진행: {(minutesData.minutes_confirmed_by || []).length}/3</span>
                  {(minutesData.minutes_confirmed_by || []).length >= 3 && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((minutesData.minutes_confirmed_by || []).length / 3) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 서명자 목록 */}
              {(minutesData.minutes_confirmed_by || []).length > 0 && (
                <div className="mb-4 space-y-2">
                  {(minutesData.minutes_confirmed_by || []).map((signer, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="font-medium">{signer.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {signer.role === 'chair' ? '의장' : '조합원'}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(signer.confirmed_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 서명 버튼 (확정 전에만 표시) */}
              {!minutesData.minutes_finalized_at && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConfirmMinutes('chair')}
                    disabled={confirmMinutesMutation.isPending}
                  >
                    {confirmMinutesMutation.isPending ? '서명 중...' : '의장 서명'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConfirmMinutes('member')}
                    disabled={confirmMinutesMutation.isPending}
                  >
                    {confirmMinutesMutation.isPending ? '서명 중...' : '조합원 서명'}
                  </Button>
                </div>
              )}

              {/* 해시값 표시 (확정된 경우) */}
              {minutesData.minutes_finalized_at && minutesData.minutes_content_hash && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500">문서 해시 (SHA-256)</p>
                  <p className="text-xs font-mono text-gray-600 mt-1 break-all">{minutesData.minutes_content_hash}</p>
                </div>
              )}

              {/* P2-4: 정정안 작성 버튼 (확정된 의사록에만 표시) */}
              {minutesData.minutes_finalized_at && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCorrectionContent(minutesData.minutes_draft || '');
                      setCorrectionReason('');
                      setShowCorrectionModal(true);
                    }}
                    className="no-print"
                  >
                    정정안 작성
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">증거 패키지</h2>
                <p className="text-sm text-gray-500">총회 전체 데이터를 패키징합니다 (스냅샷, 출석, 투표, Q&A, 감사로그 포함)</p>
              </div>
              <Button
                onClick={handleGenerateEvidence}
                disabled={generateEvidenceMutation.isPending}
              >
                {generateEvidenceMutation.isPending ? '생성 중...' : '패키지 생성'}
              </Button>
            </div>

            {isEvidenceLoading ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : evidenceData?.evidence_packaged_at ? (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">증거 패키지 생성 완료</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      생성 일시: {new Date(evidenceData.evidence_packaged_at).toLocaleString('ko-KR')}
                    </p>
                    {evidenceData.evidence_package_url && (
                      <a
                        href={evidenceData.evidence_package_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-sm text-green-700 font-medium hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        다운로드
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
                아직 증거 패키지가 생성되지 않았습니다.
              </div>
            )}
          </div>

          {/* 패키지 포함 항목 안내 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">패키지 포함 항목</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                총회 기본 정보 (일시, 장소, 유형)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                조합원 스냅샷 목록 (소집공고 시점 기준)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                출석/체크인 기록
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                안건별 투표 집계 결과
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                질의응답 기록
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                발언 요청 기록
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                자료 열람 기록
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                감사 로그 (WORM 해시 체인 무결성 검증 포함)
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* P2-4: 의사록 정정 모달 */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">의사록 정정안 작성</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              확정된 의사록에 정정안을 추가합니다. 원본 의사록은 감사 로그에 보존됩니다.
              서명이 초기화되며 3인 재서명이 필요합니다.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">정정 사유 (필수)</label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="정정 사유를 입력하세요"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">정정 내용</label>
              <textarea
                value={correctionContent}
                onChange={(e) => setCorrectionContent(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm h-[300px] resize-none font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCorrectionModal(false)}>취소</Button>
              <Button
                size="sm"
                disabled={!correctionReason.trim() || !correctionContent.trim() || correctionMutation.isPending}
                onClick={() => {
                  correctionMutation.mutate(
                    { correctionReason: correctionReason.trim(), correctedContent: correctionContent },
                    { onSuccess: () => setShowCorrectionModal(false) }
                  );
                }}
              >
                {correctionMutation.isPending ? '처리 중...' : '정정안 생성'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
