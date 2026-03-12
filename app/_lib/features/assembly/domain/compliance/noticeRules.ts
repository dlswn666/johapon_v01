// 소집통지 관련 컴플라이언스 규칙

import type { ComplianceRule } from './types';

/** 소집통지 시점(BEFORE_NOTICE) 기준 14일(밀리초) */
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export const noticeRules: ComplianceRule[] = [
  {
    code: 'STAT-001',
    layer: 'STATUTORY',
    category: 'NOTICE',
    severity: 'BLOCK',
    description: '소집통지문 존재 필수',
    remediation: '소집통지문을 문서 생성(4단계)에서 생성하세요.',
    legalBasis: '도시정비법 제45조',
    evaluateAt: ['BEFORE_NOTICE'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.noticeDocumentExists ? 'PASS' : 'FAIL',
      message: ctx.noticeDocumentExists
        ? '소집통지문이 존재합니다.'
        : '소집통지문이 생성되지 않았습니다.',
    }),
  },
  {
    code: 'STAT-002',
    layer: 'STATUTORY',
    category: 'NOTICE',
    severity: 'BLOCK',
    description: '소집통지 발송 완료',
    remediation: '소집통지를 발송하세요.',
    legalBasis: '도시정비법 제45조',
    evaluateAt: ['BEFORE_CONVENE'],
    is_overridable: false,
    evaluate: (ctx) => ({
      status: ctx.notificationDelivered ? 'PASS' : 'FAIL',
      message: ctx.notificationDelivered
        ? '소집통지가 발송되었습니다.'
        : '소집통지가 아직 발송되지 않았습니다.',
    }),
  },
  {
    code: 'STAT-003',
    layer: 'STATUTORY',
    category: 'NOTICE',
    severity: 'BLOCK',
    description: '법정 최소 통지일 14일 충족',
    remediation: '총회 일정을 통지 발송일로부터 최소 14일 이후로 설정하세요.',
    legalBasis: '도시정비법 시행령',
    evaluateAt: ['BEFORE_CONVENE'],
    is_overridable: false,
    evaluate: (ctx) => {
      if (!ctx.noticeSentAt || !ctx.scheduledAt) {
        return { status: 'FAIL', message: '통지 발송일 또는 총회 일정이 설정되지 않았습니다.' };
      }
      const sentDate = new Date(ctx.noticeSentAt).getTime();
      const scheduledDate = new Date(ctx.scheduledAt).getTime();
      const diff = scheduledDate - sentDate;
      const daysRemaining = Math.floor(diff / (24 * 60 * 60 * 1000));

      if (diff >= FOURTEEN_DAYS_MS) {
        return { status: 'PASS', message: `통지 후 ${daysRemaining}일 경과 — 14일 요건 충족.` };
      }
      return {
        status: 'FAIL',
        message: `통지 후 ${daysRemaining}일 — 법정 최소 14일 미달.`,
        contextData: { daysRemaining, required: 14 },
      };
    },
  },
  {
    code: 'BYLAW-001',
    layer: 'BYLAW',
    category: 'NOTICE',
    severity: 'WARNING',
    description: '통지 도달율 80% 이상 권장',
    remediation: '미도달 조합원에게 재통지하세요.',
    legalBasis: null,
    evaluateAt: ['BEFORE_CONVENE'],
    is_overridable: true,
    evaluate: (ctx) => {
      if (ctx.deliveryRate >= 80) {
        return { status: 'PASS', message: `통지 도달율 ${ctx.deliveryRate}% — 양호.` };
      }
      return {
        status: 'FAIL',
        message: `통지 도달율 ${ctx.deliveryRate}% — 80% 미만.`,
        contextData: { deliveryRate: ctx.deliveryRate },
      };
    },
  },
];
