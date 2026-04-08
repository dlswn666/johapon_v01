'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useCreateEvote } from '@/app/_lib/features/evote/api/useCreateEvote';
import { useEvoteLocalDraft } from '@/app/_lib/features/evote/hooks/useEvoteDraft';
import { isStepValid as checkStepValid, getLegalChecks } from '@/app/_lib/features/evote/utils/evoteValidation';
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
import CharterConfirmCheckbox from '@/app/_lib/features/evote/ui/CharterConfirmCheckbox';

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
  const _router = useRouter();
  const { slug: _slug, union } = useSlug();
  const createMutation = useCreateEvote();
  const { autoSave, loadLocal, clearLocal } = useEvoteLocalDraft(union?.id);

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<EvoteCreateForm>(INITIAL_FORM);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof loadLocal>>(null);
  const [charterConfirmed, setCharterConfirmed] = useState(false);

  // 초기 로드: localStorage에 임시저장된 데이터 확인
  useEffect(() => {
    const draft = loadLocal();
    if (draft) {
      setPendingDraft(draft);
      setShowRestoreModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // formData 변경 시 자동 임시저장
  useEffect(() => {
    autoSave(formData, currentStep, completedSteps);
  }, [formData, currentStep, completedSteps, autoSave]);

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

  // 현재 스텝 유효성 (공유 유틸 사용)
  const stepValid = checkStepValid(currentStep, formData);

  // 다음 스텝
  const goNext = useCallback(() => {
    if (!checkStepValid(currentStep, formData)) return;
    markStepCompleted(currentStep);
    setCurrentStep((prev) => Math.min(5, prev + 1) as WizardStep);
  }, [currentStep, formData, markStepCompleted]);

  // 스텝 클릭 네비게이션 (완료된 스텝 + 현재 스텝만 이동 가능)
  const goToStep = useCallback((step: number) => {
    if (step > currentStep && !completedSteps.has(step)) return;
    setCurrentStep(step as WizardStep);
  }, [currentStep, completedSteps]);

  // 임시저장 복원
  const handleRestore = () => {
    if (pendingDraft) {
      setFormData({
        ...INITIAL_FORM,
        ...pendingDraft.formData,
        documentFiles: [],
        selectedVoterIds: [],
        agendas: pendingDraft.formData.agendas.map((a) => ({ ...a, documentFiles: [] })),
      });
      setCurrentStep(pendingDraft.currentStep);
      setCompletedSteps(new Set(pendingDraft.completedSteps));
    }
    setShowRestoreModal(false);
    setPendingDraft(null);
  };

  // 새로 작성
  const handleNewDraft = () => {
    clearLocal();
    setShowRestoreModal(false);
    setPendingDraft(null);
  };

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
    createMutation.mutate(newEvote, {
      onSuccess: () => {
        clearLocal();
      },
    });
  }, [formData, createMutation, clearLocal]);

  return (
    <>
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 space-y-4">
            <h3 className="font-semibold text-gray-900">작성 중인 투표가 있습니다</h3>
            <p className="text-sm text-gray-600">
              이전에 작성 중이던 전자투표가 있습니다. 이어서 작성하시겠습니까?
            </p>
            {pendingDraft?.savedAt && (
              <p className="text-xs text-gray-400">
                저장 시각: {new Date(pendingDraft.savedAt).toLocaleString('ko-KR')}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleNewDraft}>새로 작성</Button>
              <Button onClick={handleRestore}>이어서 작성</Button>
            </div>
          </div>
        </div>
      )}
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
          <>
            <StepConfirm formData={formData} />
            <div className="mt-6">
              <CharterConfirmCheckbox
                checked={charterConfirmed}
                onChange={setCharterConfirmed}
              />
            </div>
          </>
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
            <Button className="min-h-[44px]" onClick={goNext} disabled={!stepValid}>
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="min-h-[44px]"
              onClick={handleCreate}
              disabled={createMutation.isPending || !getLegalChecks(formData).allPassed || !charterConfirmed}
            >
              {createMutation.isPending ? '생성 중...' : '전자투표 생성'}
            </Button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
