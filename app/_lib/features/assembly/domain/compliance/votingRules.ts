// 투표 관련 컴플라이언스 규칙

import type { ComplianceRule } from './types';

export const votingRules: ComplianceRule[] = [
  {
    code: 'STAT-006',
    layer: 'STATUTORY',
    category: 'QUORUM',
    severity: 'WARNING',
    description: '정족수 충족 여부 (미달 시 결의 무효 표시)',
    remediation: '정족수를 충족하세요. 미달 시 결의가 무효 처리됩니다.',
    legalBasis: '도시정비법 제45조',
    evaluateAt: ['BEFORE_PUBLISH'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.quorumMet ? 'PASS' : 'FAIL',
      message: ctx.quorumMet
        ? '정족수가 충족되었습니다.'
        : '정족수가 미달되었습니다. 해당 결의는 무효로 표시됩니다.',
    }),
  },
  {
    code: 'STAT-007',
    layer: 'STATUTORY',
    category: 'VOTING',
    severity: 'BLOCK',
    description: '유효한 집계 결과 존재',
    remediation: '투표 집계를 완료하세요.',
    legalBasis: '시행령 제42조 제4항',
    evaluateAt: ['BEFORE_PUBLISH'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.tallyExists ? 'PASS' : 'FAIL',
      message: ctx.tallyExists
        ? '유효한 집계 결과가 존재합니다.'
        : '집계 결과가 없습니다. 투표 집계를 완료하세요.',
    }),
  },
  {
    code: 'POLICY-VOTE-01',
    layer: 'POLICY',
    category: 'VOTING',
    severity: 'INFO',
    description: '투표 폴 준비 확인',
    remediation: '모든 안건에 대한 투표 폴이 준비되었는지 확인하세요.',
    legalBasis: null,
    evaluateAt: ['BEFORE_VOTING'],
    is_overridable: true,
    evaluate: (ctx) => ({
      status: ctx.pollsReady ? 'PASS' : 'FAIL',
      message: ctx.pollsReady
        ? '모든 투표 폴이 준비되었습니다.'
        : '일부 투표 폴이 준비되지 않았습니다.',
    }),
  },
];
