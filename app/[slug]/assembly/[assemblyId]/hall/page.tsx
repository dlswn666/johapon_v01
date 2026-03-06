'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useCastVote, useMyVote } from '@/app/_lib/features/assembly/api/useVoteHook';
import {
  useAssemblyQuestions,
  useSubmitQuestion,
  useSpeakerRequests,
  useRequestToSpeak,
  useAssemblyDocuments,
  useLogDocumentView,
} from '@/app/_lib/features/assembly/api/useAssemblyHallHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import {
  ASSEMBLY_STATUS_LABELS,
  AGENDA_TYPE_LABELS,
  SPEAKER_REQUEST_STATUS_LABELS,
  Poll,
  PollOption,
  SpeakerRequestStatus,
} from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import {
  Monitor,
  FileText,
  MessageCircle,
  Hand,
  Vote,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  ExternalLink,
  Copy,
  Download,
} from 'lucide-react';

type TabId = 'agenda' | 'qa' | 'documents' | 'speaker';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'agenda', label: '투표', icon: <Vote className="w-4 h-4" aria-hidden="true" /> },
  { id: 'qa', label: 'Q&A', icon: <MessageCircle className="w-4 h-4" aria-hidden="true" /> },
  { id: 'documents', label: '자료', icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
  { id: 'speaker', label: '발언', icon: <Hand className="w-4 h-4" aria-hidden="true" /> },
];

/**
 * 총회장 페이지 (온라인 참여)
 * URL: /[slug]/assembly/[assemblyId]/hall
 *
 * 영상 송출 + 안건/투표 + Q&A + 자료열람 + 발언요청 통합
 */
export default function AssemblyHallPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { snapshot, assembly } = useVoteStore();

  const [activeTab, setActiveTab] = useState<TabId>('agenda');

  // 인증되지 않은 사용자 리다이렉트 (DEF-003: consent_agreed_at 체크 추가)
  useEffect(() => {
    if (isUnionLoading || isAuthLoading) return;
    if (!slug) return;
    if (!user || !snapshot?.identity_verified_at || !assembly) {
      router.push(getUnionPath(slug, `/assembly/${assemblyId}`));
      return;
    }
    if (snapshot && !((snapshot as Record<string, unknown>)?.consent_agreed_at)) {
      router.push(getUnionPath(slug, `/assembly/${assemblyId}`));
      return;
    }
  }, [isUnionLoading, isAuthLoading, user, snapshot, assembly, router, slug, assemblyId]);

  if (isUnionLoading || isAuthLoading || !snapshot || !assembly) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="aspect-video rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 truncate">{assembly.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
            <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
              {ASSEMBLY_STATUS_LABELS[assembly.status]}
            </span>
            <span>·</span>
            <span className="truncate max-w-[120px]">{snapshot.member_name}님</span>
            <span>·</span>
            <span>의결권 {snapshot.voting_weight}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* 영상 송출 영역 */}
        <StreamEmbed
          streamType={assembly.stream_type}
          zoomMeetingId={assembly.zoom_meeting_id}
          youtubeVideoId={assembly.youtube_video_id}
        />

        {/* 탭 네비게이션 */}
        <div role="tablist" className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 탭 내용 */}
        <div role="tabpanel" id={`panel-${activeTab}`}>
        {activeTab === 'agenda' && (
          <AgendaTab assemblyId={assemblyId} />
        )}
        {activeTab === 'qa' && (
          <QaTab assemblyId={assemblyId} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab assemblyId={assemblyId} />
        )}
        {activeTab === 'speaker' && (
          <SpeakerTab assemblyId={assemblyId} />
        )}
        </div>
      </div>
    </div>
  );
}

/**
 * 영상 송출 컴포넌트
 */
function StreamEmbed({
  streamType,
  zoomMeetingId,
  youtubeVideoId,
}: {
  streamType: string | null;
  zoomMeetingId: string | null;
  youtubeVideoId: string | null;
}) {
  const hasStream = streamType && streamType !== 'NONE';
  // YouTube 영상 ID 형식 검증 (11자 영숫자+하이픈+언더스코어)
  const isValidYoutubeId = youtubeVideoId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId);
  // Zoom 회의 ID 형식 검증 (9~11자리 숫자)
  const isValidZoomId = zoomMeetingId && /^\d{9,11}$/.test(zoomMeetingId);
  const showYoutube = (streamType === 'YOUTUBE' || streamType === 'BOTH') && isValidYoutubeId;
  const showZoom = (streamType === 'ZOOM' || streamType === 'BOTH') && isValidZoomId;

  if (!hasStream) return null;

  return (
    <div className="space-y-3">
      {showYoutube && (
        <div className="bg-black rounded-lg overflow-hidden aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
            title="총회 영상 송출"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {showZoom && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Zoom 화상회의</p>
              <p className="text-sm text-gray-500">회의 ID: {zoomMeetingId}</p>
            </div>
            <Button
              size="sm"
              onClick={() => window.open(`https://zoom.us/j/${zoomMeetingId}`, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              참여
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 안건/투표 탭
 */
function AgendaTab({ assemblyId }: { assemblyId: string }) {
  const { agendaItems, receiptTokens } = useVoteStore();

  if (agendaItems.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-600">등록된 안건이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {agendaItems.map((agenda) => {
        const poll = agenda.polls?.[0];
        return (
          <AgendaVoteCard
            key={agenda.id}
            assemblyId={assemblyId}
            agendaSeq={agenda.seq_order}
            agendaTitle={agenda.title}
            agendaType={agenda.agenda_type}
            agendaDescription={agenda.description}
            poll={poll}
            receiptToken={poll ? receiptTokens[poll.id] : undefined}
          />
        );
      })}
    </div>
  );
}

/**
 * 개별 안건 투표 카드
 */
function AgendaVoteCard({
  assemblyId,
  agendaSeq,
  agendaTitle,
  agendaType,
  agendaDescription,
  poll,
  receiptToken: storedReceipt,
}: {
  assemblyId: string;
  agendaSeq: number;
  agendaTitle: string;
  agendaType: string;
  agendaDescription: string | null;
  poll?: Poll & { poll_options?: PollOption[] };
  receiptToken?: string;
}) {
  const castVoteMutation = useCastVote();
  const { openConfirmModal, openAlertModal } = useModalStore();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const pollIdForQuery = poll?.status === 'OPEN' || poll?.status === 'CLOSED' ? poll?.id : undefined;
  const { data: myVote } = useMyVote(pollIdForQuery, assemblyId);

  const isOpen = poll?.status === 'OPEN';
  const isPollClosed = poll?.status === 'CLOSED';
  const isCancelled = poll?.status === 'CANCELLED';
  const hasVoted = !!myVote;
  const canRevise = myVote?.can_revise ?? false;
  const receiptToken = storedReceipt || myVote?.receipt_token;
  const sortedOptions = [...(poll?.poll_options || [])].sort((a, b) => a.seq_order - b.seq_order);

  const handleVote = (optionId: string) => {
    if (!poll) return;
    const option = sortedOptions.find((o) => o.id === optionId);
    const actionLabel = hasVoted ? '재투표' : '투표';

    openConfirmModal({
      title: `${actionLabel} 확인`,
      message: `"${option?.label}"(으)로 ${actionLabel}하시겠습니까?${hasVoted ? ' (기존 투표는 대체됩니다)' : ''}`,
      confirmText: actionLabel,
      cancelText: '취소',
      variant: 'default',
      onConfirm: () => {
        castVoteMutation.mutate(
          { pollId: poll.id, assemblyId, optionId },
          { onSuccess: () => setSelectedOptionId(null) },
        );
      },
    });
  };

  const copyReceipt = async () => {
    if (!receiptToken) return;
    try {
      await navigator.clipboard.writeText(receiptToken);
      openAlertModal({ title: '복사 완료', message: '투표 영수증이 클립보드에 복사되었습니다.', type: 'success' });
    } catch {
      openAlertModal({ title: '복사 실패', message: '클립보드 접근이 거부되었습니다.', type: 'error' });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-blue-600">제{agendaSeq}호</span>
          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
            {AGENDA_TYPE_LABELS[agendaType as keyof typeof AGENDA_TYPE_LABELS] || agendaType}
          </span>
          {isCancelled && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600">취소</span>}
          {isPollClosed && <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-500">마감</span>}
          {isOpen && <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">투표중</span>}
        </div>
        <h3 className="font-medium text-gray-900">{agendaTitle}</h3>
        {agendaDescription && <p className="text-sm text-gray-500 mt-1">{agendaDescription}</p>}
      </div>

      <div className="p-5">
        {!poll ? (
          <p className="text-sm text-gray-400 text-center">투표 세션이 없습니다</p>
        ) : isCancelled ? (
          <div className="flex items-center gap-2 justify-center text-gray-400">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            <p className="text-sm">이 안건의 투표가 취소되었습니다</p>
          </div>
        ) : !isOpen && !isPollClosed ? (
          <div className="flex items-center gap-2 justify-center text-gray-500">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <p className="text-sm">투표가 아직 시작되지 않았습니다</p>
          </div>
        ) : isOpen ? (
          <>
            {hasVoted && !canRevise && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-green-700 font-medium">투표 완료</p>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  투표 횟수: {myVote.vote_count}회
                  {myVote.last_voted_at && ` · ${new Date(myVote.last_voted_at).toLocaleString('ko-KR')}`}
                </p>
              </div>
            )}
            {hasVoted && canRevise && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-yellow-700 font-medium">재투표 가능</p>
                </div>
                <p className="text-xs text-yellow-600 mt-1">마감 전까지 투표를 변경할 수 있습니다.</p>
              </div>
            )}
            {(!hasVoted || canRevise) && (
              <div className="space-y-2" role="radiogroup" aria-label={`제${agendaSeq}호 안건 투표`}>
                {sortedOptions.map((option) => (
                  <button
                    key={option.id}
                    role="radio"
                    aria-checked={selectedOptionId === option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedOptionId(option.id);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      selectedOptionId === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedOptionId === option.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}
                      >
                        {selectedOptionId === option.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </div>
                    {option.description && <p className="text-xs text-gray-500 mt-1 ml-8">{option.description}</p>}
                  </button>
                ))}
                <Button
                  className="w-full mt-3"
                  disabled={!selectedOptionId || castVoteMutation.isPending}
                  onClick={() => selectedOptionId && handleVote(selectedOptionId)}
                >
                  <Vote className="w-4 h-4 mr-2" aria-hidden="true" />
                  {castVoteMutation.isPending ? '투표 처리 중...' : hasVoted ? '재투표' : '투표하기'}
                </Button>
              </div>
            )}
            {receiptToken && <ReceiptDisplay token={receiptToken} onCopy={copyReceipt} />}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">투표가 마감되었습니다</p>
            {receiptToken && <ReceiptDisplay token={receiptToken} onCopy={copyReceipt} />}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 투표 영수증 표시
 */
function ReceiptDisplay({ token, onCopy }: { token: string; onCopy: () => void }) {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 mb-1">투표 영수증 (투표 검증용)</p>
      <div className="flex items-center gap-2">
        <code className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
          {token}
        </code>
        <button
          onClick={onCopy}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
          title="영수증 복사"
          aria-label="투표 영수증 복사"
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">이 코드로 나중에 투표 내역을 확인하실 수 있습니다</p>
    </div>
  );
}

/**
 * Q&A 탭
 */
function QaTab({ assemblyId }: { assemblyId: string }) {
  const { assembly } = useVoteStore();
  const isLive = ['IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'].includes(assembly?.status || '');
  const { data: questions, isLoading } = useAssemblyQuestions(assemblyId, isLive);
  const submitMutation = useSubmitQuestion(assemblyId);
  const [questionText, setQuestionText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    submitMutation.mutate(
      { content: questionText.trim() },
      { onSuccess: () => setQuestionText('') },
    );
  };

  return (
    <div className="space-y-4">
      {/* 질문 작성 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4">
        <label htmlFor="qa-input" className="text-sm font-medium text-gray-700 mb-2 block">
          질문하기
        </label>
        <div className="flex gap-2">
          <textarea
            id="qa-input"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="의장에게 질문할 내용을 입력하세요..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            maxLength={1000}
          />
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={!questionText.trim() || submitMutation.isPending}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">{questionText.length}/1000자 · 관리자 승인 후 공개됩니다</p>
      </form>

      {/* 질문 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : !questions || questions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-gray-500">등록된 질문이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-900">{q.content}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{new Date(q.submitted_at).toLocaleString('ko-KR')}</span>
                {!q.is_approved && <span className="text-yellow-600">승인 대기</span>}
                {q.is_read_aloud && <span className="text-blue-600">낭독됨</span>}
              </div>
              {q.answer && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-blue-600 mb-1">답변</p>
                  <p className="text-sm text-gray-700">{q.answer}</p>
                  {q.answered_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(q.answered_at).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 자료 열람 탭
 */
function DocumentsTab({ assemblyId }: { assemblyId: string }) {
  const { data: documents, isLoading } = useAssemblyDocuments(assemblyId);
  const logViewMutation = useLogDocumentView(assemblyId);

  const handleViewDocument = (docId: string, fileUrl: string) => {
    // URL 유효성 + 신뢰 출처 검증
    try {
      const url = new URL(fileUrl);
      if (!url.hostname.endsWith('.supabase.co')) {
        console.warn('신뢰할 수 없는 문서 URL:', fileUrl);
        return;
      }
    } catch {
      console.warn('유효하지 않은 문서 URL:', fileUrl);
      return;
    }
    logViewMutation.mutate({ documentId: docId });
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-gray-500">등록된 자료가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
            <p className="text-xs text-gray-400">
              {doc.file_type && `${doc.file_type.toUpperCase()} · `}
              {formatFileSize(doc.file_size)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDocument(doc.id, doc.file_url)}
          >
            <Download className="w-4 h-4 mr-1" aria-hidden="true" />
            열람
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * 발언요청 탭
 */
function SpeakerTab({ assemblyId }: { assemblyId: string }) {
  const { assembly } = useVoteStore();
  const isLive = ['IN_PROGRESS', 'VOTING'].includes(assembly?.status || '');
  const { data: requests, isLoading } = useSpeakerRequests(assemblyId, isLive);
  const requestMutation = useRequestToSpeak(assemblyId);

  const hasPending = requests?.some((r) => r.status === 'PENDING');

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-gray-100 text-gray-400',
  };

  return (
    <div className="space-y-4">
      {/* 발언 요청 버튼 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <Hand className="w-8 h-8 text-blue-500 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-gray-600 mb-3">
          의장에게 발언 기회를 요청합니다. 승인 시 발언 순서를 안내해 드립니다.
        </p>
        <Button
          onClick={() => requestMutation.mutate({})}
          disabled={hasPending || requestMutation.isPending}
        >
          <Hand className="w-4 h-4 mr-2" aria-hidden="true" />
          {hasPending ? '발언 요청 대기 중' : requestMutation.isPending ? '요청 중...' : '발언 요청'}
        </Button>
      </div>

      {/* 내 요청 목록 */}
      {isLoading ? (
        <Skeleton className="h-20 rounded-lg" />
      ) : requests && requests.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">내 발언 요청</h3>
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[req.status] || ''}`}>
                {SPEAKER_REQUEST_STATUS_LABELS[req.status as SpeakerRequestStatus] || req.status}
              </span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">
                  {new Date(req.requested_at).toLocaleString('ko-KR')}
                </p>
              </div>
              {req.queue_position && (
                <span className="text-sm font-medium text-blue-600">
                  대기 {req.queue_position}번
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
