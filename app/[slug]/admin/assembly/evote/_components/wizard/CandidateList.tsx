'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { CandidateInfo } from '@/app/_lib/features/evote/types/evote.types';

interface CandidateListProps {
  candidates: CandidateInfo[];
  onChange: (candidates: CandidateInfo[]) => void;
}

export default function CandidateList({ candidates, onChange }: CandidateListProps) {
  const addCandidate = () => {
    onChange([{ name: '', info: '' }, ...candidates]);
  };

  const removeCandidate = (index: number) => {
    onChange(candidates.filter((_, i) => i !== index));
  };

  const updateCandidate = (index: number, field: keyof CandidateInfo, value: string) => {
    const updated = candidates.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">후보자 목록</label>
        <Button type="button" variant="outline" size="sm" onClick={addCandidate}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          후보 추가
        </Button>
      </div>

      {candidates.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
          후보자를 추가해주세요
        </p>
      )}

      {candidates.map((candidate, i) => (
        <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={candidate.name}
              onChange={(e) => updateCandidate(i, 'name', e.target.value)}
              placeholder="후보자명"
              className="w-full h-9 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
            />
            <input
              type="text"
              value={candidate.info}
              onChange={(e) => updateCandidate(i, 'info', e.target.value)}
              placeholder="한줄 소개 (예: 現 감사 / 구역 대표)"
              className="w-full h-9 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
            />
          </div>
          <button
            type="button"
            onClick={() => removeCandidate(i)}
            className="mt-1 text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
