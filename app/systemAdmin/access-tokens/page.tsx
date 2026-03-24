'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Copy, Trash2, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AccessTokenListItem, CreateAccessTokenRequest, AccessScope } from '@/app/_lib/shared/type/accessToken.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnions } from '@/app/_lib/entities/union/api/useUnionHook';

type TokenPreset = 'kakao_review' | 'custom';

const PRESETS: Record<TokenPreset, { label: string; expires_in_days: number | null; max_usage: number | null; access_scope: AccessScope }> = {
  kakao_review: {
    label: '카카오 검수',
    expires_in_days: 1,
    max_usage: 100,
    access_scope: 'all',
  },
  custom: {
    label: '커스텀',
    expires_in_days: 7,
    max_usage: null,
    access_scope: 'all',
  },
};

export default function AccessTokensPage() {
  const [tokens, setTokens] = useState<AccessTokenListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState<AccessTokenListItem | null>(null);
  const [newTokenKey, setNewTokenKey] = useState('');
  const [newTokenUnionSlug, setNewTokenUnionSlug] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resultUrlCopied, setResultUrlCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TokenPreset>('kakao_review');

  // 조합 목록 조회 (기존 훅 사용)
  const { data: unions = [] } = useUnions();

  // 폼 상태
  const [formData, setFormData] = useState<CreateAccessTokenRequest>({
    name: '',
    union_id: null,
    access_scope: 'all',
    expires_in_days: 1,
    max_usage: 100,
  });

  // 토큰 목록 조회
  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/access-tokens');
      const result = await response.json();
      if (result.data) {
        setTokens(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // 프리셋 변경
  const handlePresetChange = (preset: TokenPreset) => {
    setSelectedPreset(preset);
    const config = PRESETS[preset];
    if (preset === 'kakao_review') {
      const unionName = formData.union_id
        ? unions.find((u) => u.id === formData.union_id)?.name
        : '';
      setFormData({
        ...formData,
        name: unionName ? `카카오 검수용 - ${unionName}` : '카카오 검수용',
        expires_in_days: config.expires_in_days,
        max_usage: config.max_usage,
        access_scope: config.access_scope,
      });
    } else {
      setFormData({
        ...formData,
        expires_in_days: config.expires_in_days,
        max_usage: config.max_usage,
        access_scope: config.access_scope,
      });
    }
  };

  // 토큰 생성
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('토큰 이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/access-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.data) {
        setNewTokenKey(result.data.key);
        const selectedUnion = formData.union_id
          ? unions.find((u) => u.id === formData.union_id)
          : null;
        setNewTokenUnionSlug(selectedUnion?.slug || null);
        setShowCreateDialog(false);
        setShowResultDialog(true);
        fetchTokens();
        resetForm();
      } else {
        alert(result.error || '토큰 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create token:', error);
      alert('토큰 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 토큰 삭제
  const handleDelete = async () => {
    if (!selectedToken) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/access-tokens/${selectedToken.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteDialog(false);
        setSelectedToken(null);
        fetchTokens();
      } else {
        alert('토큰 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete token:', error);
      alert('토큰 삭제에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // URL 복사
  const handleCopyUrl = async (token: AccessTokenListItem) => {
    const baseUrl = window.location.origin;
    const slug = token.union_id
      ? unions.find((u) => u.id === token.union_id)?.slug || ''
      : '[조합slug]';
    const url = `${baseUrl}/${slug}?tokenKey=${token.key}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(token.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // 폼 리셋
  const resetForm = () => {
    setSelectedPreset('kakao_review');
    setFormData({
      name: '',
      union_id: null,
      access_scope: 'all',
      expires_in_days: 1,
      max_usage: 100,
    });
  };

  // 날짜 포맷
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '무제한';
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-7 h-7" />
            접근 토큰 관리
          </h1>
          <p className="text-slate-400 mt-1">
            카카오톡 등 외부 공유용 일회성 접근 토큰을 관리합니다
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          새 토큰 생성
        </Button>
      </div>

      {/* 토큰 목록 */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {tokens.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">생성된 토큰이 없습니다</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              첫 토큰 생성하기
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-700/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">이름</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">조합</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">상태</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">만료일</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">사용</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{token.name}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {token.key.substring(0, 12)}...
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {token.union_name || '전체'}
                  </td>
                  <td className="px-6 py-4">
                    {token.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                        <XCircle className="w-3 h-3" />
                        만료
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {formatDate(token.expires_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {token.usage_count}회
                    {token.max_usage && <span className="text-slate-500"> / {token.max_usage}</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(token)}
                        className="gap-1"
                      >
                        {copiedId === token.id ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copiedId === token.id ? '복사됨' : 'URL 복사'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedToken(token);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 통계 */}
      <div className="text-sm text-slate-400">
        총 {tokens.length}개 토큰 (활성: {tokens.filter((t) => t.is_active).length}개, 만료:{' '}
        {tokens.filter((t) => !t.is_active).length}개)
      </div>

      {/* 토큰 생성 모달 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>새 접근 토큰 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>용도</Label>
              <Select
                value={selectedPreset}
                onValueChange={(value) => handlePresetChange(value as TokenPreset)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kakao_review">카카오 검수 (1일, 100회)</SelectItem>
                  <SelectItem value="custom">커스텀</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">토큰 이름 (메모용)</Label>
              <Input
                id="name"
                placeholder="예: 1월 공지사항 카카오톡 공유용"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>조합 설정</Label>
              <Select
                value={formData.union_id || 'all'}
                onValueChange={(value) => {
                  const unionId = value === 'all' ? null : value;
                  const unionName = unionId ? unions.find((u) => u.id === unionId)?.name : '';
                  const newName = selectedPreset === 'kakao_review'
                    ? (unionName ? `카카오 검수용 - ${unionName}` : '카카오 검수용')
                    : formData.name;
                  setFormData({ ...formData, union_id: unionId, name: newName });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="조합 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 조합</SelectItem>
                  {unions.map((union) => (
                    <SelectItem key={union.id} value={union.id}>
                      {union.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>만료 설정</Label>
              <Select
                value={String(formData.expires_in_days ?? 'unlimited')}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    expires_in_days: value === 'unlimited' ? null : parseInt(value),
                  })
                }
                disabled={selectedPreset === 'kakao_review'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1일 후 만료</SelectItem>
                  <SelectItem value="7">7일 후 만료</SelectItem>
                  <SelectItem value="30">30일 후 만료</SelectItem>
                  <SelectItem value="90">90일 후 만료</SelectItem>
                  <SelectItem value="unlimited">무제한</SelectItem>
                </SelectContent>
              </Select>
              {selectedPreset === 'kakao_review' && (
                <p className="text-xs text-slate-500">카카오 검수 프리셋: 1일 후 만료</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>사용 횟수 제한</Label>
              <Select
                value={String(formData.max_usage ?? 'unlimited')}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    max_usage: value === 'unlimited' ? null : parseInt(value),
                  })
                }
                disabled={selectedPreset === 'kakao_review'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100회</SelectItem>
                  <SelectItem value="500">500회</SelectItem>
                  <SelectItem value="1000">1,000회</SelectItem>
                  <SelectItem value="5000">5,000회</SelectItem>
                  <SelectItem value="unlimited">무제한</SelectItem>
                </SelectContent>
              </Select>
              {selectedPreset === 'kakao_review' && (
                <p className="text-xs text-slate-500">카카오 검수 프리셋: 100회 제한</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              토큰 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 토큰 생성 결과 모달 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              토큰이 생성되었습니다
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>토큰 키</Label>
              <div className="mt-1 p-3 bg-slate-700 rounded-lg font-mono text-sm break-all">
                {newTokenKey}
              </div>
            </div>

            <div>
              <Label>공유용 URL</Label>
              <div className="mt-1 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm break-all text-blue-300 font-mono">
                {typeof window !== 'undefined' && newTokenUnionSlug
                  ? `${window.location.origin}/${newTokenUnionSlug}?tokenKey=${newTokenKey}`
                  : `${typeof window !== 'undefined' ? window.location.origin : ''}/[조합slug]?tokenKey=${newTokenKey}`}
              </div>
              {!newTokenUnionSlug && (
                <p className="mt-2 text-xs text-slate-500">
                  [조합slug] 부분을 실제 조합 slug로 변경하여 사용하세요.
                </p>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm text-amber-400">
                이 토큰으로 조합 페이지에 로그인 없이 접근할 수 있습니다.
                공유 시 주의해주세요.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {newTokenUnionSlug && (
              <Button
                variant="outline"
                onClick={async () => {
                  const url = `${window.location.origin}/${newTokenUnionSlug}?tokenKey=${newTokenKey}`;
                  await navigator.clipboard.writeText(url);
                  setResultUrlCopied(true);
                  setTimeout(() => setResultUrlCopied(false), 2000);
                }}
                className="gap-1"
              >
                {resultUrlCopied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {resultUrlCopied ? '복사됨' : 'URL 복사'}
              </Button>
            )}
            <Button onClick={() => setShowResultDialog(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 토큰 삭제 확인 모달 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>토큰 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-300">
              &quot;{selectedToken?.name}&quot; 토큰을 삭제하시겠습니까?
            </p>
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              <ul className="list-disc list-inside space-y-1">
                <li>이 토큰으로 더 이상 접근할 수 없습니다</li>
                <li>이미 공유된 링크도 작동하지 않습니다</li>
                <li>이 작업은 되돌릴 수 없습니다</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
