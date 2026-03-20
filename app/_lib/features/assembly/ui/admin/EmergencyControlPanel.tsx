'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AssemblyStatus } from '@/app/_lib/shared/type/assembly.types';
import {
  usePauseAssembly,
  useResumeAssembly,
  useExtendVoting,
  useWrittenTransition,
} from '../../api/useEmergencyControlHook';

interface EmergencyControlPanelProps {
  assemblyId: string;
  currentStatus: AssemblyStatus;
}

const EXTENSION_OPTIONS = [30, 60, 90, 120] as const;

export default function EmergencyControlPanel({ assemblyId, currentStatus }: EmergencyControlPanelProps) {
  const [pauseReason, setPauseReason] = useState('');
  const [extendMinutes, setExtendMinutes] = useState<number>(30);
  const [extendReason, setExtendReason] = useState('');
  const [writtenReason, setWrittenReason] = useState('');
  const [activeDialog, setActiveDialog] = useState<'pause' | 'extend' | 'written' | null>(null);

  const pauseMutation = usePauseAssembly(assemblyId);
  const resumeMutation = useResumeAssembly(assemblyId);
  const extendMutation = useExtendVoting(assemblyId);
  const writtenMutation = useWrittenTransition(assemblyId);

  const isVoting = currentStatus === 'VOTING';
  const isPaused = currentStatus === 'PAUSED';

  if (!isVoting && !isPaused) return null;

  const handlePause = () => {
    if (!pauseReason.trim()) return;
    pauseMutation.mutate({ reason: pauseReason }, {
      onSuccess: () => {
        setActiveDialog(null);
        setPauseReason('');
      },
    });
  };

  const handleExtend = () => {
    if (!extendReason.trim()) return;
    extendMutation.mutate({ extensionMinutes: extendMinutes, reason: extendReason }, {
      onSuccess: () => {
        setActiveDialog(null);
        setExtendReason('');
      },
    });
  };

  const handleWritten = () => {
    if (!writtenReason.trim()) return;
    writtenMutation.mutate({ reason: writtenReason }, {
      onSuccess: () => {
        setActiveDialog(null);
        setWrittenReason('');
      },
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
      <h3 className="text-sm font-bold text-gray-800">비상 제어</h3>

      <div className="flex flex-wrap gap-2">
        {isPaused && (
          <Button
            size="sm"
            variant="default"
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending}
          >
            {resumeMutation.isPending ? '처리 중...' : '재개'}
          </Button>
        )}
        {isVoting && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveDialog('pause')}
            >
              일시중지
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveDialog('extend')}
            >
              투표 연장
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setActiveDialog('written')}
            >
              서면 전환
            </Button>
          </>
        )}
      </div>

      {/* 일시중지 다이얼로그 */}
      {activeDialog === 'pause' && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
          <p className="text-xs text-orange-800 font-medium">
            일시중지 사유를 입력하세요 (감사 + 선관위원장 2인 승인 필요)
          </p>
          <textarea
            className="w-full text-sm border border-orange-300 rounded p-2 resize-none"
            rows={2}
            placeholder="사유 입력..."
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePause} disabled={pauseMutation.isPending || !pauseReason.trim()}>
              {pauseMutation.isPending ? '요청 중...' : '요청'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveDialog(null)}>취소</Button>
          </div>
        </div>
      )}

      {/* 투표 연장 다이얼로그 */}
      {activeDialog === 'extend' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-xs text-blue-800 font-medium">
            연장은 최대 120분까지 가능하며 다중 승인이 필요합니다.
          </p>
          <div className="flex gap-2 flex-wrap">
            {EXTENSION_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setExtendMinutes(min)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  extendMinutes === min
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                }`}
              >
                {min}분
              </button>
            ))}
          </div>
          <textarea
            className="w-full text-sm border border-blue-300 rounded p-2 resize-none"
            rows={2}
            placeholder="사유 입력..."
            value={extendReason}
            onChange={(e) => setExtendReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleExtend} disabled={extendMutation.isPending || !extendReason.trim()}>
              {extendMutation.isPending ? '요청 중...' : '요청'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveDialog(null)}>취소</Button>
          </div>
        </div>
      )}

      {/* 서면 전환 다이얼로그 */}
      {activeDialog === 'written' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
          <p className="text-xs text-red-800 font-medium">
            ⚠️ 서면투표 전환은 되돌릴 수 없습니다. 3인 중 2인의 승인이 필요합니다.
          </p>
          <textarea
            className="w-full text-sm border border-red-300 rounded p-2 resize-none"
            rows={2}
            placeholder="사유 입력..."
            value={writtenReason}
            onChange={(e) => setWrittenReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleWritten} disabled={writtenMutation.isPending || !writtenReason.trim()}>
              {writtenMutation.isPending ? '요청 중...' : '전환 요청'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveDialog(null)}>취소</Button>
          </div>
        </div>
      )}
    </div>
  );
}
