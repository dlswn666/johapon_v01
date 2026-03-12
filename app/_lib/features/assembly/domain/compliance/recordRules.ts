// 기록/보관 관련 컴플라이언스 규칙

import type { ComplianceRule } from './types';

export const recordRules: ComplianceRule[] = [
  {
    code: 'STAT-008',
    layer: 'STATUTORY',
    category: 'SIGNATURE',
    severity: 'BLOCK',
    description: '의장+출석이사+감사 서명 완료',
    remediation: '의사록에 의장, 이사, 감사의 서명을 받으세요.',
    legalBasis: '도시정비법 제45조 제6항',
    evaluateAt: ['BEFORE_SEAL'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.signaturesComplete ? 'PASS' : 'FAIL',
      message: ctx.signaturesComplete
        ? '의사록 필수 서명이 완료되었습니다.'
        : '의사록에 필수 서명(의장/이사/감사)이 미완료되었습니다.',
    }),
  },
  {
    code: 'STAT-009',
    layer: 'STATUTORY',
    category: 'RECORD',
    severity: 'BLOCK',
    description: '증거 자료 보관 완료',
    remediation: '증거 패키지를 생성하고 보관하세요.',
    legalBasis: '시행령 제42조 제4항',
    evaluateAt: ['BEFORE_ARCHIVE'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.evidencePackaged ? 'PASS' : 'FAIL',
      message: ctx.evidencePackaged
        ? '증거 자료가 보관되었습니다.'
        : '증거 자료가 보관되지 않았습니다.',
    }),
  },
  {
    code: 'STAT-ARCHIVE-01',
    layer: 'STATUTORY',
    category: 'RECORD',
    severity: 'BLOCK',
    description: '의사록 봉인 완료',
    remediation: '의사록을 봉인하세요.',
    legalBasis: '도시정비법 제45조 제6항',
    evaluateAt: ['BEFORE_ARCHIVE'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.minutesSealed ? 'PASS' : 'FAIL',
      message: ctx.minutesSealed
        ? '의사록이 봉인되었습니다.'
        : '의사록이 봉인되지 않았습니다.',
    }),
  },
  {
    code: 'STAT-ARCHIVE-02',
    layer: 'STATUTORY',
    category: 'RECORD',
    severity: 'BLOCK',
    description: '결과 공표 완료',
    remediation: '결과를 공표하세요.',
    legalBasis: null,
    evaluateAt: ['BEFORE_ARCHIVE'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.resultPublished ? 'PASS' : 'FAIL',
      message: ctx.resultPublished
        ? '결과가 공표되었습니다.'
        : '결과가 공표되지 않았습니다.',
    }),
  },
];
