import type { Assembly } from '@/app/_lib/shared/type/assembly.types';

/**
 * 해당 총회가 세션 기반 출석 모드인지 확인
 */
export function isSessionMode(assembly: Pick<Assembly, 'session_mode'>): boolean {
  return assembly.session_mode === 'SESSION';
}
