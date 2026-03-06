'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useAttendanceList, useRecordAttendance } from '@/app/_lib/features/assembly/api/useAttendanceHook';
import { AssemblyMemberSnapshot } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, QrCode, Search, UserCheck, UserX } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';
import dynamic from 'next/dynamic';

// html5-qrcode는 SSR에서 동작하지 않으므로 dynamic import
const QrScanner = dynamic(() => import('@/app/_lib/features/assembly/ui/QrScanner'), { ssr: false });

interface ScannedMember {
  snapshot: AssemblyMemberSnapshot;
  isCheckedIn: boolean;
  qrData?: unknown;
}

export default function CheckinPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, union, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly } = useAssembly(assemblyId);
  const { data: attendanceLogs, isLoading: isAttendanceLoading } = useAttendanceList(assemblyId);
  const recordMutation = useRecordAttendance(assemblyId);

  const [mode, setMode] = useState<'qr' | 'search'>('qr');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssemblyMemberSnapshot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scannedMember, setScannedMember] = useState<ScannedMember | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  // 조합원 검색 (이름/전화번호)
  const handleSearch = async () => {
    if (!searchQuery.trim() || !union?.id) return;
    setIsSearching(true);
    try {
      const query = escapeLikeWildcards(searchQuery.trim());
      const { data } = await supabase
        .from('assembly_member_snapshots')
        .select('*')
        .eq('assembly_id', assemblyId)
        .eq('union_id', union.id)
        .eq('is_active', true)
        .or(`member_name.ilike.%${query}%,member_phone.ilike.%${query}%`)
        .limit(10);
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // QR 스캔 결과 처리
  const handleQrScan = async (qrData: string) => {
    setScanError(null);
    try {
      const parsed = JSON.parse(qrData);
      if (parsed.assemblyId !== assemblyId) {
        setScanError('다른 총회의 QR 코드입니다.');
        return;
      }
      // 5분 만료 확인
      const ageMs = Date.now() - (parsed.timestamp || 0);
      if (ageMs > 5 * 60 * 1000) {
        setScanError('QR 코드가 만료되었습니다. 새로 발급 받으세요.');
        return;
      }
      // 스냅샷 조회
      if (!union?.id) return;
      const { data: snapshot } = await supabase
        .from('assembly_member_snapshots')
        .select('*')
        .eq('id', parsed.snapshotId)
        .eq('assembly_id', assemblyId)
        .eq('union_id', union.id)
        .eq('is_active', true)
        .single();

      if (!snapshot) {
        setScanError('유효하지 않은 QR 코드입니다.');
        return;
      }

      const isCheckedIn = (attendanceLogs || []).some(
        (log) => log.snapshot_id === snapshot.id && !log.exit_at
      );
      setScannedMember({ snapshot, isCheckedIn, qrData: parsed });
    } catch {
      setScanError('QR 코드를 읽을 수 없습니다.');
    }
  };

  const handleCheckin = (snapshot: AssemblyMemberSnapshot, qrData?: unknown) => {
    recordMutation.mutate(
      { snapshotId: snapshot.id, attendanceType: 'ONSITE', action: 'checkin', qrData },
      { onSuccess: () => setScannedMember(null) }
    );
  };

  const handleCheckout = (snapshot: AssemblyMemberSnapshot) => {
    recordMutation.mutate(
      { snapshotId: snapshot.id, attendanceType: 'ONSITE', action: 'checkout' },
      { onSuccess: () => setScannedMember(null) }
    );
  };

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const recentLogs = (attendanceLogs || []).slice(0, 10);

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
          <h1 className="text-2xl font-bold text-gray-900">QR 체크인</h1>
          <p className="text-sm text-gray-500">{assembly?.title}</p>
        </div>
      </div>

      {/* 모드 전환 탭 */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode('qr')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'qr' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          QR 스캔
        </button>
        <button
          onClick={() => setMode('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'search' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search className="w-4 h-4" />
          직접 검색
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 스캔/검색 영역 */}
        <div className="space-y-4">
          {mode === 'qr' ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-3">QR 코드 스캔</h2>
              {scanError && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {scanError}
                </div>
              )}
              <QrScanner onScan={handleQrScan} onError={(e) => setScanError(e)} />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <h2 className="text-base font-semibold text-gray-900">조합원 검색</h2>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="이름 또는 전화번호 입력"
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((snapshot) => {
                    const isCheckedIn = (attendanceLogs || []).some(
                      (log) => log.snapshot_id === snapshot.id && !log.exit_at
                    );
                    return (
                      <div
                        key={snapshot.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{snapshot.member_name}</p>
                          <p className="text-xs text-gray-500">{snapshot.member_phone || '전화번호 없음'}</p>
                        </div>
                        <div className="flex gap-2">
                          {isCheckedIn ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckout(snapshot)}
                              disabled={recordMutation.isPending}
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              퇴장
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleCheckin(snapshot)}
                              disabled={recordMutation.isPending}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              입장
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {isSearching && <p className="text-sm text-gray-500 text-center">검색 중...</p>}
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center">검색 결과가 없습니다</p>
              )}
            </div>
          )}

          {/* QR 스캔 후 조합원 확인 */}
          {scannedMember && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">조합원 확인</h3>
              <div className="space-y-1 mb-4">
                <p className="text-gray-900 font-medium">{scannedMember.snapshot.member_name}</p>
                <p className="text-sm text-gray-600">{scannedMember.snapshot.member_phone || '전화번호 없음'}</p>
                <p className="text-sm text-gray-600">{scannedMember.snapshot.property_address || ''}</p>
                <p className="text-xs text-gray-500">투표 가중치: {scannedMember.snapshot.voting_weight}</p>
              </div>
              <div className="flex gap-2">
                {scannedMember.isCheckedIn ? (
                  <Button
                    variant="outline"
                    onClick={() => handleCheckout(scannedMember.snapshot)}
                    disabled={recordMutation.isPending}
                    className="flex-1"
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    퇴장 처리
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckin(scannedMember.snapshot, scannedMember.qrData)}
                    disabled={recordMutation.isPending}
                    className="flex-1"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    입장 처리
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setScannedMember(null)}>취소</Button>
              </div>
            </div>
          )}
        </div>

        {/* 최근 체크인 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            최근 체크인 {attendanceLogs ? `(총 ${attendanceLogs.length}명)` : ''}
          </h2>
          {isAttendanceLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded" />)}
            </div>
          ) : recentLogs.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.snapshot_id}</p>
                    <p className="text-xs text-gray-500">
                      {log.entry_at ? new Date(log.entry_at).toLocaleTimeString('ko-KR') : '-'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    log.exit_at ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {log.exit_at ? '퇴장' : '참석'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <UserCheck className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">체크인 기록이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
