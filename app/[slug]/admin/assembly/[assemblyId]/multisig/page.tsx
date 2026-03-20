'use client';

import React from 'react';
import { use } from 'react';
import MultisigApprovalPanel from '@/app/_lib/features/assembly/ui/admin/MultisigApprovalPanel';
import { useMyAssemblyRole } from '@/app/_lib/features/assembly/api/useAssemblyRolesHook';
import { ASSEMBLY_ROLE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface PageProps {
  params: Promise<{ slug: string; assemblyId: string }>;
}

export default function MultisigPage({ params }: PageProps) {
  const { assemblyId } = use(params);
  const { data: myRole } = useMyAssemblyRole(assemblyId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">다중 승인 현황</h1>
        {myRole && (
          <p className="text-sm text-gray-500 mt-1">
            내 역할: <span className="font-medium text-gray-700">{ASSEMBLY_ROLE_LABELS[myRole.role]}</span>
          </p>
        )}
      </div>

      <MultisigApprovalPanel assemblyId={assemblyId} />
    </div>
  );
}
