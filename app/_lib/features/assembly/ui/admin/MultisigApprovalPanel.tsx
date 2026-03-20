'use client';

import React, { useEffect, useState } from 'react';
import type { MultisigActionType, MultisigApproval, MultisigSignerRole } from '@/app/_lib/shared/type/assembly.types';
import { MULTISIG_ACTION_LABELS, ASSEMBLY_ROLE_LABELS } from '@/app/_lib/shared/type/assembly.types';

const MULTISIG_SIGNER_ROLES = new Set<string>([
  'UNION_PRESIDENT', 'ELECTION_CHAIR', 'AUDITOR', 'OBSERVER_REP',
]);
import { usePendingMultisig } from '../../api/useMultisigHook';
import { useMyAssemblyRole } from '../../api/useAssemblyRolesHook';
import MultisigSignatureButton from './MultisigSignatureButton';

interface MultisigApprovalPanelProps {
  assemblyId: string;
  filterActionType?: MultisigActionType;
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono text-xs text-orange-600">{timeLeft}</span>;
}

function MultisigCard({ approval, assemblyId, myRole }: {
  approval: MultisigApproval;
  assemblyId: string;
  myRole: string | undefined;
}) {
  const isMultisigRole = !!myRole && MULTISIG_SIGNER_ROLES.has(myRole);
  const alreadySigned = approval.multisig_signatures?.some(
    (sig) => sig.signer_role === myRole
  ) ?? false;
  const canSign = isMultisigRole && !alreadySigned;

  return (
    <div className="p-4 border border-gray-200 rounded-lg space-y-3 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {MULTISIG_ACTION_LABELS[approval.action_type]}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            만료까지: <ExpiryCountdown expiresAt={approval.expires_at} />
          </p>
        </div>
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
          {approval.current_count} / {approval.required_count} 서명
        </span>
      </div>

      {/* 서명자 목록 */}
      {approval.multisig_signatures && approval.multisig_signatures.length > 0 && (
        <div className="space-y-1">
          {approval.multisig_signatures.map((sig) => (
            <div key={sig.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{ASSEMBLY_ROLE_LABELS[sig.signer_role]}</span>
            </div>
          ))}
        </div>
      )}

      {canSign && myRole && (
        <MultisigSignatureButton
          assemblyId={assemblyId}
          approvalId={approval.id}
          signerRole={myRole as MultisigSignerRole}
          alreadySigned={alreadySigned}
        />
      )}
    </div>
  );
}

export default function MultisigApprovalPanel({ assemblyId, filterActionType }: MultisigApprovalPanelProps) {
  const { data: approvals = [], isLoading } = usePendingMultisig(assemblyId);
  const { data: myRole } = useMyAssemblyRole(assemblyId);

  const filtered = filterActionType
    ? approvals.filter((a) => a.action_type === filterActionType)
    : approvals;

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
      <h3 className="text-sm font-bold text-gray-800">다중 승인 현황</h3>

      {isLoading && (
        <p className="text-sm text-gray-500">로딩 중...</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">현재 대기 중인 승인 요청이 없습니다.</p>
      )}

      {filtered.map((approval) => (
        <MultisigCard
          key={approval.id}
          approval={approval}
          assemblyId={assemblyId}
          myRole={myRole?.role}
        />
      ))}
    </div>
  );
}
