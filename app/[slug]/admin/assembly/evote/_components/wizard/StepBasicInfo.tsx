'use client';

import React from 'react';
import {
  ASSEMBLY_TYPE_OPTIONS,
} from '../evoteConstants';
import { DateTimePicker } from '@/app/_lib/widgets/common/date-picker/DateTimePicker';
import type { EvoteCreateForm, AssemblyType } from '@/app/_lib/features/evote/types/evote.types';

interface StepBasicInfoProps {
  formData: EvoteCreateForm;
  updateForm: (partial: Partial<EvoteCreateForm>) => void;
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.hwp'];

export default function StepBasicInfo({ formData, updateForm }: StepBasicInfoProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const addFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (validFiles.length > 0) {
      updateForm({ documentFiles: [...formData.documentFiles, ...validFiles] });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

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
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-[#5FA37C] bg-green-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx,.xls,.hwp"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
            id="evote-doc-upload"
          />
          <label htmlFor="evote-doc-upload" className="cursor-pointer">
            <p className="text-sm text-gray-500">
              {isDragging ? '여기에 놓으세요' : '파일을 선택하거나 드래그하세요'}
            </p>
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
