'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PROXY_RELATIONSHIP_LABELS,
  PROXY_STATUS_LABELS,
  type ProxyRelationship,
} from '@/app/_lib/shared/type/assembly.types';
import {
  useMyDelegation,
  usePendingDelegationsForMe,
  useCreateDelegation,
  useAcceptDelegation,
  useRevokeDelegation,
} from '../api/useDelegationHook';

interface DelegationStateMachineUIProps {
  assemblyId: string;
  mode: 'DELEGATOR' | 'DELEGATE';
}

function DelegatorView({ assemblyId }: { assemblyId: string }) {
  const { data: delegation, isLoading } = useMyDelegation(assemblyId);
  const createMutation = useCreateDelegation(assemblyId);
  const revokeMutation = useRevokeDelegation(assemblyId);

  const [showForm, setShowForm] = useState(false);
  const [delegateName, setDelegateName] = useState('');
  const [delegatePhone, setDelegatePhone] = useState('');
  const [relationship, setRelationship] = useState<ProxyRelationship>('SPOUSE');
  const [countdown, setCountdown] = useState<string>('');

  // 남은 시간 계산
  React.useEffect(() => {
    if (!delegation?.expires_at || delegation.status !== 'pending') return;
    const update = () => {
      const diff = Math.max(0, new Date(delegation.expires_at!).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [delegation]);

  const handleCreate = () => {
    createMutation.mutate(
      { delegateName, delegatePhone, relationship },
      {
        onSuccess: () => {
          setShowForm(false);
          setDelegateName('');
          setDelegatePhone('');
        },
      }
    );
  };

  if (isLoading) return <p className="text-sm text-gray-500">로딩 중...</p>;

  // 위임 없음
  if (!delegation || delegation.status === 'expired') {
    return (
      <div className="space-y-3">
        {delegation?.status === 'expired' && (
          <p className="text-sm text-gray-500">위임이 만료되었습니다. 직접 투표해 주세요.</p>
        )}
        {!showForm ? (
          <Button size="sm" onClick={() => setShowForm(true)}>위임 만들기</Button>
        ) : (
          <div className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div>
              <label className="text-xs text-gray-600">대리인 이름</label>
              <input
                type="text"
                className="w-full mt-1 text-sm border border-gray-300 rounded px-3 py-2"
                value={delegateName}
                onChange={(e) => setDelegateName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">대리인 연락처</label>
              <input
                type="tel"
                className="w-full mt-1 text-sm border border-gray-300 rounded px-3 py-2"
                value={delegatePhone}
                onChange={(e) => setDelegatePhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">관계</label>
              <select
                className="w-full mt-1 text-sm border border-gray-300 rounded px-3 py-2"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as ProxyRelationship)}
              >
                {(Object.entries(PROXY_RELATIONSHIP_LABELS) as [ProxyRelationship, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending || !delegateName.trim()}>
                {createMutation.isPending ? '생성 중...' : '위임 생성'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const statusLabel = PROXY_STATUS_LABELS[delegation.status] ?? delegation.status;

  // PENDING
  if (delegation.status === 'pending') {
    return (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{delegation.delegate_name}</span>
          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">{statusLabel}</span>
        </div>
        {countdown && <p className="text-xs text-gray-500 font-mono">남은 시간: {countdown}</p>}
        <Button
          size="sm"
          variant="outline"
          onClick={() => revokeMutation.mutate({ delegationId: delegation.id })}
          disabled={revokeMutation.isPending}
        >
          위임 취소
        </Button>
      </div>
    );
  }

  // CONFIRMED
  if (delegation.status === 'confirmed') {
    return (
      <div className="p-4 border border-green-200 bg-green-50 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{delegation.delegate_name}</span>
          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">{statusLabel}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => revokeMutation.mutate({ delegationId: delegation.id })}
          disabled={revokeMutation.isPending}
        >
          위임 철회
        </Button>
      </div>
    );
  }

  // USED
  if (delegation.status === 'used') {
    return (
      <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{delegation.delegate_name}</span>
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{statusLabel}</span>
        </div>
      </div>
    );
  }

  // REVOKED
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">위임이 취소되었습니다.</p>
      <Button size="sm" onClick={() => setShowForm(true)}>새 위임 만들기</Button>
    </div>
  );
}

function DelegateView({ assemblyId }: { assemblyId: string }) {
  const { data: pendingList = [], isLoading } = usePendingDelegationsForMe(assemblyId);
  const acceptMutation = useAcceptDelegation(assemblyId);
  const revokeMutation = useRevokeDelegation(assemblyId);

  if (isLoading) return <p className="text-sm text-gray-500">로딩 중...</p>;

  if (pendingList.length === 0) {
    return <p className="text-sm text-gray-400">수락 대기 중인 위임 요청이 없습니다.</p>;
  }

  return (
    <ul className="space-y-3">
      {pendingList.map((d) => (
        <li key={d.id} className="p-4 border border-gray-200 rounded-lg space-y-2">
          <div>
            <p className="text-sm font-medium">{d.delegate_name}</p>
            {d.relationship && (
              <p className="text-xs text-gray-500">
                관계: {PROXY_RELATIONSHIP_LABELS[d.relationship] ?? d.relationship}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => acceptMutation.mutate({ delegationId: d.id })}
              disabled={acceptMutation.isPending}
            >
              수락
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => revokeMutation.mutate({ delegationId: d.id })}
              disabled={revokeMutation.isPending}
            >
              거절
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DelegationStateMachineUI({ assemblyId, mode }: DelegationStateMachineUIProps) {
  if (mode === 'DELEGATOR') return <DelegatorView assemblyId={assemblyId} />;
  return <DelegateView assemblyId={assemblyId} />;
}
