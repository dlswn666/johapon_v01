'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, Paperclip } from 'lucide-react';
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

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.hwp'];

export default function AgendaCard({ agenda, index, onChange, onRemove }: AgendaCardProps) {
  const updateField = <K extends keyof AgendaFormData>(key: K, value: AgendaFormData[K]) => {
    onChange({ ...agenda, [key]: value });
  };

  const addFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (validFiles.length > 0) {
      updateField('documentFiles', [...agenda.documentFiles, ...validFiles]);
    }
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
          의결요건 <span className="text-red-500">*</span>
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
          <option value="">의결요건을 선택하세요</option>
          {QUORUM_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.description}
            </option>
          ))}
        </select>
      </div>

      {/* 선출 투표: 후보자 리스트 */}
      {agenda.voteType === 'ELECT' && (
        <CandidateList
          candidates={agenda.candidates}
          onChange={(candidates: CandidateInfo[]) => {
            onChange({ ...agenda, candidates, electCount: candidates.length });
          }}
        />
      )}

      {/* 업체 선정: 업체 리스트 */}
      {agenda.voteType === 'SELECT' && (
        <CompanyList
          companies={agenda.companies}
          onChange={(companies: CompanyInfo[]) => {
            onChange({ ...agenda, companies, electCount: companies.length });
          }}
        />
      )}

      {/* 안건 관련 문서 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Paperclip className="w-3.5 h-3.5 inline-block mr-1" />
          관련 문서 (선택)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx,.xls,.hwp"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
            id={`agenda-doc-${agenda.id}`}
          />
          <label
            htmlFor={`agenda-doc-${agenda.id}`}
            className="cursor-pointer px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            파일 선택
          </label>
          <span className="text-xs text-gray-400">PDF, HWP, Word, Excel 지원</span>
        </div>
        {agenda.documentFiles.length > 0 && (
          <ul className="mt-2 space-y-1">
            {agenda.documentFiles.map((file, i) => (
              <li key={i} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    updateField('documentFiles', agenda.documentFiles.filter((_, idx) => idx !== i));
                  }}
                  className="text-red-400 hover:text-red-600 text-xs ml-2 flex-shrink-0"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
