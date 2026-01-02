/**
 * 동호수 정규화 유틸리티
 * 
 * 다양한 형식의 동호수 입력을 통일된 형식으로 정규화합니다.
 * - 동: 접미사 '동' 제거 (예: "101동" -> "101", "A동" -> "A")
 * - 호수: 접미사 '호' 제거 + 지하층 표시 통일 (예: "비01" -> "B01")
 */

/**
 * 동 번호 정규화 (접미사 제거)
 * 
 * @param dong 동 번호 문자열
 * @returns 정규화된 동 번호 또는 null
 * 
 * @example
 * normalizeDong("101동") // "101"
 * normalizeDong("A동")   // "A"
 * normalizeDong("가동")  // "가"
 * normalizeDong("101")   // "101"
 * normalizeDong(null)    // null
 */
export function normalizeDong(dong: string | null | undefined): string | null {
    if (!dong) return null;

    let normalized = dong.trim();

    // "동" 접미사 제거
    normalized = normalized.replace(/동$/g, '');

    return normalized.trim() || null;
}

/**
 * 호수 정규화 (접미사 제거 + 지하층 표시 통일)
 * 
 * 지하층 표시를 통일된 형식(B 접두사)으로 변환합니다:
 * - "비01" -> "B01"
 * - "지하101" -> "B101"
 * - "지1" -> "B1"
 * - "B101" -> "B101" (유지)
 * 
 * @param ho 호수 문자열
 * @returns 정규화된 호수 또는 null
 * 
 * @example
 * normalizeHo("1001호") // "1001"
 * normalizeHo("비01")   // "B01"
 * normalizeHo("지하101") // "B101"
 * normalizeHo("B101")   // "B101"
 * normalizeHo("101")    // "101"
 * normalizeHo(null)     // null
 */
export function normalizeHo(ho: string | null | undefined): string | null {
    if (!ho) return null;

    let normalized = ho.trim();

    // "호" 접미사 제거
    normalized = normalized.replace(/호$/g, '');

    // 지하층 표시 통일 (비, 지하, 지 → B)
    normalized = normalized.replace(/^비/g, 'B');
    normalized = normalized.replace(/^지하/g, 'B');
    normalized = normalized.replace(/^지(?=\d)/g, 'B');

    return normalized.trim() || null;
}

/**
 * 지상/지하 여부와 호수로 정규화된 호수 생성
 * 
 * 회원가입 UI에서 지상/지하 선택 후 호수를 입력받을 때 사용합니다.
 * 
 * @param isBasement 지하 여부
 * @param ho 호수 (숫자)
 * @returns 정규화된 호수 또는 null
 * 
 * @example
 * createNormalizedHo(true, "101")  // "B101"
 * createNormalizedHo(false, "101") // "101"
 * createNormalizedHo(true, "B101") // "B101" (이미 B가 있으면 유지)
 */
export function createNormalizedHo(isBasement: boolean, ho: string): string | null {
    if (!ho) return null;

    // 기본 정규화: 공백 제거, '호' 접미사 제거
    let normalized = ho.trim().replace(/호$/g, '');

    // 기존 지하 표시 제거 (비, 지하, 지, B)
    normalized = normalized.replace(/^(비|지하|지(?=\d)|B)/g, '');

    if (!normalized) return null;

    if (isBasement) {
        return `B${normalized}`;
    }

    return normalized;
}

/**
 * 호수가 지하층인지 확인
 * 
 * @param ho 호수 문자열
 * @returns 지하층 여부
 * 
 * @example
 * isBasementHo("B101")   // true
 * isBasementHo("비01")   // true
 * isBasementHo("지하101") // true
 * isBasementHo("101")    // false
 */
export function isBasementHo(ho: string | null | undefined): boolean {
    if (!ho) return false;
    const normalized = ho.trim();
    return /^(비|B|지하|지(?=\d))/.test(normalized);
}

/**
 * 호수에서 지하 표시를 제거하고 순수 호수 번호만 반환
 * 
 * @param ho 호수 문자열
 * @returns 지하 표시가 제거된 호수 번호
 * 
 * @example
 * extractHoNumber("B101")   // "101"
 * extractHoNumber("비01")   // "01"
 * extractHoNumber("지하101") // "101"
 * extractHoNumber("101")    // "101"
 */
export function extractHoNumber(ho: string | null | undefined): string | null {
    if (!ho) return null;

    let normalized = ho.trim();

    // '호' 접미사 제거
    normalized = normalized.replace(/호$/g, '');

    // 지하 표시 제거
    normalized = normalized.replace(/^(비|B|지하|지(?=\d))/g, '');

    return normalized.trim() || null;
}
