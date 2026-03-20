'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { MultisigSignerRole } from '@/app/_lib/shared/type/assembly.types';
import { useSignMultisig } from '../../api/useMultisigHook';
import StepUpAuthModal from '../StepUpAuthModal';

interface MultisigSignatureButtonProps {
  assemblyId: string;
  approvalId: string;
  signerRole: MultisigSignerRole;
  alreadySigned: boolean;
}

async function computeSignatureHash(approvalId: string, userId: string): Promise<string> {
  const data = `${approvalId}${userId}${new Date().toISOString()}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function MultisigSignatureButton({
  assemblyId,
  approvalId,
  signerRole,
  alreadySigned,
}: MultisigSignatureButtonProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const signMutation = useSignMultisig(assemblyId);

  const handleAuthSuccess = async (nonce: string) => {
    setIsAuthOpen(false);
    // nonce를 userId 대용으로 해시에 포함 (실제 구현에서는 세션 userId 사용)
    const signatureHash = await computeSignatureHash(approvalId, nonce);
    signMutation.mutate({ approvalId, signerRole, signatureHash });
  };

  if (alreadySigned) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        서명 완료
      </span>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsAuthOpen(true)}
        disabled={signMutation.isPending}
        type="button"
      >
        {signMutation.isPending ? '서명 중...' : '서명하기'}
      </Button>
      <StepUpAuthModal
        isOpen={isAuthOpen}
        assemblyId={assemblyId}
        onSuccess={handleAuthSuccess}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  );
}
