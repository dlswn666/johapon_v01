'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import InfoCard from '@/app/_lib/widgets/common/InfoCard';
import type {
  SessionMode,
  IdentityVerificationLevel,
  ChannelConflictMode,
} from '@/app/_lib/shared/type/assembly.types';

interface Step2Data {
  session_mode: SessionMode;
  identity_verification_level: IdentityVerificationLevel;
  channel_conflict_mode: ChannelConflictMode;
  allow_electronic: boolean;
  allow_written: boolean;
  allow_proxy: boolean;
  allow_onsite: boolean;
}

interface WizardStep2Props {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
}

export default function WizardStep2Participation({ data, onChange }: WizardStep2Props) {
  const update = <K extends keyof Step2Data>(field: K, value: Step2Data[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">참여 방식</h2>

      {/* 세션 모드 */}
      <div>
        <Label>세션 모드</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => update('session_mode', 'SESSION')}
            className={`p-3 rounded-lg border text-left text-sm ${
              data.session_mode === 'SESSION'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium">세션 모드</p>
            <p className="text-xs mt-1 opacity-70">실시간 출석/세션 관리</p>
          </button>
          <button
            onClick={() => update('session_mode', 'LEGACY')}
            className={`p-3 rounded-lg border text-left text-sm ${
              data.session_mode === 'LEGACY'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium">레거시 모드</p>
            <p className="text-xs mt-1 opacity-70">기존 방식</p>
          </button>
        </div>
      </div>

      {/* 본인인증 수준 */}
      <div>
        <Label>본인인증 수준</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => update('identity_verification_level', 'KAKAO_ONLY')}
            className={`p-3 rounded-lg border text-left text-sm ${
              data.identity_verification_level === 'KAKAO_ONLY'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium">카카오 로그인</p>
            <p className="text-xs mt-1 opacity-70">카카오 계정으로 본인 확인</p>
          </button>
          <button
            onClick={() => update('identity_verification_level', 'PASS_REQUIRED')}
            className={`p-3 rounded-lg border text-left text-sm ${
              data.identity_verification_level === 'PASS_REQUIRED'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium">PASS 인증</p>
            <p className="text-xs mt-1 opacity-70">PASS 본인인증 필수</p>
          </button>
        </div>
      </div>

      {/* 채널 충돌 모드 */}
      <div>
        <Label>채널 충돌 해결</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => update('channel_conflict_mode', 'LAST_WINS')}
            className={`p-3 rounded-lg border text-left text-sm ${
              data.channel_conflict_mode === 'LAST_WINS'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium">후행 우선</p>
            <p className="text-xs mt-1 opacity-70">마지막 투표가 유효</p>
          </button>
          <button
            onClick={() => update('channel_conflict_mode', 'FIRST_LOCKS')}
            className={`p-3 rounded-lg border text-left text-sm ${
              data.channel_conflict_mode === 'FIRST_LOCKS'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium">선행 잠금</p>
            <p className="text-xs mt-1 opacity-70">첫 투표가 확정</p>
          </button>
        </div>
      </div>

      {/* 투표 채널 */}
      <div>
        <Label>허용 투표 채널</Label>
        <div className="mt-2 space-y-3">
          {[
            { key: 'allow_electronic' as const, label: '전자투표', desc: '온라인 투표' },
            { key: 'allow_written' as const, label: '서면투표', desc: '우편/팩스 서면 투표' },
            { key: 'allow_proxy' as const, label: '대리투표', desc: '위임장 기반 대리 투표' },
            { key: 'allow_onsite' as const, label: '현장투표', desc: '현장 직접 투표' },
          ].map((ch) => (
            <div key={ch.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{ch.label}</p>
                <p className="text-xs text-gray-500">{ch.desc}</p>
              </div>
              <Switch
                checked={data[ch.key]}
                onCheckedChange={(checked) => update(ch.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {data.identity_verification_level === 'KAKAO_ONLY' && (
        <InfoCard title="본인인증 안내" variant="warning">
          카카오 로그인은 간편하지만 법적 증거력이 제한될 수 있습니다. PASS 인증 사용을 권장합니다.
        </InfoCard>
      )}
    </div>
  );
}

export type { Step2Data };
