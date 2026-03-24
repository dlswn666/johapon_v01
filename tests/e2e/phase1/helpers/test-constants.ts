// test-union의 UUID는 런타임에 slug로 조회
export const TEST_UNION_SLUG = 'test-union';
export const SOLSAM_SLUG = 'solsam';

// 뷰포트 설정
export const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, name: 'desktop' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  mobile: { width: 393, height: 851, name: 'mobile' },
} as const;

// 사용자 ID (VARCHAR — test_ 접두사)
export const ADMIN_ID = 'test_admin_a1';
export const USER_IDS = {
  U01: 'test_u01', U02: 'test_u02', U03: 'test_u03', U04: 'test_u04',
  U05: 'test_u05', U06: 'test_u06', U07: 'test_u07', U08: 'test_u08',
  U09: 'test_u09', U10: 'test_u10', U11: 'test_u11', U12: 'test_u12',
  U13: 'test_u13', U14: 'test_u14', U15: 'test_u15', U16: 'test_u16',
  U17: 'test_u17', U18: 'test_u18', U19: 'test_u19', U20: 'test_u20',
} as const;

// 스크린샷 저장 기본 경로
export const SCREENSHOT_BASE = '.test-results/phase1/screenshots';
export const RESULTS_BASE = '.test-results/phase1/results';
