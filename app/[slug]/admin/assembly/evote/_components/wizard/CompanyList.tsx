'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { CompanyInfo } from '@/app/_lib/features/evote/types/evote.types';

interface CompanyListProps {
  companies: CompanyInfo[];
  onChange: (companies: CompanyInfo[]) => void;
}

export default function CompanyList({ companies, onChange }: CompanyListProps) {
  const addCompany = () => {
    onChange([...companies, { name: '', bidAmount: '', info: '' }]);
  };

  const removeCompany = (index: number) => {
    onChange(companies.filter((_, i) => i !== index));
  };

  const updateCompany = (index: number, field: keyof CompanyInfo, value: string) => {
    const updated = companies.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">업체 목록</label>
        <Button type="button" variant="outline" size="sm" onClick={addCompany}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          업체 추가
        </Button>
      </div>

      {companies.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
          업체를 추가해주세요
        </p>
      )}

      {companies.map((company, i) => (
        <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={company.name}
              onChange={(e) => updateCompany(i, 'name', e.target.value)}
              placeholder="업체명"
              className="w-full h-9 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={company.bidAmount}
                onChange={(e) => updateCompany(i, 'bidAmount', e.target.value)}
                placeholder="입찰금액 (예: 1,200억)"
                className="flex-1 h-9 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
              />
              <input
                type="text"
                value={company.info}
                onChange={(e) => updateCompany(i, 'info', e.target.value)}
                placeholder="비고 (예: 시공실적 42건)"
                className="flex-1 h-9 text-sm rounded-lg border border-gray-300 bg-white px-3 outline-none focus:ring-2 focus:ring-[#5FA37C]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeCompany(i)}
            className="mt-1 text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
