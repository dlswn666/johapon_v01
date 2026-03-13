/**
 * documentMergeResolver.ts
 *
 * 템플릿 {{field}} → 실제 값 치환 엔진
 * - Regex 기반 {{field}} 및 {{field | pipe}} 치환
 * - 미해결 필드는 그대로 유지 (디버깅용)
 * - XSS 방지: 값은 HTML 엔티티 이스케이프
 */

import type { MergeFieldDef, MergeContext } from '@/app/_lib/shared/type/assembly.types';

// HTML 엔티티 이스케이프 (XSS 방지)
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 파이프 포맷터
function applyPipe(value: string, pipe: string): string {
  switch (pipe.trim()) {
    case 'date': {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
    case 'currency':
      return Number(value).toLocaleString('ko-KR') + '원';
    case 'number':
      return Number(value).toLocaleString('ko-KR');
    default:
      return value;
  }
}

// 소스별 값 조회
function resolveField(fieldName: string, source: string, context: MergeContext): string | undefined {
  const sourceMap: Record<string, Record<string, unknown> | undefined> = {
    snapshot: context.snapshot,
    assembly: context.assembly,
    union_info: context.unionInfo,
    static: context.staticData,
  };

  // 필드명 매핑 (template field name → context field name)
  const fieldAliases: Record<string, { source: string; field: string }> = {
    union_name: { source: 'union_info', field: 'name' },
    assembly_title: { source: 'assembly', field: 'title' },
    assembly_date: { source: 'assembly', field: 'scheduled_at' },
    assembly_venue: { source: 'assembly', field: 'venue_address' },
    total_members: { source: 'assembly', field: 'quorum_total_members' },
    current_date: { source: 'static', field: 'current_date' },
  };

  // 별칭 확인
  const alias = fieldAliases[fieldName];
  if (alias) {
    const obj = sourceMap[alias.source];
    const val = obj?.[alias.field];
    return val != null ? String(val) : undefined;
  }

  // 직접 조회
  const obj = sourceMap[source];
  const val = obj?.[fieldName];
  return val != null ? String(val) : undefined;
}

/** 메인 함수: 템플릿 HTML + 컨텍스트 → 개인화 HTML */
export function resolveTemplate(
  htmlTemplate: string,
  fieldSchema: MergeFieldDef[],
  context: MergeContext
): { html: string; unresolvedFields: string[] } {
  const unresolvedFields: string[] = [];

  // {{field}} 또는 {{field | pipe}} 패턴 매칭
  const resolved = htmlTemplate.replace(
    /\{\{(\w+)(?:\s*\|\s*(\w+))?\}\}/g,
    (match, fieldName: string, pipe?: string) => {
      // schema에서 source 찾기
      const fieldDef = fieldSchema.find(f => f.name === fieldName);
      const source = fieldDef?.source || 'static';

      let value = resolveField(fieldName, source, context);

      // static fallback: 모든 소스에서 검색
      if (value === undefined) {
        for (const src of ['snapshot', 'assembly', 'union_info', 'static']) {
          value = resolveField(fieldName, src, context);
          if (value !== undefined) break;
        }
      }

      if (value === undefined) {
        unresolvedFields.push(fieldName);
        return match; // 미해결 필드는 그대로 유지
      }

      // 파이프 적용
      if (pipe) {
        value = applyPipe(value, pipe);
      }

      return escapeHtml(value);
    }
  );

  return { html: resolved, unresolvedFields };
}
