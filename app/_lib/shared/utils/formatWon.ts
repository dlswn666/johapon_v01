/**
 * 금액 관련 포맷 유틸
 */

/** 숫자 문자열에서 숫자만 추출 */
export function extractDigits(value: string): string {
  return value.replace(/[^\d]/g, '');
}

/** 천 단위 콤마 포맷 (예: 1200000000 → "1,200,000,000") */
export function formatNumberWithComma(value: string | number): string {
  const digits = typeof value === 'number' ? String(value) : extractDigits(value);
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

/**
 * 숫자를 한글 금액으로 변환 (예: 532000000 → "5억 3,200만원")
 *
 * 규칙:
 * - 조(兆), 억, 만 단위 사용
 * - 각 단위의 나머지는 천 단위 콤마 표시
 * - 예: 1,250,000,000 → "12억 5,000만원"
 * - 예: 50,000,000 → "5,000만원"
 * - 예: 1,500,000 → "150만원"
 * - 예: 500,000 → "50만원"
 * - 만 미만은 콤마 포맷 + 원 (예: 9,999 → "9,999원")
 */
export function formatKoreanWon(value: string | number): string {
  const digits = typeof value === 'number' ? String(value) : extractDigits(value);
  if (!digits) return '';

  const num = Number(digits);
  if (num === 0) return '0원';

  const units = [
    { value: 1_0000_0000_0000, label: '조' },
    { value: 1_0000_0000, label: '억' },
    { value: 1_0000, label: '만' },
  ];

  const parts: string[] = [];
  let remainder = num;

  for (const unit of units) {
    if (remainder >= unit.value) {
      const count = Math.floor(remainder / unit.value);
      parts.push(`${count.toLocaleString('ko-KR')}${unit.label}`);
      remainder = remainder % unit.value;
    }
  }

  if (remainder > 0) {
    parts.push(remainder.toLocaleString('ko-KR'));
  }

  return parts.join(' ') + '원';
}
