'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';
import { VOTE_TYPE_OPTIONS, QUORUM_TYPE_OPTIONS } from '../evoteConstants';
import CandidateList from './CandidateList';
import CompanyList from './CompanyList';
import type {
  AgendaFormData,
  VoteType,
  QuorumType,
  CandidateInfo,
  CompanyInfo,
} from '@/app/_lib/features/evote/types/evote.types';

interface AgendaCardProps {
  agenda: AgendaFormData;
  index: number;
  onChange: (updated: AgendaFormData) => void;
  onRemove: () => void;
}

export default function AgendaCard({ agenda, index, onChange, onRemove }: AgendaCardProps) {
  const updateField = <K extends keyof AgendaFormData>(key: K, value: AgendaFormData[K]) => {
    onChange({ ...agenda, [key]: value });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">안건 {index + 1}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 안건 제목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          안건 제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={agenda.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="예: 사업시행계획 변경(안) 승인"
          className="w-full h-10 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
        />
      </div>

      {/* 안건 설명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">안건 설명</label>
        <textarea
          value={agenda.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="투표 화면에 표시될 설명을 입력하세요"
          rows={2}
          className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#5FA37C] resize-none"
        />
      </div>

      {/* 투표 유형 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">투표 유형</label>
        <div className="flex gap-2 flex-wrap">
          {VOTE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('voteType', opt.value as VoteType)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                agenda.voteType === opt.value
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 의결요건 오버라이드 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          의결요건 (안건별 개별 설정, 비워두면 총회 기본값)
        </label>
        <select
          value={agenda.quorumTypeOverride ?? ''}
          onChange={(e) =>
            updateField(
              'quorumTypeOverride',
              e.target.value ? (e.target.value as QuorumType) : null
            )
          }
          className="w-full h-10 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
        >
          <option value="">총회 기본 설정 따름</option>
          {QUORUM_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.description}
            </option>
          ))}
        </select>
      </div>

      {/* 선출 투표: 선출 인원 수 + 후보자 리스트 */}
      {agenda.voteType === 'ELECT' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">선출 인원 수</label>
            <input
              type="number"
              min={1}
              value={agenda.electCount ?? 1}
              onChange={(e) => updateField('electCount', parseInt(e.target.value) || 1)}
              className="w-32 h-10 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
            />
          </div>
          <CandidateList
            candidates={agenda.candidates}
            onChange={(candidates: CandidateInfo[]) => updateField('candidates', candidates)}
          />
        </>
      )}

      {/* 업체 선정: 업체 리스트 */}
      {agenda.voteType === 'SELECT' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">선정 수</label>
            <input
              type="number"
              min={1}
              value={agenda.electCount ?? 1}
              onChange={(e) => updateField('electCount', parseInt(e.target.value) || 1)}
              className="w-32 h-10 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
            />
          </div>
          <CompanyList
            companies={agenda.companies}
            onChange={(companies: CompanyInfo[]) => updateField('companies', companies)}
          />
        </>
      )}
    </div>
  );
}
