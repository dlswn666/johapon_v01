import type { EvoteCreateForm, AgendaFormData } from '../types/evote.types';

/** 안건 하나의 유효성 검증 */
function isAgendaValid(agenda: AgendaFormData): boolean {
  if (!agenda.title.trim()) return false;
  if (!agenda.description.trim()) return false;
  if (!agenda.quorumTypeOverride) return false;

  if (agenda.voteType === 'ELECT') {
    if (agenda.candidates.length === 0) return false;
    if (!agenda.candidates.every((c) => c.name.trim() && c.info.trim())) return false;
  }
  if (agenda.voteType === 'SELECT') {
    if (agenda.companies.length === 0) return false;
    if (!agenda.companies.every((c) => c.name.trim() && c.bidAmount && c.info.trim())) return false;
  }
  return true;
}

/** 스텝별 유효성 검증 */
export function isStepValid(step: number, formData: EvoteCreateForm): boolean {
  switch (step) {
    case 1:
      return !!(formData.title.trim() && formData.scheduledAt);
    case 2:
      return formData.agendas.length > 0 && formData.agendas.every(isAgendaValid);
    case 3:
      return formData.selectedVoterIds.length > 0;
    case 4: {
      if (!formData.preVoteStartAt || !formData.preVoteEndAt || !formData.finalDeadline) return false;
      if (formData.notificationChannels.length === 0) return false;
      if (formData.publishMode === 'SCHEDULED' && !formData.publishAt) return false;
      if (formData.preVoteStartAt >= formData.preVoteEndAt) return false;
      if (formData.preVoteEndAt >= formData.finalDeadline) return false;
      return true;
    }
    default:
      return true;
  }
}

/** 법정 요건 체크 (StepConfirm용) */
export function getLegalChecks(formData: EvoteCreateForm) {
  const checks = [
    { label: '총회명 입력', passed: !!formData.title.trim() },
    { label: '총회 일시 설정', passed: !!formData.scheduledAt },
    { label: '안건 1건 이상 등록', passed: formData.agendas.length > 0 },
    {
      label: '모든 안건 필수값 입력',
      passed: formData.agendas.length > 0 && formData.agendas.every(isAgendaValid),
    },
    { label: '투표 대상자 1명 이상 선택', passed: formData.selectedVoterIds.length > 0 },
    { label: '사전투표 기간 설정', passed: !!(formData.preVoteStartAt && formData.preVoteEndAt) },
    { label: '최종 마감 설정', passed: !!formData.finalDeadline },
    { label: '알림 채널 1개 이상 선택', passed: formData.notificationChannels.length > 0 },
  ];
  return { checks, allPassed: checks.every((c) => c.passed) };
}
