'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Pen, Check, Shield, AlertTriangle } from 'lucide-react';
import ProgressBar from '@/app/_lib/widgets/common/ProgressBar';
import HashDisplay from '@/app/_lib/widgets/common/HashDisplay';
import type {
  OfficialDocument,
  DocumentSignature,
  SignerRole,
} from '@/app/_lib/shared/type/assembly.types';
import { SIGNER_ROLE_LABELS } from '@/app/_lib/shared/type/assembly.types';
import { isSignableStatus } from '@/app/_lib/features/assembly/domain/documentStateMachine';
import { calculateSignatureProgress } from '@/app/_lib/features/assembly/domain/signatureRules';

interface SignatureWorkflowProps {
  document: OfficialDocument;
  signatures: DocumentSignature[];
  currentUserId: string | null;
  onSign: (signerRole: SignerRole) => void;
  isSigning: boolean;
  className?: string;
}

/** 전자서명 워크플로우 UI */
export default function SignatureWorkflow({
  document: doc,
  signatures,
  currentUserId,
  onSign,
  isSigning,
  className = '',
}: SignatureWorkflowProps) {
  const validSignatures = signatures.filter((s) => s.status === 'VALID');
  const { percent, isComplete } = calculateSignatureProgress(
    validSignatures.length,
    doc.signature_threshold
  );
  const canSign = isSignableStatus(doc.status);
  const alreadySigned = validSignatures.some((s) => s.signer_id === currentUserId);

  // 현재 사용자의 서명 역할 결정 (required_signers에서 찾기)
  const mySignerEntry = doc.required_signers?.find((s) => s.signer_id === currentUserId);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Pen className="w-4 h-4" />
          전자서명 현황
        </h3>
        {isComplete && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Shield className="w-3.5 h-3.5" />
            서명 완료
          </span>
        )}
      </div>

      {/* 진행률 */}
      <ProgressBar
        value={percent}
        label={`${validSignatures.length}/${doc.signature_threshold}명 서명`}
        colorClass={isComplete ? 'bg-emerald-500' : 'bg-blue-500'}
      />

      {/* 해시 표시 */}
      <HashDisplay hash={doc.content_hash} label="서명 대상 해시" />

      {/* 서명자 목록 */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-500">필수 서명자</h4>
        <ul className="space-y-1.5">
          {doc.required_signers?.map((signer) => {
            const signed = validSignatures.find((s) => s.signer_id === signer.signer_id);
            return (
              <li key={signer.signer_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {signed ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={signed ? 'text-gray-500' : 'text-gray-900'}>
                    {signer.signer_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({SIGNER_ROLE_LABELS[signer.signer_role]})
                  </span>
                </div>
                {signed && (
                  <span className="text-xs text-gray-400">
                    {new Date(signed.signed_at).toLocaleString('ko-KR')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* 서명 버튼 */}
      {canSign && mySignerEntry && !alreadySigned && (
        <Button
          onClick={() => onSign(mySignerEntry.signer_role)}
          disabled={isSigning}
          className="w-full"
        >
          <Pen className="w-4 h-4 mr-2" />
          {isSigning ? '서명 중...' : '서명하기'}
        </Button>
      )}

      {alreadySigned && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
          <Check className="w-4 h-4" />
          이미 서명하였습니다.
        </div>
      )}

      {!canSign && !isComplete && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4" />
          현재 상태에서는 서명할 수 없습니다. 관리자 승인 후 서명 가능합니다.
        </div>
      )}
    </div>
  );
}
