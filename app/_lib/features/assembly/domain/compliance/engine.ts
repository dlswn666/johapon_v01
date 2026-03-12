// 컴플라이언스 엔진 — 순수 TypeScript, 프레임워크 의존성 없음
// 규칙을 로드하고 체크포인트별로 평가

import type { ComplianceCheckpoint } from '@/app/_lib/shared/type/assembly.types';
import type { ComplianceRule, ComplianceContext, ComplianceResult } from './types';
import { noticeRules } from './noticeRules';
import { agendaRules } from './agendaRules';
import { participationRules } from './participationRules';
import { votingRules } from './votingRules';
import { recordRules } from './recordRules';

/** 전체 규칙 레지스트리 */
const ALL_RULES: ComplianceRule[] = [
  ...noticeRules,
  ...agendaRules,
  ...participationRules,
  ...votingRules,
  ...recordRules,
];

/** 평가 결과 (규칙 + 결과) */
export interface EvaluationEntry {
  rule: ComplianceRule;
  result: ComplianceResult;
}

/** 특정 체크포인트의 모든 규칙 평가 */
export function evaluateCheckpoint(
  checkpoint: ComplianceCheckpoint,
  context: ComplianceContext
): EvaluationEntry[] {
  const applicableRules = ALL_RULES.filter((r) => r.evaluateAt.includes(checkpoint));
  return applicableRules.map((rule) => ({
    rule,
    result: rule.evaluate(context),
  }));
}

/** BLOCK 규칙 중 실패한 것이 있는지 확인 */
export function hasBlockingFailures(entries: EvaluationEntry[]): boolean {
  return entries.some((e) => e.rule.severity === 'BLOCK' && e.result.status === 'FAIL');
}

/** 전이 가능 여부 판단 (BLOCK FAIL 없어야 함) */
export function canProceed(entries: EvaluationEntry[]): boolean {
  return !hasBlockingFailures(entries);
}

/** 평가 결과 요약 */
export function summarize(entries: EvaluationEntry[]) {
  return {
    total: entries.length,
    pass: entries.filter((e) => e.result.status === 'PASS').length,
    fail: entries.filter((e) => e.result.status === 'FAIL').length,
    blocks: entries.filter((e) => e.rule.severity === 'BLOCK').length,
    warnings: entries.filter((e) => e.rule.severity === 'WARNING').length,
    infos: entries.filter((e) => e.rule.severity === 'INFO').length,
    blockingFailures: entries.filter(
      (e) => e.rule.severity === 'BLOCK' && e.result.status === 'FAIL'
    ).length,
  };
}

/** 코드로 규칙 찾기 */
export function findRuleByCode(code: string): ComplianceRule | undefined {
  return ALL_RULES.find((r) => r.code === code);
}

/** 모든 등록된 규칙 반환 */
export function getAllRules(): ComplianceRule[] {
  return [...ALL_RULES];
}
