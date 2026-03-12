'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ASSEMBLY_TYPE_LABELS,
  AssemblyType,
  StreamType,
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
}

interface WizardStep1Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
}

export default function WizardStep1BasicInfo({ data, onChange }: WizardStep1Props) {
  const update = (field: keyof Step1Data, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
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
            onChange={(e) => update('assembly_type', e.target.value)}
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
            onChange={(e) => update('stream_type', e.target.value)}
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
  );
}

export type { Step1Data };
