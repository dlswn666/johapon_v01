'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useCreateEvote } from '@/app/_lib/features/evote/api/useCreateEvote';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StepWizard from '@/app/_lib/widgets/common/step-wizard/StepWizard';
import { WIZARD_STEPS } from '../evoteConstants';
import type {
  WizardStep,
  EvoteCreateForm,
  AgendaFormData,
} from '@/app/_lib/features/evote/types/evote.types';
import StepBasicInfo from './StepBasicInfo';
import StepAgendas from './StepAgendas';
import StepVoters from './StepVoters';
import StepSchedule from './StepSchedule';
import StepConfirm from './StepConfirm';

/** 위저드 초기 폼 데이터 */
const INITIAL_FORM: EvoteCreateForm = {
  assemblyType: 'REGULAR',
  title: '',
  quorumType: 'GENERAL',
  scheduledAt: '',
  documentFiles: [],
  agendas: [],
  voterFilter: 'ALL',
  selectedVoterIds: [],
  publishMode: 'IMMEDIATE',
  publishAt: '',
  preVoteStartAt: '',
  preVoteEndAt: '',
  finalDeadline: '',
  autoReminder: true,
  notificationChannels: ['KAKAO_ALIMTALK'],
};

export default function EvoteWizard() {
  const router = useRouter();
  const { slug } = useSlug();
  const createMutation = useCreateEvote();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<EvoteCreateForm>(INITIAL_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 폼 데이터 부분 업데이트
  const updateForm = useCallback((partial: Partial<EvoteCreateForm>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  }, []);

  // 스텝 완료 마킹
  const markStepCompleted = useCallback((step: WizardStep) => {
    setCompletedSteps((prev) => new Set(prev).add(step));
  }, []);

  // 이전 스텝
  const goPrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep);
  }, []);

  // 스텝별 유효성 검증
  const validateCurrentStep = useCallback((): boolean => {
    setValidationError(null);
    switch (currentStep) {
      case 1:
        if (!formData.title.trim() || !formData.scheduledAt) {
          setValidationError('총회명과 일시를 입력해주세요.');
          return false;
        }
        return true;
      case 2:
        if (formData.agendas.length === 0) {
          setValidationError('최소 1개 이상의 안건을 등록해주세요.');
          return false;
        }
        for (const agenda of formData.agendas) {
          if (!agenda.title.trim()) {
            setValidationError('안건 제목을 입력해주세요.');
            return false;
          }
          if (agenda.voteType === 'ELECT' && agenda.candidates.length === 0) {
            setValidationError(`"${agenda.title}" 안건에 후보자를 1명 이상 등록해주세요.`);
            return false;
          }
          if (agenda.voteType === 'SELECT' && agenda.companies.length === 0) {
            setValidationError(`"${agenda.title}" 안건에 업체를 1개 이상 등록해주세요.`);
            return false;
          }
        }
        return true;
      case 3:
        if (formData.selectedVoterIds.length === 0) {
          setValidationError('투표 대상자를 1명 이상 선택해주세요.');
          return false;
        }
        return true;
      case 4:
        // 선택 항목이므로 검증 없음
        return true;
      default:
        return true;
    }
  }, [currentStep, formData]);

  // 다음 스텝
  const goNext = useCallback(() => {
    if (!validateCurrentStep()) return;
    markStepCompleted(currentStep);
    setValidationError(null);
    setCurrentStep((prev) => Math.min(5, prev + 1) as WizardStep);
  }, [currentStep, markStepCompleted, validateCurrentStep]);

  // 스텝 클릭 네비게이션 (완료된 스텝 + 현재 스텝만 이동 가능)
  const goToStep = useCallback((step: number) => {
    if (step > currentStep && !completedSteps.has(step)) return;
    setCurrentStep(step as WizardStep);
  }, [currentStep, completedSteps]);

  // 최종 생성
  const handleCreate = useCallback(() => {
    const newEvote = {
      title: formData.title,
      description: null,
      evote_type: 'APPROVAL' as const,
      start_at: formData.preVoteStartAt || null,
      end_at: formData.finalDeadline || null,
      quorum_required: null,
      items: formData.agendas.map((a: AgendaFormData, i: number) => ({
        title: a.title,
        description: a.description || null,
        item_type: 'YES_NO' as const,
        options: a.voteType === 'APPROVE'
          ? ['찬성', '반대', '기권']
          : a.voteType === 'ELECT'
            ? a.candidates.map((c) => c.name)
            : a.companies.map((c) => c.name),
        sort_order: i + 1,
      })),
    };
    createMutation.mutate(newEvote);
  }, [formData, createMutation]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {/* 좌측 스텝 네비게이션 */}
      <StepWizard
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* 우측 폼 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {currentStep === 1 && (
          <StepBasicInfo formData={formData} updateForm={updateForm} />
        )}
        {currentStep === 2 && (
          <StepAgendas formData={formData} updateForm={updateForm} />
        )}
        {currentStep === 3 && (
          <StepVoters formData={formData} updateForm={updateForm} />
        )}
        {currentStep === 4 && (
          <StepSchedule formData={formData} updateForm={updateForm} />
        )}
        {currentStep === 5 && (
          <StepConfirm formData={formData} />
        )}

        {/* 유효성 검증 오류 */}
        {validationError && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {validationError}
          </div>
        )}

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={goPrev}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전
          </Button>

          {currentStep < 5 ? (
            <Button className="min-h-[44px]" onClick={goNext}>
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="min-h-[44px]"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '생성 중...' : '전자투표 생성'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
