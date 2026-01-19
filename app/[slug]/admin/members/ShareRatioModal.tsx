'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShareRatioModalProps } from '@/app/_lib/shared/type/conflict.types';

export default function ShareRatioModal({
  isOpen,
  onClose,
  existingOwnerName,
  newOwnerName,
  onConfirm,
}: ShareRatioModalProps) {
  const [existingRatio, setExistingRatio] = useState(50);
  const newRatio = 100 - existingRatio;

  // 빠른 선택 옵션
  const quickOptions = [
    { existing: 50, new: 50, label: '50:50' },
    { existing: 60, new: 40, label: '60:40' },
    { existing: 70, new: 30, label: '70:30' },
    { existing: 80, new: 20, label: '80:20' },
  ];

  const handleExistingRatioChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.min(100, Math.max(0, numValue));
    setExistingRatio(clampedValue);
  };

  const handleConfirm = () => {
    onConfirm(existingRatio, newRatio);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>지분율 설정</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <p className="text-sm text-gray-600">
            공동 소유자의 지분율을 설정해주세요. 합계는 100%가 되어야 합니다.
          </p>

          {/* 빠른 선택 버튼 */}
          <div className="flex gap-2 flex-wrap">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                variant={existingRatio === option.existing ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExistingRatio(option.existing)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* 지분율 입력 */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기존 소유자
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={existingRatio}
                  onChange={(e) => handleExistingRatioChange(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                신규 소유자
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={newRatio}
                  disabled
                  className="pr-8 bg-gray-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* 지분율 표시 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">기존 소유자</p>
              <p className="font-medium text-gray-900 truncate">{existingOwnerName}</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{existingRatio}%</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">신규 소유자</p>
              <p className="font-medium text-gray-900 truncate">{newOwnerName}</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{newRatio}%</p>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              지분율은 의결권 행사 및 수익 분배 시 적용됩니다.
              정확한 지분율은 등기부등본을 확인해주세요.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleConfirm}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
