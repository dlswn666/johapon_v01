// 안건 관련 컴플라이언스 규칙

import type { ComplianceRule } from './types';

export const agendaRules: ComplianceRule[] = [
  {
    code: 'STAT-010',
    layer: 'STATUTORY',
    category: 'AGENDA',
    severity: 'BLOCK',
    description: '안건별 정족수/승인율 임계값 설정',
    remediation: '각 안건에 정족수 및 승인율 임계값을 설정하세요.',
    legalBasis: '도시정비법',
    evaluateAt: ['BEFORE_VOTING'],
    is_overridable: false,
    evaluate: (ctx) => {
      if (ctx.agendaCount === 0) {
        return { status: 'FAIL', message: '등록된 안건이 없습니다.' };
      }
      const incomplete = ctx.agendaItems.filter(
        (a) => !a.hasQuorumThreshold || !a.hasApprovalThreshold
      );
      if (incomplete.length === 0) {
        return { status: 'PASS', message: '모든 안건에 정족수/승인율이 설정되어 있습니다.' };
      }
      return {
        status: 'FAIL',
        message: `${incomplete.length}개 안건에 정족수/승인율 설정이 누락되었습니다.`,
        contextData: { incompleteCount: incomplete.length },
      };
    },
  },
  {
    code: 'POLICY-001',
    layer: 'POLICY',
    category: 'AGENDA',
    severity: 'INFO',
    description: '안건 최소 1개 이상 등록 권장',
    remediation: '안건을 등록하세요.',
    legalBasis: null,
    evaluateAt: ['BEFORE_NOTICE'],
    is_overridable: true,
    evaluate: (ctx) => ({
      status: ctx.agendaCount > 0 ? 'PASS' : 'FAIL',
      message: ctx.agendaCount > 0
        ? `${ctx.agendaCount}개 안건이 등록되어 있습니다.`
        : '안건이 등록되지 않았습니다.',
    }),
  },
];
