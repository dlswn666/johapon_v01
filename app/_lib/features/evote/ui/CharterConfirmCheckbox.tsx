'use client';

import React from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function CharterConfirmCheckbox({ checked, onChange }: Props) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
        />
        <div>
          <p className="text-sm font-bold text-amber-900">정관 확인 (필수)</p>
          <p className="text-xs text-amber-700 mt-1">
            본 조합의 정관에 전자투표 근거 조항이 있음을 확인합니다.
            정관에 근거 없이 전자투표를 실시하면 총회 결의가 무효가 될 수 있습니다.
          </p>
        </div>
      </label>
    </div>
  );
}
