// 현재 동의 약관 버전 (법 개정 시 버전 올리고 재동의 유도)
export const CURRENT_CONSENT_VERSION = '1.0';

// 동의 텍스트 (버전별 관리 — 해시 계산 기준)
export const CONSENT_TEXT_BY_VERSION: Record<string, string> = {
  '1.0': `[개인정보 수집·이용 동의]
본인은 온라인 총회 참여를 위하여 아래와 같이 개인정보 수집·이용에 동의합니다.
수집 항목: 이름, 연락처, 주소, 투표 참여 여부
이용 목적: 총회 운영, 본인 확인, 의결 결과 확인
보유 기간: 총회 종료 후 5년
도시 및 주거환경정비법 제45조에 의거하여 본 총회의 의결 내용은 법적 효력을 가집니다.`,
};

// 클라이언트 사이드 해시 계산
export async function hashConsentText(version: string): Promise<string> {
  const text = CONSENT_TEXT_BY_VERSION[version] || '';
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
