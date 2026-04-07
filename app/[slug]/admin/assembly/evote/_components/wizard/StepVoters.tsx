'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import type { EvoteCreateForm, VoterFilterMode } from '@/app/_lib/features/evote/types/evote.types';

interface StepVotersProps {
  formData: EvoteCreateForm;
  updateForm: (partial: Partial<EvoteCreateForm>) => void;
}

interface MemberRow {
  id: string;
  name: string;
  phone_number: string | null;
  property_address: string | null;
  role: string;
}

export default function StepVoters({ formData, updateForm }: StepVotersProps) {
  const { union } = useSlug();
  const [search, setSearch] = useState('');

  // 조합원 목록 조회
  const { data: members, isLoading, isError } = useQuery({
    queryKey: ['evote-voters', union?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone_number, property_address, role')
        .eq('union_id', union!.id)
        .in('user_status', ['APPROVED', 'PRE_REGISTERED'])
        .eq('is_blocked', false)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as MemberRow[];
    },
    enabled: !!union?.id,
  });

  // 필터 모드 변경 시 선택 초기화 (선택된 항목이 있으면 경고)
  const handleFilterChange = (mode: VoterFilterMode) => {
    if (mode === formData.voterFilter) return;
    if (formData.selectedVoterIds.length > 0) {
      const confirmed = confirm('필터를 변경하면 현재 선택이 초기화됩니다. 계속하시겠습니까?');
      if (!confirmed) return;
    }
    updateForm({ voterFilter: mode, selectedVoterIds: [] });
  };

  // 필터링된 조합원 목록
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let filtered = members;

    // 대의원 필터
    if (formData.voterFilter === 'DELEGATE_ONLY') {
      filtered = filtered.filter((m) => m.role === 'DELEGATE' || m.role === 'ADMIN');
    }

    // 검색 필터
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(lower) ||
          m.property_address?.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [members, formData.voterFilter, search]);

  // 전체 선택/해제
  const isAllSelected = filteredMembers.length > 0 && filteredMembers.every((m) =>
    formData.selectedVoterIds.includes(m.id)
  );

  const toggleAll = () => {
    if (isAllSelected) {
      // 현재 필터링된 멤버만 해제
      const filteredIds = new Set(filteredMembers.map((m) => m.id));
      updateForm({
        selectedVoterIds: formData.selectedVoterIds.filter((id) => !filteredIds.has(id)),
      });
    } else {
      // 현재 필터링된 멤버를 모두 추가
      const existing = new Set(formData.selectedVoterIds);
      const newIds = filteredMembers.map((m) => m.id).filter((id) => !existing.has(id));
      updateForm({
        selectedVoterIds: [...formData.selectedVoterIds, ...newIds],
      });
    }
  };

  const toggleMember = (memberId: string) => {
    const exists = formData.selectedVoterIds.includes(memberId);
    if (exists) {
      updateForm({
        selectedVoterIds: formData.selectedVoterIds.filter((id) => id !== memberId),
      });
    } else {
      updateForm({
        selectedVoterIds: [...formData.selectedVoterIds, memberId],
      });
    }
  };

  // 필터 변경 시 전체 선택 자동 적용 (초기 로드)
  useEffect(() => {
    if (members && formData.selectedVoterIds.length === 0) {
      updateForm({ selectedVoterIds: members.map((m) => m.id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">투표 대상자</h2>
        <p className="text-sm text-gray-500 mt-1">투표에 참여할 조합원을 선택합니다</p>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleFilterChange('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            formData.voterFilter === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체 조합원
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange('DELEGATE_ONLY')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            formData.voterFilter === 'DELEGATE_ONLY'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          대의원만
        </button>
      </div>

      {/* 검색 + 선택 카운트 */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 주소 검색"
          className="flex-1 h-10 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
        />
        <span className="text-sm text-gray-600 whitespace-nowrap">
          선택: <span className="font-semibold text-blue-600">{formData.selectedVoterIds.length}</span>
          {members ? ` / ${members.length}명` : ''}
        </span>
      </div>

      {/* 조합원 테이블 */}
      {isError ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">조합원 목록을 불러올 수 없습니다.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={toggleAll}
            />
            <span className="w-24">이름</span>
            <span className="w-32">연락처</span>
            <span className="flex-1">물건지 주소</span>
          </div>

          {/* 목록 */}
          <div className="max-h-[400px] overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                해당하는 조합원이 없습니다
              </div>
            ) : (
              filteredMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={formData.selectedVoterIds.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <span className="w-24 text-sm text-gray-900 truncate">{member.name}</span>
                  <span className="w-32 text-sm text-gray-500 truncate">{member.phone_number || '-'}</span>
                  <span className="flex-1 text-sm text-gray-500 truncate">{member.property_address || '-'}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
