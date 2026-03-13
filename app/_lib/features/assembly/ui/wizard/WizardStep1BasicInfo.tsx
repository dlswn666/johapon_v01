'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import InfoCard from '@/app/_lib/widgets/common/InfoCard';
import {
  ASSEMBLY_TYPE_LABELS,
  AssemblyType,
  StreamType,
} from '@/app/_lib/shared/type/assembly.types';
import type {
  SessionMode,
  IdentityVerificationLevel,
  ChannelConflictMode,
} from '@/app/_lib/shared/type/assembly.types';

interface Step1Data {
  title: string;
  assembly_type: AssemblyType;
  scheduled_at: string;
  venue_address: string;
  description: string;
  stream_type: StreamType | '';
  zoom_meeting_id: string;
  youtube_video_id: string;
  legal_basis: string;
  session_mode: SessionMode;
  identity_verification_level: IdentityVerificationLevel;
  channel_conflict_mode: ChannelConflictMode;
  allow_electronic: boolean;
  allow_written: boolean;
  allow_proxy: boolean;
  allow_onsite: boolean;
}

interface WizardStep1Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
}

export default function WizardStep1BasicInfo({ data, onChange }: WizardStep1Props) {
  const update = <K extends keyof Step1Data>(field: K, value: Step1Data[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-8">
      {/* ────────── 기본 정보 섹션 ────────── */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>

        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <Label htmlFor="title">총회 제목 *</Label>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="예: 제12차 정기총회"
              className="mt-1"
            />
          </div>

          {/* 유형 */}
          <div>
            <Label htmlFor="assembly_type">총회 유형 *</Label>
            <select
              id="assembly_type"
              value={data.assembly_type}
              onChange={(e) => update('assembly_type', e.target.value as AssemblyType)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {(Object.entries(ASSEMBLY_TYPE_LABELS) as [AssemblyType, string][]).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 일시 */}
          <div>
            <Label htmlFor="scheduled_at">총회 일시 *</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={data.scheduled_at}
              onChange={(e) => update('scheduled_at', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* 장소 */}
          <div>
            <Label htmlFor="venue_address">장소</Label>
            <Input
              id="venue_address"
              value={data.venue_address}
              onChange={(e) => update('venue_address', e.target.value)}
              placeholder="예: 서울시 강남구 테헤란로 123 대회의실"
              className="mt-1"
            />
          </div>

          {/* 영상 송출 */}
          <div>
            <Label htmlFor="stream_type">영상 송출</Label>
            <select
              id="stream_type"
              value={data.stream_type}
              onChange={(e) => update('stream_type', e.target.value as StreamType | '')}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">미설정</option>
              <option value="ZOOM">Zoom</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="BOTH">Zoom + YouTube</option>
              <option value="NONE">없음</option>
            </select>
          </div>

          {/* Zoom / YouTube ID */}
          {(data.stream_type === 'ZOOM' || data.stream_type === 'BOTH') && (
            <div>
              <Label htmlFor="zoom_meeting_id">Zoom 미팅 ID</Label>
              <Input
                id="zoom_meeting_id"
                value={data.zoom_meeting_id}
                onChange={(e) => update('zoom_meeting_id', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          {(data.stream_type === 'YOUTUBE' || data.stream_type === 'BOTH') && (
            <div>
              <Label htmlFor="youtube_video_id">YouTube 영상 ID</Label>
              <Input
                id="youtube_video_id"
                value={data.youtube_video_id}
                onChange={(e) => update('youtube_video_id', e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {/* 법적 근거 */}
          <div>
            <Label htmlFor="legal_basis">법적 근거</Label>
            <Input
              id="legal_basis"
              value={data.legal_basis}
              onChange={(e) => update('legal_basis', e.target.value)}
              placeholder="예: 도시정비법 제45조"
              className="mt-1"
            />
          </div>

          {/* 설명 */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="총회 안내 사항을 입력하세요"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* ────────── 참여 방식 섹션 ────────── */}
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
    </div>
  );
}

export type { Step1Data };
