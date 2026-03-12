'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useAgendaItems } from '@/app/_lib/features/assembly/api/useAgendaHook';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';
import {
  useOnsiteBallotList,
  useCreateOnsiteBallot,
  useVerifyOnsiteBallot,
  useUploadBallotScan,
  useDisputeOnsiteBallot,
  useResolveOnsiteBallotDispute,
  OnsiteBallotInput,
} from '@/app/_lib/features/assembly/api/useOnsiteBallotHook';
import { AssemblyMemberSnapshot, PollOption, Poll, WrittenBallotStatus } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Clock, Search, AlertTriangle, Paperclip } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { supabase } from '@/app/_lib/shared/supabase/client';

const STATUS_LABELS: Record<WrittenBallotStatus, string> = {
  PENDING_VERIFICATION: '검증 대기',
  VERIFIED: '검증 완료',
  DISPUTED: '이의 제기',
  CANCELLED: '취소',
};

const STATUS_COLORS: Record<WrittenBallotStatus, string> = {
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
  VERIFIED: 'bg-green-100 text-green-700',
  DISPUTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function OnsiteBallotPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, union, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly } = useAssembly(assemblyId);
  const { data: agendaItems } = useAgendaItems(assemblyId);
  const { data: ballotList, isLoading: isBallotLoading } = useOnsiteBallotList(assemblyId);
  const createMutation = useCreateOnsiteBallot(assemblyId);
  const verifyMutation = useVerifyOnsiteBallot(assemblyId);
  const uploadScanMutation = useUploadBallotScan(assemblyId);
  const disputeMutation = useDisputeOnsiteBallot(assemblyId);
  const resolveMutation = useResolveOnsiteBallotDispute(assemblyId);

  // 입력 폼 상태
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<AssemblyMemberSnapshot[]>([]);
  const [selectedMember, setSelectedMember] = useState<AssemblyMemberSnapshot | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAgendaId, setSelectedAgendaId] = useState('');
  const [polls, setPolls] = useState<(Poll & { poll_options?: PollOption[] })[]>([]);
  const [selectedPollId, setSelectedPollId] = useState('');
  const [selectedChoiceId, setSelectedChoiceId] = useState('');
  const [activeTab, setActiveTab] = useState<'input' | 'pending' | 'disputed' | 'verified'>('input');
  // P0-1: 스캔 파일 상태
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const scanFileRef = React.useRef<HTMLInputElement>(null);
  // P2-1: 이의 제기 모달 상태
  const [disputeTarget, setDisputeTarget] = useState<OnsiteBallotInput | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [resolveTarget, setResolveTarget] = useState<OnsiteBallotInput | null>(null);
  const [resolvedChoiceId, setResolvedChoiceId] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  // 안건 선택 시 투표 목록 로드
  useEffect(() => {
    if (!selectedAgendaId || !union?.id) return;
    const fetchPolls = async () => {
      const { data } = await supabase
        .from('polls')
        .select('*, poll_options(*)')
        .eq('agenda_item_id', selectedAgendaId)
        .eq('assembly_id', assemblyId)
        .eq('union_id', union.id)
        .eq('status', 'OPEN');
      setPolls(data || []);
      setSelectedPollId('');
      setSelectedChoiceId('');
    };
    fetchPolls();
  }, [selectedAgendaId, assemblyId, union?.id]);

  const handleMemberSearch = async () => {
    if (!memberSearch.trim() || !union?.id) return;
    setIsSearching(true);
    try {
      const { data } = await supabase
        .from('assembly_member_snapshots')
        .select('*')
        .eq('assembly_id', assemblyId)
        .eq('union_id', union.id)
        .eq('is_active', true)
        .or(`member_name.ilike.%${escapeLikeWildcards(memberSearch.trim())}%,member_phone.ilike.%${escapeLikeWildcards(memberSearch.trim())}%`)
        .limit(10);
      setMemberResults(data || []);
    } catch {
      setMemberResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) { alert('JPG, PNG, PDF 파일만 가능합니다.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('최대 10MB입니다.'); return; }
    setScanFile(file);
    if (file.type !== 'application/pdf') {
      setScanPreviewUrl(URL.createObjectURL(file));
    } else {
      setScanPreviewUrl(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedMember || !selectedPollId || !selectedChoiceId) return;
    createMutation.mutate(
      { pollId: selectedPollId, memberId: selectedMember.user_id, inputChoiceId: selectedChoiceId },
      {
        onSuccess: (data) => {
          // P0-1: 스캔 파일이 있으면 업로드
          if (scanFile && data?.id) {
            uploadScanMutation.mutate({ ballotInputId: data.id, file: scanFile });
          }
          setSelectedMember(null);
          setMemberSearch('');
          setMemberResults([]);
          setSelectedAgendaId('');
          setPolls([]);
          setSelectedPollId('');
          setSelectedChoiceId('');
          setScanFile(null);
          setScanPreviewUrl(null);
        },
      }
    );
  };

  const handleVerify = (ballotId: string) => {
    verifyMutation.mutate({ ballotInputId: ballotId });
  };

  const selectedPoll = polls.find((p) => p.id === selectedPollId);

  const pendingList = (ballotList || []).filter((b) => b.status === 'PENDING_VERIFICATION');
  const disputedList = (ballotList || []).filter((b) => b.status === 'DISPUTED');
  const verifiedList = (ballotList || []).filter((b) => b.status === 'VERIFIED');

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

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
          <h1 className="text-2xl font-bold text-gray-900">현장투표 입력</h1>
          <p className="text-sm text-gray-500">{assembly?.title}</p>
        </div>
      </div>

      {/* 이중 승인 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <strong>이중 승인 필수:</strong> 투표 입력자와 검증자는 반드시 다른 관리자여야 합니다.
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'input', label: '투표 입력' },
          { key: 'pending', label: `검증 대기 (${pendingList.length})` },
          { key: 'disputed', label: `이의 제기 (${disputedList.length})` },
          { key: 'verified', label: `완료 (${verifiedList.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 투표 입력 탭 */}
      {activeTab === 'input' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">현장투표 입력</h2>

          {/* 1. 조합원 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">1. 조합원 선택</label>
            {selectedMember ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">{selectedMember.member_name}</p>
                  <p className="text-xs text-blue-700">{selectedMember.member_phone || '전화번호 없음'}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setSelectedMember(null); setMemberResults([]); }}>
                  변경
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMemberSearch()}
                    placeholder="이름 또는 전화번호"
                  />
                  <Button onClick={handleMemberSearch} disabled={isSearching}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                {memberResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {memberResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedMember(m); setMemberResults([]); }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900">{m.member_name}</p>
                        <p className="text-xs text-gray-500">{m.member_phone || '전화번호 없음'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. 안건 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">2. 안건 선택</label>
            <select
              value={selectedAgendaId}
              onChange={(e) => setSelectedAgendaId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedMember}
            >
              <option value="">안건을 선택하세요</option>
              {(agendaItems || []).map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          {/* 3. 투표 선택 */}
          {polls.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">3. 투표 선택</label>
              <select
                value={selectedPollId}
                onChange={(e) => { setSelectedPollId(e.target.value); setSelectedChoiceId(''); }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">투표를 선택하세요</option>
                {polls.map((p) => (
                  <option key={p.id} value={p.id}>
                    투표 (마감: {new Date(p.closes_at).toLocaleString('ko-KR')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedAgendaId && polls.length === 0 && (
            <p className="text-sm text-amber-600">현재 진행 중인 투표가 없습니다.</p>
          )}

          {/* 4. 선택지 선택 */}
          {selectedPoll && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">4. 투표 선택지</label>
              <div className="grid grid-cols-2 gap-2">
                {(selectedPoll.poll_options || []).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedChoiceId(opt.id)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      selectedChoiceId === opt.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. 서면결의서 스캔 (P0-1, 선택) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">5. 서면결의서 스캔 (선택)</label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => scanFileRef.current?.click()} disabled={!selectedMember}>
                파일 선택
              </Button>
              <input ref={scanFileRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleScanFileChange} className="hidden" />
              {scanFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Paperclip className="w-4 h-4" />
                  <span>{scanFile.name}</span>
                  <button onClick={() => { setScanFile(null); setScanPreviewUrl(null); }} className="text-gray-400 hover:text-red-500">
                    <span className="text-xs">[삭제]</span>
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">JPG, PNG, PDF / 최대 10MB</p>
            {scanPreviewUrl && (
              <img src={scanPreviewUrl} alt="스캔 미리보기" className="max-w-[200px] max-h-[280px] rounded border" />
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedMember || !selectedPollId || !selectedChoiceId || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? '처리 중...' : '현장투표 입력 (검증 대기 상태로 저장)'}
          </Button>
        </div>
      )}

      {/* 검증 대기 탭 */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">검증 대기 목록</h2>
            <p className="text-xs text-gray-500 mt-0.5">입력자와 다른 관리자만 검증할 수 있습니다</p>
          </div>
          {isBallotLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
            </div>
          ) : pendingList.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {pendingList.map((ballot) => (
                <BallotListItem
                  key={ballot.id}
                  ballot={ballot}
                  onVerify={() => handleVerify(ballot.id)}
                  isVerifying={verifyMutation.isPending}
                  showVerifyButton
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">검증 대기 중인 투표가 없습니다</p>
            </div>
          )}
        </div>
      )}

      {/* 이의 제기 탭 (P2-1) */}
      {activeTab === 'disputed' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">이의 제기 목록</h2>
            <p className="text-xs text-gray-500 mt-0.5">이의를 검토하고 해결 처리하세요</p>
          </div>
          {isBallotLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
            </div>
          ) : disputedList.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {disputedList.map((ballot) => (
                <div key={ballot.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[ballot.status]}`}>
                      {STATUS_LABELS[ballot.status]}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(ballot.input_at).toLocaleString('ko-KR')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 truncate">
                    조합원: {ballot.member_id} | 선택: {ballot.input_choice_id}
                  </p>
                  {ballot.dispute_note && (
                    <p className="text-xs text-red-600 mt-1">사유: {ballot.dispute_note}</p>
                  )}
                  <div className="mt-2">
                    <Button
                      size="sm"
                      onClick={() => { setResolveTarget(ballot); setResolvedChoiceId(''); }}
                    >
                      해결 처리
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">이의 제기된 투표가 없습니다</p>
            </div>
          )}
        </div>
      )}

      {/* 완료 탭 */}
      {activeTab === 'verified' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">검증 완료 목록</h2>
          </div>
          {isBallotLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
            </div>
          ) : verifiedList.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {verifiedList.map((ballot) => (
                <BallotListItem
                  key={ballot.id}
                  ballot={ballot}
                  onDispute={() => { setDisputeTarget(ballot); setDisputeNote(''); }}
                  showDisputeButton
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">검증 완료된 투표가 없습니다</p>
            </div>
          )}
        </div>
      )}

      {/* 이의 제기 모달 (P2-1) */}
      {disputeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">이의 제기</h3>
            <p className="text-sm text-gray-600">조합원: {disputeTarget.member_id}</p>
            <textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="이의 제기 사유를 입력하세요 (필수)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDisputeTarget(null)}>취소</Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!disputeNote.trim() || disputeMutation.isPending}
                onClick={() => {
                  disputeMutation.mutate(
                    { ballotInputId: disputeTarget.id, disputeNote: disputeNote.trim() },
                    { onSuccess: () => setDisputeTarget(null) }
                  );
                }}
              >
                {disputeMutation.isPending ? '처리 중...' : '이의 제기 확인'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 이의 해결 모달 (P2-1) */}
      {resolveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">이의 해결</h3>
            <p className="text-sm text-gray-600">조합원: {resolveTarget.member_id}</p>
            {resolveTarget.dispute_note && (
              <p className="text-sm text-red-600">사유: {resolveTarget.dispute_note}</p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">해결 결과 선택:</label>
              <Input
                value={resolvedChoiceId}
                onChange={(e) => setResolvedChoiceId(e.target.value)}
                placeholder="선택지 ID (기존 유지 또는 변경)"
              />
              <p className="text-xs text-gray-400">기존 선택: {resolveTarget.input_choice_id}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setResolveTarget(null)}>취소</Button>
              <Button
                size="sm"
                disabled={!resolvedChoiceId.trim() || resolveMutation.isPending}
                onClick={() => {
                  resolveMutation.mutate(
                    { ballotInputId: resolveTarget.id, resolvedChoiceId: resolvedChoiceId.trim() },
                    { onSuccess: () => setResolveTarget(null) }
                  );
                }}
              >
                {resolveMutation.isPending ? '처리 중...' : '해결 확인'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BallotListItem({
  ballot,
  onVerify,
  isVerifying,
  showVerifyButton,
  onDispute,
  showDisputeButton,
}: {
  ballot: OnsiteBallotInput;
  onVerify?: () => void;
  isVerifying?: boolean;
  showVerifyButton?: boolean;
  onDispute?: () => void;
  showDisputeButton?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[ballot.status]}`}>
            {STATUS_LABELS[ballot.status]}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(ballot.input_at).toLocaleString('ko-KR')}
          </span>
          {ballot.scan_image_url && (
            <a
              href={ballot.scan_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Paperclip className="w-3 h-3" />
              스캔
            </a>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 truncate">
          조합원: {ballot.member_id} | 선택: {ballot.input_choice_id}
        </p>
        <p className="text-xs text-gray-400">투표 ID: {ballot.poll_id}</p>
      </div>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        {showVerifyButton && onVerify && (
          <Button
            size="sm"
            onClick={onVerify}
            disabled={isVerifying}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            검증
          </Button>
        )}
        {showDisputeButton && onDispute && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDispute}
          >
            이의 제기
          </Button>
        )}
      </div>
    </div>
  );
}
