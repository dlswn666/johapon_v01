/**
 * 조합원 승인 충돌 해결 관련 타입 정의
 * FEAT-005: 조합원 승인 충돌 해결 기능
 */

import { OwnershipType } from './database.types';

// 충돌 해결 액션 타입
export type ConflictResolutionAction =
  | 'update'        // 동일인 - 정보 덮어쓰기
  | 'transfer'      // 소유권 이전 - 기존 소유자 ARCHIVED
  | 'add_co_owner'  // 공동 소유자 추가
  | 'add_proxy';    // 가족/대리인 추가

// 확장된 소유권 유형 (PROXY 추가)
export type ExtendedOwnershipType = OwnershipType | 'PROXY';

export const EXTENDED_OWNERSHIP_TYPE_LABELS: Record<ExtendedOwnershipType, string> = {
  OWNER: '소유주',
  CO_OWNER: '공동소유',
  FAMILY: '소유주 가족',
  PROXY: '대리인',
};

// 충돌 정보
export interface PropertyConflict {
  // 물건지 정보
  propertyUnitId: string;
  buildingUnitId: string | null;
  pnu: string | null;
  dong: string | null;
  ho: string | null;
  address: string;

  // 기존 소유자 정보
  existingOwner: {
    userId: string;
    name: string;
    phone: string | null;
    ownershipType: OwnershipType | null;
    shareRatio: number | null;
    status: string | null;
  };
}

// 충돌 검사 결과
export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: PropertyConflict[];
  pendingUser: {
    id: string;
    name: string;
    phone: string | null;
    propertyAddress: string | null;
  };
}

// 충돌 해결 요청
export interface ConflictResolutionRequest {
  action: ConflictResolutionAction;
  pendingUserId: string;        // 승인 대기 사용자 ID
  existingUserId: string;       // 기존 사용자 ID
  conflictedPropertyUnitId: string; // 충돌된 물건지 ID

  // 공동 소유 시 지분율 설정
  shareRatioForExisting?: number;  // 기존 소유자 지분율 (0-100)
  shareRatioForNew?: number;       // 신규 소유자 지분율 (0-100)

  // 가족/대리인 시 관계 설정
  relationshipType?: 'FAMILY' | 'PROXY';
}

// 충돌 해결 결과
export interface ConflictResolutionResult {
  success: boolean;
  message: string;
  resolvedUserId?: string;  // 최종 승인된 사용자 ID
}

// UI 표시용 충돌 비교 데이터
export interface ConflictComparisonData {
  pending: {
    name: string;
    phone: string | null;
    propertyAddress: string | null;
    dong: string | null;
    ho: string | null;
  };
  existing: {
    userId: string;
    name: string;
    phone: string | null;
    propertyAddress: string | null;
    dong: string | null;
    ho: string | null;
    ownershipType: OwnershipType | null;
    status: string | null;
  };
}

// 충돌 해결 모달 프롭스
export interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: ConflictComparisonData | null;
  pendingUserId: string;
  existingUserId: string;
  conflictedPropertyUnitId: string;
  onResolve: (request: ConflictResolutionRequest) => Promise<void>;
}

// 지분율 설정 모달 프롭스
export interface ShareRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingOwnerName: string;
  newOwnerName: string;
  onConfirm: (existingRatio: number, newRatio: number) => void;
}
