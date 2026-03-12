'use client';

import React, { useEffect, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly, useTransitionAssemblyStatus } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import StepWizard from '@/app/_lib/widgets/common/step-wizard/StepWizard';
import { useWizardState } from '@/app/_lib/features/assembly/api/useWizardHook';
import { useComplianceCheck } from '@/app/_lib/features/assembly/api/useComplianceHook';
import type { WizardStep } from '@/app/_lib/shared/type/assembly.types';
import { WIZARD_STEP_LABELS, WIZARD_STEP_DESCRIPTIONS } from '@/app/_lib/shared/type/assembly.types';
import WizardStep1BasicInfo, { type Step1Data } from '@/app/_lib/features/assembly/ui/wizard/WizardStep1BasicInfo';
import WizardStep2Participation, { type Step2Data } from '@/app/_lib/features/assembly/ui/wizard/WizardStep2Participation';
import WizardStep3Agendas, { type Step3Data } from '@/app/_lib/features/assembly/ui/wizard/WizardStep3Agendas';
import WizardStep4Documents from '@/app/_lib/features/assembly/ui/wizard/WizardStep4Documents';
import WizardStep5Notifications from '@/app/_lib/features/assembly/ui/wizard/WizardStep5Notifications';
import WizardStep6Compliance from '@/app/_lib/features/assembly/ui/wizard/WizardStep6Compliance';
import WizardStep7Summary from '@/app/_lib/features/assembly/ui/wizard/WizardStep7Summary';

const WIZARD_STEPS = ([1, 2, 3, 4, 5, 6, 7] as WizardStep[]).map((step) => ({
  step,
  label: WIZARD_STEP_LABELS[step],
  description: WIZARD_STEP_DESCRIPTIONS[step],
}));

export default function WizardPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly, isLoading } = useAssembly(assemblyId);
  const transitionMutation = useTransitionAssemblyStatus();

  const wizard = useWizardState(assemblyId);
  const { data: complianceResult } = useComplianceCheck(assemblyId, 'BEFORE_NOTICE');

  // 스텝 1 데이터
  const [step1Data, setStep1Data] = useState<Step1Data>({
    title: '',
    assembly_type: 'REGULAR',
    scheduled_at: '',
    venue_address: '',
    description: '',
    stream_type: '',
    zoom_meeting_id: '',
    youtube_video_id: '',
    legal_basis: '',
  });

  // 스텝 2 데이터
  const [step2Data, setStep2Data] = useState<Step2Data>({
    session_mode: 'SESSION',
    identity_verification_level: 'KAKAO_ONLY',
    channel_conflict_mode: 'LAST_WINS',
    allow_electronic: true,
    allow_written: true,
    allow_proxy: true,
    allow_onsite: true,
  });

  // 스텝 3 데이터
  const [step3Data, setStep3Data] = useState<Step3Data>({
    agendaItems: [],
  });

  // assembly 로드 시 데이터 초기화 (초기화 여부 추적)
  const initializedRef = React.useRef(false);
  useEffect(() => {
    if (assembly && !initializedRef.current) {
      initializedRef.current = true;
      const newStep1: Step1Data = {
        title: assembly.title || '',
        assembly_type: assembly.assembly_type || 'REGULAR',
        scheduled_at: assembly.scheduled_at ? assembly.scheduled_at.slice(0, 16) : '',
        venue_address: assembly.venue_address || '',
        description: assembly.description || '',
        stream_type: assembly.stream_type || '',
        zoom_meeting_id: assembly.zoom_meeting_id || '',
        youtube_video_id: assembly.youtube_video_id || '',
        legal_basis: assembly.legal_basis || '',
      };
      const updateStep1 = setStep1Data;
      const updateStep2 = setStep2Data;
      queueMicrotask(() => {
        updateStep1(newStep1);
        updateStep2((prev) => ({
          ...prev,
          session_mode: assembly.session_mode || 'SESSION',
        }));
      });
    }
  }, [assembly]);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  // 자동 저장
  useEffect(() => {
    if (wizard.currentStep === 1) wizard.autoSave(1, step1Data as unknown as Record<string, unknown>);
    if (wizard.currentStep === 2) wizard.autoSave(2, step2Data as unknown as Record<string, unknown>);
    if (wizard.currentStep === 3) wizard.autoSave(3, step3Data as unknown as Record<string, unknown>);
  }, [step1Data, step2Data, step3Data, wizard.currentStep]);

  const handleConfirm = () => {
    // DRAFT -> NOTICE_SENT 전이
    transitionMutation.mutate(
      { assemblyId, status: 'NOTICE_SENT' },
      {
        onSuccess: () => {
          router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`));
        },
      }
    );
  };

  if (isUnionLoading || isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin || !assembly) return null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">총회 생성 위자드</h1>
          <p className="text-sm text-gray-500">{assembly.title}</p>
        </div>
      </div>

      {/* 위자드 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* 사이드바 */}
        <StepWizard
          steps={WIZARD_STEPS}
          currentStep={wizard.currentStep}
          completedSteps={wizard.completedSteps as Set<number>}
          onStepClick={(step) => {
            wizard.goToStep(step as WizardStep);
          }}
          isSaving={wizard.isSaving}
        />

        {/* 콘텐츠 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {wizard.currentStep === 1 && (
            <WizardStep1BasicInfo data={step1Data} onChange={setStep1Data} />
          )}
          {wizard.currentStep === 2 && (
            <WizardStep2Participation data={step2Data} onChange={setStep2Data} />
          )}
          {wizard.currentStep === 3 && (
            <WizardStep3Agendas data={step3Data} onChange={setStep3Data} />
          )}
          {wizard.currentStep === 4 && (
            <WizardStep4Documents assemblyId={assemblyId} />
          )}
          {wizard.currentStep === 5 && (
            <WizardStep5Notifications assemblyId={assemblyId} assembly={assembly} />
          )}
          {wizard.currentStep === 6 && (
            <WizardStep6Compliance assemblyId={assemblyId} />
          )}
          {wizard.currentStep === 7 && (
            <WizardStep7Summary
              assembly={assembly}
              completedSteps={wizard.completedSteps}
              complianceResult={complianceResult}
              onConfirm={handleConfirm}
              isConfirming={transitionMutation.isPending}
            />
          )}

          {/* 네비게이션 */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={wizard.goPrev}
              disabled={wizard.currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
            {wizard.currentStep < 7 && (
              <Button onClick={wizard.goNext}>
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
