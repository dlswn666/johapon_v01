'use client';

import React, { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { ArrowLeft, QrCode, Search, Printer, RefreshCw, Users, Check, Clock } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';

interface SnapshotWithToken {
  id: string;
  member_name: string;
  member_phone: string | null;
  property_address: string | null;
  voting_weight: number;
  member_type: string;
  access_token: string | null;
  identity_verified_at: string | null;
  token_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function QrCodesPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, union, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly } = useAssembly(assemblyId);
  const { openConfirmModal, openAlertModal } = useModalStore();

  const [snapshots, setSnapshots] = useState<SnapshotWithToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  // 스냅샷 목록 로드
  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assemblies/${assemblyId}/snapshots`);
      if (!res.ok) throw new Error('조회 실패');
      const { data } = await res.json();
      setSnapshots(data || []);
    } catch {
      setSnapshots([]);
    } finally {
      setIsLoading(false);
    }
  }, [assemblyId]);

  useEffect(() => {
    if (assemblyId && union?.id) loadSnapshots();
  }, [assemblyId, union?.id, loadSnapshots]);

  // QR 코드 이미지 생성 (개별)
  const generateQrImage = useCallback(async (snapshot: SnapshotWithToken) => {
    if (!snapshot.access_token || !slug) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const gateUrl = `${window.location.origin}/${slug}/assembly/${assemblyId}?token=${snapshot.access_token}`;
      const dataUrl = await QRCode.toDataURL(gateUrl, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      setQrImages((prev) => ({ ...prev, [snapshot.id]: dataUrl }));
    } catch (err) {
      console.error('QR 생성 실패:', err);
    }
  }, [slug, assemblyId]);

  // 전체 QR 이미지 일괄 생성
  const generateAllQrImages = useCallback(async () => {
    const targets = snapshots.filter((s) => s.access_token && !qrImages[s.id]);
    for (const s of targets) {
      await generateQrImage(s);
    }
  }, [snapshots, qrImages, generateQrImage]);

  // 스냅샷이 로드되면 QR 이미지 생성
  useEffect(() => {
    if (snapshots.length > 0) {
      generateAllQrImages();
    }
  }, [snapshots, generateAllQrImages]);

  // 스냅샷 일괄 생성
  const handleGenerateSnapshots = () => {
    openConfirmModal({
      title: '조합원 스냅샷 생성',
      message: '현재 조합 소속 전체 조합원의 스냅샷과 입장 코드(QR)를 생성합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?',
      confirmText: '생성',
      cancelText: '취소',
      onConfirm: async () => {
        setIsGenerating(true);
        try {
          const res = await fetch(`/api/assemblies/${assemblyId}/snapshots`, { method: 'POST' });
          const result = await res.json();
          if (!res.ok) {
            openAlertModal({ title: '생성 실패', message: result.error || '스냅샷 생성에 실패했습니다.', type: 'error' });
            return;
          }
          openAlertModal({
            title: '생성 완료',
            message: `${result.data.totalCreated}명의 조합원 스냅샷과 입장 코드가 생성되었습니다.`,
            type: 'success',
          });
          await loadSnapshots();
        } catch {
          openAlertModal({ title: '오류', message: '네트워크 오류가 발생했습니다.', type: 'error' });
        } finally {
          setIsGenerating(false);
        }
      },
    });
  };

  // 인쇄
  const handlePrint = () => {
    const targets = selectedIds.size > 0
      ? snapshots.filter((s) => selectedIds.has(s.id))
      : snapshots;

    if (targets.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cards = targets.map((s) => {
      const qrSrc = qrImages[s.id] || '';
      return `
        <div style="display:inline-block; width:280px; padding:20px; margin:10px; border:1px solid #ddd; border-radius:8px; text-align:center; page-break-inside:avoid;">
          ${qrSrc ? `<img src="${qrSrc}" width="180" height="180" style="margin-bottom:10px;" />` : '<p style="color:red;">QR 없음</p>'}
          <p style="font-size:16px; font-weight:bold; margin:4px 0;">${s.member_name}</p>
          ${s.property_address ? `<p style="font-size:11px; color:#666; margin:2px 0;">${s.property_address}</p>` : ''}
          ${s.member_phone ? `<p style="font-size:11px; color:#999; margin:2px 0;">${s.member_phone}</p>` : ''}
          <p style="font-size:10px; color:#aaa; margin-top:6px;">${assembly?.title || '총회'}</p>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>QR 코드 인쇄 — ${assembly?.title || '총회'}</title>
        <style>
          body { font-family: -apple-system, sans-serif; margin: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head><body>
        <h2 style="text-align:center; margin-bottom:20px;">${assembly?.title || '총회'} — 입장 QR 코드</h2>
        <div style="text-align:center;">${cards}</div>
        <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSnapshots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSnapshots.map((s) => s.id)));
    }
  };

  // 검색 필터
  const filteredSnapshots = snapshots.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      s.member_name.toLowerCase().includes(q) ||
      (s.member_phone || '').includes(q) ||
      (s.property_address || '').toLowerCase().includes(q)
    );
  });

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
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">입장 QR 코드 관리</h1>
          <p className="text-sm text-gray-500">{assembly?.title}</p>
        </div>
      </div>

      {/* 스냅샷 없을 때 */}
      {!isLoading && snapshots.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <QrCode className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">아직 입장 코드가 없습니다</h3>
          <p className="text-sm text-gray-500 mb-6">
            조합원 스냅샷을 생성하면 각 조합원에게 고유한 입장 QR 코드가 발급됩니다.<br />
            조합원은 이 QR 코드를 스캔하여 총회에 입장하고 투표할 수 있습니다.
          </p>
          <Button onClick={handleGenerateSnapshots} disabled={isGenerating} size="lg">
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />생성 중...</>
            ) : (
              <><Users className="w-4 h-4 mr-2" />조합원 스냅샷 일괄 생성</>
            )}
          </Button>
        </div>
      )}

      {/* 스냅샷 있을 때 */}
      {!isLoading && snapshots.length > 0 && (
        <>
          {/* 상단 요약 + 도구 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>총 <strong>{snapshots.length}</strong>명</span>
                <span className="text-gray-300">|</span>
                <span className="text-green-600">
                  인증 {snapshots.filter((s) => s.identity_verified_at).length}명
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-blue-600">
                  미인증 {snapshots.filter((s) => !s.identity_verified_at).length}명
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름/전화/주소 검색"
                    className="pl-9 w-[200px] h-9 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  disabled={filteredSnapshots.length === 0}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  {selectedIds.size > 0 ? `선택 인쇄 (${selectedIds.size})` : '전체 인쇄'}
                </Button>
              </div>
            </div>
          </div>

          {/* QR 카드 그리드 */}
          <div ref={printRef}>
            {/* 전체 선택 */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                  selectedIds.size === filteredSnapshots.length && filteredSnapshots.length > 0
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}>
                  {selectedIds.size === filteredSnapshots.length && filteredSnapshots.length > 0 && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                전체 선택
              </button>
              <span className="text-xs text-gray-400">
                {filteredSnapshots.length}명 표시
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredSnapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className={`bg-white rounded-lg border p-3 text-center cursor-pointer transition-all ${
                    selectedIds.has(snapshot.id)
                      ? 'border-blue-400 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleSelect(snapshot.id)}
                >
                  {/* QR 이미지 */}
                  <div className="flex justify-center mb-2">
                    {qrImages[snapshot.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrImages[snapshot.id]}
                        alt={`${snapshot.member_name} QR`}
                        width={140}
                        height={140}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-[140px] h-[140px] bg-gray-100 rounded flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* 조합원 정보 */}
                  <p className="text-sm font-semibold text-gray-900 truncate">{snapshot.member_name}</p>
                  {snapshot.property_address && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{snapshot.property_address}</p>
                  )}

                  {/* 상태 뱃지 */}
                  <div className="mt-2">
                    {snapshot.identity_verified_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                        <Check className="w-3 h-3" />
                        인증완료
                      </span>
                    ) : snapshot.token_used_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">
                        <Clock className="w-3 h-3" />
                        접속함
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                        대기
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-lg" />
          ))}
        </div>
      )}
    </div>
  );
}
