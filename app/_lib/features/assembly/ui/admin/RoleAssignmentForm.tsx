'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ASSEMBLY_ROLE_LABELS, type AssemblyRoleType } from '@/app/_lib/shared/type/assembly.types';
import { useAssignRole } from '../../api/useAssemblyRolesHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

interface MemberSearchResult {
  user_id: string;
  name: string;
  phone: string;
}

interface RoleAssignmentFormProps {
  assemblyId: string;
  onSuccess?: () => void;
}

export default function RoleAssignmentForm({ assemblyId, onSuccess }: RoleAssignmentFormProps) {
  const { union } = useSlug();
  const [selectedRole, setSelectedRole] = useState<AssemblyRoleType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const assignMutation = useAssignRole(assemblyId);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !union?.id) return;
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery });
      const res = await fetch(`/api/unions/${union.id}/members/search?${params}`);
      if (res.ok) {
        const { data } = await res.json();
        setSearchResults(data || []);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssign = () => {
    if (!selectedMember || !selectedRole) return;
    assignMutation.mutate(
      { user_id: selectedMember.user_id, role: selectedRole },
      {
        onSuccess: () => {
          setSelectedRole('');
          setSearchQuery('');
          setSearchResults([]);
          setSelectedMember(null);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
      <h3 className="text-sm font-bold text-gray-800">역할 배정</h3>

      {/* 역할 선택 */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">역할 선택</label>
        <select
          className="w-full text-sm border border-gray-300 rounded px-3 py-2"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as AssemblyRoleType | '')}
        >
          <option value="">선택하세요</option>
          {(Object.entries(ASSEMBLY_ROLE_LABELS) as [AssemblyRoleType, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* 조합원 검색 */}
      <div>
        <label className="block text-xs text-gray-600 mb-1">조합원 검색</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 text-sm border border-gray-300 rounded px-3 py-2"
            placeholder="이름 또는 연락처"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button size="sm" variant="outline" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? '검색 중...' : '검색'}
          </Button>
        </div>
      </div>

      {/* 검색 결과 */}
      {searchResults.length > 0 && !selectedMember && (
        <ul className="border border-gray-200 rounded divide-y divide-gray-100 max-h-40 overflow-y-auto">
          {searchResults.map((member) => (
            <li key={member.user_id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setSelectedMember(member);
                  setSearchResults([]);
                }}
              >
                <span className="font-medium">{member.name}</span>
                <span className="text-gray-500 ml-2">{member.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 선택된 조합원 */}
      {selectedMember && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-blue-900">{selectedMember.name}</p>
            <p className="text-xs text-blue-700">{selectedMember.phone}</p>
          </div>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => setSelectedMember(null)}
          >
            변경
          </button>
        </div>
      )}

      <Button
        onClick={handleAssign}
        disabled={!selectedMember || !selectedRole || assignMutation.isPending}
        className="w-full"
      >
        {assignMutation.isPending ? '배정 중...' : '배정'}
      </Button>
    </div>
  );
}
