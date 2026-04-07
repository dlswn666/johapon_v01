'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useProxyList, useRegisterProxy, useRevokeProxy } from '@/app/_lib/features/assembly/api/useProxyHook';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';
import { AssemblyMemberSnapshot } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Search, UserPlus, X } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

const PROXY_RELATIONS = ['배우자', '직계존비속', '형제자매'];

export default function ProxyManagementPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, union, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly } = useAssembly(assemblyId);
  const { data: proxyList, isLoading: isProxyLoading } = useProxyList(assemblyId);
  const registerMutation = useRegisterProxy(assemblyId);
  const revokeMutation = useRevokeProxy(assemblyId);
  const { openConfirmModal } = useModalStore();

  // 등록 폼 상태
  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<AssemblyMemberSnapshot[]>([]);
  const [selectedMember, setSelectedMember] = useState<AssemblyMemberSnapshot | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [proxyName, setProxyName] = useState('');
  const [proxyRelation, setProxyRelation] = useState('');
  const [proxyDocFile, setProxyDocFile] = useState<File | null>(null);
  const [proxyDocPreview, setProxyDocPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('JPG, PNG, PDF 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 최대 10MB입니다.');
      return;
    }
    setProxyDocFile(file);
    if (file.type !== 'application/pdf') {
      setProxyDocPreview(URL.createObjectURL(file));
    } else {
      setProxyDocPreview(null);
    }
  };

  const handleRegister = async () => {
    if (!selectedMember || !proxyName.trim() || !proxyRelation) return;

    let proxyDocumentUrl: string | undefined;

    // 위임장 파일 업로드
    if (proxyDocFile && union?.id) {
      const ext = proxyDocFile.name.split('.').pop() || 'bin';
      const filePath = `${union.id}/${assemblyId}/${selectedMember.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('proxy-documents')
        .upload(filePath, proxyDocFile, { contentType: proxyDocFile.type, upsert: false });

      if (uploadError) {
        alert('위임장 업로드에 실패했습니다.');
        return;
      }

      const { data: signedData } = await supabase.storage
        .from('proxy-documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      proxyDocumentUrl = signedData?.signedUrl || filePath;
    }

    // proxyUserId 결정: 간소화 - proxyName 기반으로 등록 (실제 user_id가 없을 수 있음)
    // 임시로 "PROXY_" + 이름 해시 사용 또는 검색 후 지정
    // 스냅샷의 user_id를 대리인 user_id로 기록하는 것이 아닌, 대리인 정보만 기록
    registerMutation.mutate(
      {
        snapshotId: selectedMember.id,
        proxyUserId: `PROXY_${proxyName.trim()}`,
        proxyName: `${proxyName.trim()} (${proxyRelation})`,
        proxyDocumentUrl,
      },
      {
        onSuccess: () => {
          setSelectedMember(null);
          setMemberSearch('');
          setMemberResults([]);
          setProxyName('');
          setProxyRelation('');
          setProxyDocFile(null);
          setProxyDocPreview(null);
          setActiveTab('list');
        },
      }
    );
  };

  const handleRevoke = (snapshotId: string, memberName: string) => {
    openConfirmModal({
      title: '대리인 해제',
      message: `${memberName}의 대리인을 해제하시겠습니까?`,
      confirmText: '해제',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => revokeMutation.mutate({ snapshotId }),
    });
  };

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        {/* 탭 */}
        <Skeleton className="h-10 w-56 rounded-lg" style={{ animationDelay: '100ms' }} />
        {/* 폼 영역 */}
        <div className="bg-white rounded-lg p-6 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" style={{ animationDelay: `${200 + i * 100}ms` }} />
              <Skeleton className="h-10 w-full" style={{ animationDelay: `${250 + i * 100}ms` }} />
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '500ms' }} />
        </div>
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대리인(위임) 관리</h1>
          <p className="text-sm text-gray-500">{assembly?.title}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'register', label: '등록' },
          { key: 'list', label: `등록된 대리인 (${proxyList?.length || 0})` },
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

      {/* 등록 탭 */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          {/* 1. 위임자(조합원) 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">1. 위임자(조합원) 선택</label>
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

          {/* 2. 대리인 정보 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">2. 대리인 정보</label>
            <Input
              value={proxyName}
              onChange={(e) => setProxyName(e.target.value)}
              placeholder="대리인 성명"
              disabled={!selectedMember}
            />
            <select
              value={proxyRelation}
              onChange={(e) => setProxyRelation(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedMember}
            >
              <option value="">관계 선택</option>
              {PROXY_RELATIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 3. 위임장 업로드 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">3. 위임장 업로드 (선택)</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedMember}
              >
                파일 선택
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {proxyDocFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{proxyDocFile.name}</span>
                  <button onClick={() => { setProxyDocFile(null); setProxyDocPreview(null); }}>
                    <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">JPG, PNG, PDF / 최대 10MB</p>
            {proxyDocPreview && (
              <img src={proxyDocPreview} alt="위임장 미리보기" className="max-w-[200px] max-h-[280px] rounded border" />
            )}
          </div>

          <Button
            onClick={handleRegister}
            disabled={!selectedMember || !proxyName.trim() || !proxyRelation || registerMutation.isPending}
            className="w-full"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {registerMutation.isPending ? '등록 중...' : '대리인 등록'}
          </Button>
        </div>
      )}

      {/* 등록된 대리인 탭 */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">등록된 대리인</h2>
          </div>
          {isProxyLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded" />)}
            </div>
          ) : proxyList && proxyList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">위임자</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">대리인</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">위임장</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">등록일시</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">해제</th>
                  </tr>
                </thead>
                <tbody>
                  {proxyList.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium">{p.member_name}</td>
                      <td className="py-3 px-4">{p.proxy_name || '-'}</td>
                      <td className="py-3 px-4">
                        {p.proxy_document_url ? (
                          <a
                            href={p.proxy_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            보기
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">없음</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {p.proxy_authorized_at
                          ? new Date(p.proxy_authorized_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevoke(p.id, p.member_name)}
                          disabled={revokeMutation.isPending}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <UserPlus className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">등록된 대리인이 없습니다</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
