'use client';

import React from 'react';
import {
  ASSEMBLY_TYPE_OPTIONS,
  QUORUM_TYPE_OPTIONS,
} from '../evoteConstants';
import { DateTimePicker } from '@/app/_lib/widgets/common/date-picker/DateTimePicker';
import type { EvoteCreateForm, AssemblyType, QuorumType } from '@/app/_lib/features/evote/types/evote.types';

interface StepBasicInfoProps {
  formData: EvoteCreateForm;
  updateForm: (partial: Partial<EvoteCreateForm>) => void;
}

export default function StepBasicInfo({ formData, updateForm }: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">기본 정보</h2>
        <p className="text-sm text-gray-500 mt-1">총회 유형과 일정을 설정합니다</p>
      </div>

      {/* 총회 유형 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          총회 유형 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.assemblyType}
          onChange={(e) => updateForm({ assemblyType: e.target.value as AssemblyType })}
          className="w-full h-[48px] text-[16px] rounded-[12px] border border-[#CCCCCC] bg-white px-4 outline-none focus:ring-2 focus:ring-[#5FA37C]"
        >
          {ASSEMBLY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 총회명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          총회명 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateForm({ title: e.target.value })}
          placeholder="예: 제5차 정기총회"
          className="w-full h-[48px] text-[16px] rounded-[12px] border border-[#CCCCCC] bg-white px-4 outline-none focus:ring-2 focus:ring-[#5FA37C]"
        />
      </div>

      {/* 의결요건 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          의결요건 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {QUORUM_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.quorumType === opt.value
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="quorumType"
                value={opt.value}
                checked={formData.quorumType === opt.value}
                onChange={(e) => updateForm({ quorumType: e.target.value as QuorumType })}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 총회 일시 */}
      <div>
        <DateTimePicker
          label="총회 일시 *"
          value={formData.scheduledAt ? new Date(formData.scheduledAt) : undefined}
          onChange={(date) => updateForm({ scheduledAt: date?.toISOString() ?? '' })}
          placeholder="총회 일시 선택"
          min={new Date()}
        />
      </div>

      {/* 문서 업로드 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          관련 문서 (선택)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx,.xls,.hwp"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                updateForm({ documentFiles: [...formData.documentFiles, ...Array.from(files)] });
              }
            }}
            className="hidden"
            id="evote-doc-upload"
          />
          <label htmlFor="evote-doc-upload" className="cursor-pointer">
            <p className="text-sm text-gray-500">파일을 선택하거나 드래그하세요</p>
            <p className="text-xs text-gray-400 mt-1">PDF, HWP, Word, Excel 지원</p>
          </label>
        </div>
        {formData.documentFiles.length > 0 && (
          <ul className="mt-2 space-y-1">
            {formData.documentFiles.map((file, i) => (
              <li key={i} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = formData.documentFiles.filter((_, idx) => idx !== i);
                    updateForm({ documentFiles: next });
                  }}
                  className="text-red-400 hover:text-red-600 text-xs ml-2"
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
