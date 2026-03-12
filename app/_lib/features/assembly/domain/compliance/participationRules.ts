// 참여 방식 관련 컴플라이언스 규칙

import type { ComplianceRule } from './types';

export const participationRules: ComplianceRule[] = [
  {
    code: 'STAT-004',
    layer: 'STATUTORY',
    category: 'PARTICIPATION',
    severity: 'WARNING',
    description: '본인확인 수단 설정',
    remediation: '본인확인 방법을 설정하세요. PASS 인증 시 BLOCK으로 상향됩니다.',
    legalBasis: '시행령 제42조 제2항',
    evaluateAt: ['BEFORE_VOTING'],
    is_overridable: false,
    evaluate: (ctx) => {
      if (ctx.identityVerificationLevel === 'PASS_REQUIRED') {
        return { status: 'PASS', message: 'PASS 본인인증이 설정되어 있습니다.' };
      }
      if (ctx.identityVerificationLevel === 'KAKAO_ONLY') {
        return {
          status: 'PASS',
          message: '카카오 로그인 본인확인이 설정되어 있습니다. (PASS 인증 권장)',
        };
      }
      return { status: 'FAIL', message: '본인확인 수단이 설정되지 않았습니다.' };
    },
  },
  {
    code: 'STAT-005',
    layer: 'STATUTORY',
    category: 'PARTICIPATION',
    severity: 'BLOCK',
    description: '비밀투표 보장 시스템 확인',
    remediation: '비밀투표 시스템이 활성화되어 있는지 확인하세요.',
    legalBasis: '시행령 제42조 제3항',
    evaluateAt: ['BEFORE_VOTING'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.secretBallotEnabled ? 'PASS' : 'FAIL',
      message: ctx.secretBallotEnabled
        ? '비밀투표 보장 시스템이 활성화되어 있습니다.'
        : '비밀투표 보장 시스템이 비활성화되어 있습니다.',
    }),
  },
  {
    code: 'STAT-CONVENE-01',
    layer: 'STATUTORY',
    category: 'PARTICIPATION',
    severity: 'BLOCK',
    description: '조합원 스냅샷 생성 완료',
    remediation: '총회 참여 대상 스냅샷을 생성하세요.',
    legalBasis: null,
    evaluateAt: ['BEFORE_START'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.snapshotCreated ? 'PASS' : 'FAIL',
      message: ctx.snapshotCreated
        ? '조합원 스냅샷이 생성되었습니다.'
        : '조합원 스냅샷이 생성되지 않았습니다.',
    }),
  },
  {
    code: 'STAT-CONVENE-02',
    layer: 'STATUTORY',
    category: 'PARTICIPATION',
    severity: 'BLOCK',
    description: '접근 토큰 발급 완료',
    remediation: '조합원 접근 토큰을 발급하세요.',
    legalBasis: null,
    evaluateAt: ['BEFORE_START'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.tokensIssued ? 'PASS' : 'FAIL',
      message: ctx.tokensIssued
        ? '접근 토큰이 발급되었습니다.'
        : '접근 토큰이 발급되지 않았습니다.',
    }),
  },
];
