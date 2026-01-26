'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, User, UserPlus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ConflictResolutionModalProps,
  ConflictResolutionAction,
  ConflictResolutionRequest,
  ExistingCoOwnerInfo,
  CoOwnerRatioAdjustment,
} from '@/app/_lib/shared/type/conflict.types';
import { fetchExistingCoOwners } from '@/app/_lib/features/member-management/api/useConflictResolutionHook';
import { supabase } from '@/app/_lib/shared/supabase/client';
import ShareRatioModal from './ShareRatioModal';

export default function ConflictResolutionModal({
  isOpen,
  onClose,
  conflict,
  pendingUserId,
  existingUserId,
  conflictedPropertyUnitId,
  onResolve,
}: ConflictResolutionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareRatioModal, setShowShareRatioModal] = useState(false);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [otherCoOwners, setOtherCoOwners] = useState<ExistingCoOwnerInfo[]>([]);
  const [isLoadingCoOwners, setIsLoadingCoOwners] = useState(false);

  // 기존 공동소유자 조회 함수
  const loadOtherCoOwners = useCallback(async () => {
    setIsLoadingCoOwners(true);
    try {
      // 물건지 정보(building_unit_id, pnu) 조회
      const { data: propertyUnit, error } = await supabase
        .from('user_property_units')
        .select('building_unit_id, pnu')
        .eq('id', conflictedPropertyUnitId)
        .single();

      if (error || !propertyUnit) {
        console.error('Failed to fetch property unit:', error);
        setOtherCoOwners([]);
        return;
      }

      // 기존+신규 외의 다른 공동소유자 조회
      const coOwners = await fetchExistingCoOwners(
        propertyUnit.building_unit_id,
        propertyUnit.pnu,
        [existingUserId, pendingUserId]
      );

      setOtherCoOwners(coOwners);
    } catch (err) {
      console.error('Failed to load co-owners:', err);
      setOtherCoOwners([]);
    } finally {
      setIsLoadingCoOwners(false);
    }
  }, [conflictedPropertyUnitId, existingUserId, pendingUserId]);

  if (!conflict) return null;

  // 액션 선택 핸들러
  const handleActionSelect = async (action: ConflictResolutionAction) => {
    if (action === 'add_co_owner') {
      // 공동 소유자의 경우 먼저 다른 공동소유자 조회 후 지분율 설정 모달 표시
      await loadOtherCoOwners();
      setShowShareRatioModal(true);
    } else if (action === 'add_proxy') {
      // 가족/대리인의 경우 관계 선택 모달 표시
      setShowRelationshipModal(true);
    } else {
      // 동일인 또는 소유권 이전은 바로 처리
      await executeAction(action);
    }
  };

  // 액션 실행
  const executeAction = async (
    action: ConflictResolutionAction,
    additionalData?: Partial<ConflictResolutionRequest>
  ) => {
    setIsSubmitting(true);
    try {
      await onResolve({
        action,
        pendingUserId,
        existingUserId,
        conflictedPropertyUnitId,
        ...additionalData,
      });
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 지분율 설정 완료 핸들러 (FEAT-012: 다른 공동소유자 지분 조정 포함)
  const handleShareRatioConfirm = async (
    existingRatio: number,
    newRatio: number,
    otherCoOwnerAdjustments?: CoOwnerRatioAdjustment[]
  ) => {
    setShowShareRatioModal(false);
    await executeAction('add_co_owner', {
      shareRatioForExisting: existingRatio,
      shareRatioForNew: newRatio,
      otherCoOwnerAdjustments,
    });
  };

  // 관계 선택 완료 핸들러
  const handleRelationshipConfirm = async (relationshipType: 'FAMILY' | 'PROXY') => {
    setShowRelationshipModal(false);
    await executeAction('add_proxy', {
      relationshipType,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              동일 물건지에 기존 사용자가 있습니다
            </DialogTitle>
          </DialogHeader>

          {/* 좌우 비교 화면 */}
          <div className="grid grid-cols-2 gap-4 my-6">
            {/* 가입 요청 정보 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                가입 요청 정보
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">이름</span>
                  <span className="font-medium text-gray-900">{conflict.pending.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">연락처</span>
                  <span className="font-medium text-gray-900">
                    {conflict.pending.phone || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">물건지</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%] break-words">
                    {conflict.pending.propertyAddress || '-'}
                  </span>
                </div>
                {(conflict.pending.dong || conflict.pending.ho) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">동/호</span>
                    <span className="font-medium text-gray-900">
                      {conflict.pending.dong && `${conflict.pending.dong}동 `}
                      {conflict.pending.ho && `${conflict.pending.ho}호`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 기존 등록 정보 */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                기존 등록 정보
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">이름</span>
                  <span className="font-medium text-gray-900">{conflict.existing.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">연락처</span>
                  <span className="font-medium text-gray-900">
                    {conflict.existing.phone || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">물건지</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%] break-words">
                    {conflict.existing.propertyAddress || '-'}
                  </span>
                </div>
                {(conflict.existing.dong || conflict.existing.ho) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">동/호</span>
                    <span className="font-medium text-gray-900">
                      {conflict.existing.dong && `${conflict.existing.dong}동 `}
                      {conflict.existing.ho && `${conflict.existing.ho}호`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 관리자 결정 영역 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-4">관리자 결정</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* 동일인입니다 */}
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-start text-left hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleActionSelect('update')}
                disabled={isSubmitting}
              >
                <span className="font-medium text-gray-900">동일인입니다</span>
                <span className="text-xs text-gray-500 mt-1">
                  정보 덮어쓰기 (개명, 전화번호 변경 등)
                </span>
              </Button>

              {/* 소유권 변경 */}
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-start text-left hover:bg-amber-50 hover:border-amber-300"
                onClick={() => handleActionSelect('transfer')}
                disabled={isSubmitting}
              >
                <span className="font-medium text-gray-900">소유권이 변경되었습니다</span>
                <span className="text-xs text-gray-500 mt-1">
                  매매로 인한 소유자 변경 (이전)
                </span>
              </Button>

              {/* 공동 소유자 */}
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-start text-left hover:bg-purple-50 hover:border-purple-300"
                onClick={() => handleActionSelect('add_co_owner')}
                disabled={isSubmitting || isLoadingCoOwners}
              >
                <span className="font-medium text-gray-900">
                  {isLoadingCoOwners ? '공동소유자 확인 중...' : '공동 소유자입니다'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  부부 공동명의 등 (추가)
                </span>
              </Button>

              {/* 가족/대리인 */}
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-start text-left hover:bg-green-50 hover:border-green-300"
                onClick={() => handleActionSelect('add_proxy')}
                disabled={isSubmitting}
              >
                <span className="font-medium text-gray-900">가족/대리인입니다</span>
                <span className="text-xs text-gray-500 mt-1">
                  고령자 대신 가족이 가입 (관계 설정)
                </span>
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
          </DialogFooter>

          {/* 로딩 오버레이 */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                처리 중...
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 지분율 설정 모달 */}
      <ShareRatioModal
        isOpen={showShareRatioModal}
        onClose={() => setShowShareRatioModal(false)}
        existingOwnerName={conflict.existing.name}
        newOwnerName={conflict.pending.name}
        onConfirm={handleShareRatioConfirm}
        otherCoOwners={otherCoOwners}
      />

      {/* 관계 선택 모달 */}
      <RelationshipTypeModal
        isOpen={showRelationshipModal}
        onClose={() => setShowRelationshipModal(false)}
        newMemberName={conflict.pending.name}
        existingOwnerName={conflict.existing.name}
        onConfirm={handleRelationshipConfirm}
      />
    </>
  );
}

// 관계 선택 모달 컴포넌트
interface RelationshipTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  newMemberName: string;
  existingOwnerName: string;
  onConfirm: (type: 'FAMILY' | 'PROXY') => void;
}

function RelationshipTypeModal({
  isOpen,
  onClose,
  newMemberName,
  existingOwnerName,
  onConfirm,
}: RelationshipTypeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>관계 유형 선택</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            <strong>{newMemberName}</strong>님은 <strong>{existingOwnerName}</strong>님의
            어떤 관계인가요?
          </p>

          <Button
            variant="outline"
            className="w-full h-auto py-4 flex flex-col items-start text-left"
            onClick={() => onConfirm('FAMILY')}
          >
            <span className="font-medium">소유주 가족</span>
            <span className="text-xs text-gray-500 mt-1">
              배우자, 자녀 등 직계가족
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-auto py-4 flex flex-col items-start text-left"
            onClick={() => onConfirm('PROXY')}
          >
            <span className="font-medium">대리인</span>
            <span className="text-xs text-gray-500 mt-1">
              법적 대리인, 위임받은 자
            </span>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
