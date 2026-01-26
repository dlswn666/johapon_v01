'use client';

import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Users, Calculator, Edit3 } from 'lucide-react';
import {
  ShareRatioModalProps,
  RatioAdjustmentMode,
  CoOwnerRatioAdjustment,
} from '@/app/_lib/shared/type/conflict.types';

export default function ShareRatioModal({
  isOpen,
  onClose,
  existingOwnerName,
  newOwnerName,
  onConfirm,
  otherCoOwners = [],
}: ShareRatioModalProps) {
  const [existingRatio, setExistingRatio] = useState(50);
  const [newRatio, setNewRatio] = useState(50);

  // FEAT-012: 지분 조정 방식 상태 (다른 공동소유자가 있을 때만 사용)
  const [adjustmentMode, setAdjustmentMode] = useState<RatioAdjustmentMode>('proportional');

  // FEAT-012: 다른 공동소유자들의 조정된 지분율 (수동 모드용)
  const [otherCoOwnerRatios, setOtherCoOwnerRatios] = useState<Record<string, number>>({});

  // 다른 공동소유자가 있는지 여부
  const hasOtherCoOwners = otherCoOwners.length > 0;

  // 다른 공동소유자들의 원래 지분율 합계
  const originalOtherTotal = useMemo(() => {
    return otherCoOwners.reduce((sum, owner) => sum + owner.landOwnershipRatio, 0);
  }, [otherCoOwners]);

  // 지분 조정 방식에 따른 계산 (useCallback으로 선언 순서 문제 해결)
  const calculateAdjustedRatios = useCallback((
    newOwnerRatio: number,
    mode: RatioAdjustmentMode,
    currentExistingRatio?: number,
    currentOtherRatios?: Record<string, number>
  ): { existingRatio: number; otherRatios: Record<string, number> } => {
    if (!hasOtherCoOwners) {
      return {
        existingRatio: 100 - newOwnerRatio,
        otherRatios: {},
      };
    }

    // 전체 기존 소유자들의 원래 지분 합계 (existingOwner 포함)
    // existingOwner의 원래 지분 = 100 - originalOtherTotal (다른 공동소유자 합계 제외)
    const existingOwnerOriginalRatio = 100 - originalOtherTotal;
    const totalOriginalRatio = 100; // 전체

    // 신규 소유자에게 할당할 지분을 기존 소유자들에서 차감
    const totalDeduction = newOwnerRatio;

    const otherRatios: Record<string, number> = {};

    if (mode === 'equal') {
      // 균등 배분: 모든 기존 소유자에서 균등하게 차감
      const totalOwners = otherCoOwners.length + 1; // 다른 공동소유자 + 기존 소유자
      const deductionPerOwner = totalDeduction / totalOwners;

      // 기존 소유자 (existingOwner)
      const adjustedExisting = Math.max(0, existingOwnerOriginalRatio - deductionPerOwner);

      // 다른 공동소유자들
      otherCoOwners.forEach((owner) => {
        otherRatios[owner.userId] = Math.max(0, owner.landOwnershipRatio - deductionPerOwner);
      });

      return { existingRatio: Math.round(adjustedExisting * 10) / 10, otherRatios };
    } else if (mode === 'proportional') {
      // 비율 배분: 기존 지분 비율에 따라 차감
      // 기존 소유자 (existingOwner)
      const existingDeduction = (existingOwnerOriginalRatio / totalOriginalRatio) * totalDeduction;
      const adjustedExisting = Math.max(0, existingOwnerOriginalRatio - existingDeduction);

      // 다른 공동소유자들
      otherCoOwners.forEach((owner) => {
        const ownerDeduction = (owner.landOwnershipRatio / totalOriginalRatio) * totalDeduction;
        otherRatios[owner.userId] = Math.max(0, Math.round((owner.landOwnershipRatio - ownerDeduction) * 10) / 10);
      });

      return { existingRatio: Math.round(adjustedExisting * 10) / 10, otherRatios };
    } else {
      // 수동 모드: 현재 값 유지 (파라미터로 전달받은 값 사용)
      return {
        existingRatio: currentExistingRatio ?? 50,
        otherRatios: currentOtherRatios ?? {},
      };
    }
  }, [hasOtherCoOwners, originalOtherTotal, otherCoOwners]);

  // 초기화 함수
  const initializeState = useCallback(() => {
    // 다른 공동소유자가 있으면 그들의 지분을 고려하여 초기값 설정
    if (hasOtherCoOwners) {
      const availableForNew = Math.min(50, 100 - originalOtherTotal);
      const calculatedRatios = calculateAdjustedRatios(availableForNew, 'proportional');
      setExistingRatio(calculatedRatios.existingRatio);
      setNewRatio(availableForNew);
      setOtherCoOwnerRatios(calculatedRatios.otherRatios);
    } else {
      setExistingRatio(50);
      setNewRatio(50);
    }
    setAdjustmentMode('proportional');
  }, [hasOtherCoOwners, originalOtherTotal, calculateAdjustedRatios]);

  // 현재 다른 공동소유자들의 조정된 지분 합계 (자동/수동 모드에 따라)
  const adjustedOtherTotal = useMemo(() => {
    if (!hasOtherCoOwners) return 0;

    if (adjustmentMode === 'manual') {
      return Object.values(otherCoOwnerRatios).reduce((sum, ratio) => sum + ratio, 0);
    } else {
      const calculated = calculateAdjustedRatios(newRatio, adjustmentMode);
      return Object.values(calculated.otherRatios).reduce((sum, ratio) => sum + ratio, 0);
    }
  }, [hasOtherCoOwners, adjustmentMode, otherCoOwnerRatios, newRatio, calculateAdjustedRatios]);

  // 전체 지분율 합계
  const totalRatio = useMemo(() => {
    if (adjustmentMode === 'manual') {
      return existingRatio + newRatio + adjustedOtherTotal;
    } else {
      // 자동 계산 모드에서는 항상 100%가 되어야 함
      return existingRatio + newRatio + adjustedOtherTotal;
    }
  }, [existingRatio, newRatio, adjustedOtherTotal, adjustmentMode]);

  // 지분율 초과 여부
  const isExceeded = totalRatio > 100;
  const isUnder = totalRatio < 100;

  // 신규 지분율 변경 핸들러
  const handleNewRatioChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.min(100, Math.max(0, numValue));
    setNewRatio(clampedValue);

    if (adjustmentMode !== 'manual') {
      // 자동 모드: 기존 소유자들의 지분 자동 조정
      const calculated = calculateAdjustedRatios(clampedValue, adjustmentMode);
      setExistingRatio(calculated.existingRatio);
      setOtherCoOwnerRatios(calculated.otherRatios);
    }
  };

  // 기존 소유자 지분율 변경 핸들러 (수동 모드에서만 사용)
  const handleExistingRatioChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setExistingRatio(Math.min(100, Math.max(0, numValue)));
  };

  // 다른 공동소유자 지분율 변경 핸들러 (수동 모드)
  const handleOtherCoOwnerRatioChange = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setOtherCoOwnerRatios((prev) => ({
      ...prev,
      [userId]: Math.min(100, Math.max(0, numValue)),
    }));
  };

  // 지분 조정 방식 변경 핸들러
  const handleAdjustmentModeChange = (mode: RatioAdjustmentMode) => {
    setAdjustmentMode(mode);

    if (mode !== 'manual') {
      // 자동 모드로 전환 시 재계산
      const calculated = calculateAdjustedRatios(newRatio, mode);
      setExistingRatio(calculated.existingRatio);
      setOtherCoOwnerRatios(calculated.otherRatios);
    } else {
      // 수동 모드로 전환 시 현재 자동 계산된 값을 초기값으로 설정
      const calculated = calculateAdjustedRatios(newRatio, adjustmentMode);
      setOtherCoOwnerRatios(calculated.otherRatios);
    }
  };

  // 빠른 선택 옵션
  const quickOptions = useMemo(() => {
    const options = [
      { newRatio: 10, label: '10%' },
      { newRatio: 20, label: '20%' },
      { newRatio: 30, label: '30%' },
      { newRatio: 50, label: '50%' },
    ];
    return options;
  }, []);

  const handleQuickSelect = (newVal: number) => {
    setNewRatio(newVal);
    if (adjustmentMode !== 'manual') {
      const calculated = calculateAdjustedRatios(newVal, adjustmentMode);
      setExistingRatio(calculated.existingRatio);
      setOtherCoOwnerRatios(calculated.otherRatios);
    }
  };

  // 확인 핸들러
  const handleConfirm = () => {
    if (isExceeded) return;

    // FEAT-012: 다른 공동소유자들의 지분 조정 정보 생성
    let adjustments: CoOwnerRatioAdjustment[] | undefined;

    if (hasOtherCoOwners) {
      const finalRatios = adjustmentMode === 'manual'
        ? otherCoOwnerRatios
        : calculateAdjustedRatios(newRatio, adjustmentMode).otherRatios;

      adjustments = otherCoOwners.map((owner) => ({
        userId: owner.userId,
        name: owner.name,
        previousRatio: owner.landOwnershipRatio,
        newRatio: finalRatios[owner.userId] ?? owner.landOwnershipRatio,
      }));
    }

    onConfirm(existingRatio, newRatio, adjustments);
  };

  // 모달 열기/닫기 핸들러
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // 모달 열릴 때 초기화
      initializeState();
    } else {
      // 모달 닫을 때
      onClose();
    }
  };

  // 취소 버튼 클릭 핸들러
  const handleClose = () => {
    onClose();
  };

  // 현재 표시할 다른 공동소유자들의 지분 (자동/수동에 따라)
  const displayOtherRatios = useMemo(() => {
    if (!hasOtherCoOwners) return {};

    if (adjustmentMode === 'manual') {
      return otherCoOwnerRatios;
    } else {
      return calculateAdjustedRatios(newRatio, adjustmentMode).otherRatios;
    }
  }, [hasOtherCoOwners, adjustmentMode, otherCoOwnerRatios, newRatio, calculateAdjustedRatios]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>지분율 설정</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <p className="text-sm text-gray-600">
            공동 소유자의 지분율을 설정해주세요.
            {hasOtherCoOwners && (
              <span className="font-medium text-amber-700">
                {' '}다른 공동소유자({otherCoOwners.length}명)의 지분율도 함께 조정됩니다.
              </span>
            )}
          </p>

          {/* FEAT-012: 지분 조정 방식 선택 (다른 공동소유자가 있을 때만) */}
          {hasOtherCoOwners && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">지분 조정 방식</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustmentModeChange('proportional')}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                    adjustmentMode === 'proportional'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Calculator className="w-5 h-5 mb-1 text-gray-600" />
                  <span className="text-xs font-medium">비율 배분</span>
                  <span className="text-[10px] text-gray-500 mt-1">기존 비율대로</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustmentModeChange('equal')}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                    adjustmentMode === 'equal'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-5 h-5 mb-1 text-gray-600" />
                  <span className="text-xs font-medium">균등 배분</span>
                  <span className="text-[10px] text-gray-500 mt-1">동일하게 차감</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustmentModeChange('manual')}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                    adjustmentMode === 'manual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Edit3 className="w-5 h-5 mb-1 text-gray-600" />
                  <span className="text-xs font-medium">수동 입력</span>
                  <span className="text-[10px] text-gray-500 mt-1">직접 설정</span>
                </button>
              </div>
            </div>
          )}

          {/* 신규 소유자 지분 빠른 선택 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">신규 소유자 지분 빠른 선택</p>
            <div className="flex gap-2 flex-wrap">
              {quickOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={newRatio === option.newRatio ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickSelect(option.newRatio)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 신규 소유자 지분 입력 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">신규 소유자</span>
              <span className="text-sm text-gray-600">{newOwnerName}</span>
            </div>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={newRatio}
                onChange={(e) => handleNewRatioChange(e.target.value)}
                className="pr-8 text-lg font-bold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                %
              </span>
            </div>
          </div>

          {/* 기존 소유자 지분 (자동 계산 또는 수동 입력) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">기존 소유자</span>
              <span className="text-sm text-gray-600">{existingOwnerName}</span>
            </div>
            {adjustmentMode === 'manual' ? (
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={existingRatio}
                  onChange={(e) => handleExistingRatioChange(e.target.value)}
                  className="pr-8 text-lg font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-900">
                {existingRatio}%
                {hasOtherCoOwners && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (자동 계산)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 다른 공동소유자들의 지분 (FEAT-012) */}
          {hasOtherCoOwners && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  다른 공동소유자 ({otherCoOwners.length}명)
                </span>
              </div>
              <div className="space-y-3">
                {otherCoOwners.map((owner) => {
                  const displayRatio = displayOtherRatios[owner.userId] ?? owner.landOwnershipRatio;
                  const ratioChanged = displayRatio !== owner.landOwnershipRatio;

                  return (
                    <div key={owner.userId} className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-sm text-gray-700">{owner.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          (기존: {owner.landOwnershipRatio}%)
                        </span>
                      </div>
                      {adjustmentMode === 'manual' ? (
                        <div className="relative w-24">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={otherCoOwnerRatios[owner.userId] ?? owner.landOwnershipRatio}
                            onChange={(e) => handleOtherCoOwnerRatioChange(owner.userId, e.target.value)}
                            className="pr-6 text-sm"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${ratioChanged ? 'text-amber-600' : 'text-gray-900'}`}>
                            {displayRatio.toFixed(1)}%
                          </span>
                          {ratioChanged && (
                            <span className="text-xs text-red-500">
                              ({(displayRatio - owner.landOwnershipRatio).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 합계 표시 */}
          <div
            className={`rounded-lg p-4 ${
              isExceeded || isUnder
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">전체 지분율 합계</span>
              <span
                className={`text-xl font-bold ${
                  isExceeded || isUnder ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {totalRatio.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              신규 {newRatio}% + 기존 {existingRatio}%
              {hasOtherCoOwners && ` + 다른 공동소유자 ${adjustedOtherTotal.toFixed(1)}%`}
            </div>
          </div>

          {/* 경고/안내 메시지 */}
          {isExceeded && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">
                지분율 합계가 100%를 초과합니다. 지분율을 조정해주세요.
              </p>
            </div>
          )}

          {isUnder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                지분율 합계가 100%가 되지 않습니다. 지분율을 조정해주세요.
              </p>
            </div>
          )}

          {!isExceeded && !isUnder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                지분율은 의결권 행사 및 수익 분배 시 적용됩니다. 정확한 지분율은
                등기부등본을 확인해주세요.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isExceeded || isUnder}
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
