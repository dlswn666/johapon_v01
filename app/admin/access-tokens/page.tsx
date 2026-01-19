'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Copy, Trash2, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AccessTokenListItem, CreateAccessTokenRequest } from '@/app/_lib/shared/type/accessToken.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnions } from '@/app/_lib/entities/union/api/useUnionHook';

export default function AccessTokensPage() {
  const [tokens, setTokens] = useState<AccessTokenListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState<AccessTokenListItem | null>(null);
  const [newTokenKey, setNewTokenKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 조합 목록 조회 (기존 훅 사용)
  const { data: unions = [] } = useUnions();

  // 폼 상태
  const [formData, setFormData] = useState<CreateAccessTokenRequest>({
    name: '',
    union_id: null,
    access_scope: 'all',
    expires_in_days: 7,
    max_usage: null,
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
    setFormData({
      name: '',
      union_id: null,
      access_scope: 'all',
      expires_in_days: 7,
      max_usage: null,
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
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-7 h-7" />
            접근 토큰 관리
          </h1>
          <p className="text-gray-500 mt-1">
            카카오톡 등 외부 공유용 일회성 접근 토큰을 관리합니다
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          새 토큰 생성
        </Button>
      </div>

      {/* 토큰 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tokens.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">생성된 토큰이 없습니다</p>
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
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">이름</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">조합</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">상태</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">만료일</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">사용</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{token.name}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {token.key.substring(0, 12)}...
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {token.union_name || '전체'}
                  </td>
                  <td className="px-6 py-4">
                    {token.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3" />
                        만료
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(token.expires_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {token.usage_count}회
                    {token.max_usage && <span className="text-gray-400"> / {token.max_usage}</span>}
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
                          <CheckCircle className="w-4 h-4 text-green-600" />
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
      <div className="text-sm text-gray-500">
        총 {tokens.length}개 토큰 (활성: {tokens.filter((t) => t.is_active).length}개, 만료:{' '}
        {tokens.filter((t) => !t.is_active).length}개)
      </div>

      {/* 토큰 생성 모달 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 접근 토큰 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                onValueChange={(value) =>
                  setFormData({ ...formData, union_id: value === 'all' ? null : value })
                }
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              토큰이 생성되었습니다
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>토큰 키</Label>
              <div className="mt-1 p-3 bg-gray-100 rounded-lg font-mono text-sm break-all">
                {newTokenKey}
              </div>
            </div>

            <div>
              <Label>공유용 URL 예시</Label>
              <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm break-all">
                {typeof window !== 'undefined' && `${window.location.origin}/[조합slug]?tokenKey=${newTokenKey}`}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                [조합slug] 부분을 실제 조합 slug로 변경하여 사용하세요.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                이 토큰으로 조합 페이지에 로그인 없이 접근할 수 있습니다.
                공유 시 주의해주세요.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 토큰 삭제 확인 모달 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>토큰 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              &quot;{selectedToken?.name}&quot; 토큰을 삭제하시겠습니까?
            </p>
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
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
