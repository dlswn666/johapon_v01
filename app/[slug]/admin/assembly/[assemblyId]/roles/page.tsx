'use client';

import React from 'react';
import { use } from 'react';
import {
  useAssemblyRoles,
  useRevokeRole,
} from '@/app/_lib/features/assembly/api/useAssemblyRolesHook';
import RoleAssignmentForm from '@/app/_lib/features/assembly/ui/admin/RoleAssignmentForm';
import { ASSEMBLY_ROLE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface PageProps {
  params: Promise<{ slug: string; assemblyId: string }>;
}

export default function RolesPage({ params }: PageProps) {
  const { assemblyId } = use(params);
  const { data: roles = [], isLoading } = useAssemblyRoles(assemblyId);
  const revokeMutation = useRevokeRole(assemblyId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">역할 관리</h1>
        <p className="text-xs text-gray-500 mt-1">역할 배정/해제 내역은 감사로그에 기록됩니다.</p>
      </div>

      {/* 현재 배정된 역할 목록 */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">현재 배정된 역할</h2>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-gray-500">로딩 중...</p>
        ) : roles.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">배정된 역할이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">역할</th>
                  <th className="px-4 py-2 font-medium">이름</th>
                  <th className="px-4 py-2 font-medium">배정일</th>
                  <th className="px-4 py-2 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {ASSEMBLY_ROLE_LABELS[role.role]}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{role.users?.name ?? role.user_id}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(role.assigned_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => revokeMutation.mutate({ roleId: role.id })}
                        disabled={revokeMutation.isPending}
                      >
                        해제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 역할 배정 */}
      <RoleAssignmentForm assemblyId={assemblyId} />
    </div>
  );
}
