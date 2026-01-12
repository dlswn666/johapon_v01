/**
 * 주소 관련 유틸리티 함수
 * - 주소 정규화 (중복 사용자 매칭용)
 * - 주소 표기 포맷팅 (지번 기본 + (도로명))
 */

/**
 * 지번 주소를 정규화합니다 (동일 조합원 매칭 키 생성용)
 * - 괄호 및 괄호 내용 제거
 * - 특수문자 제거 (한글, 영문, 숫자, 공백, 하이픈만 유지)
 * - 연속 공백을 단일 공백으로 축약
 * - 앞뒤 공백 제거
 *
 * @param address - 지번 주소
 * @returns 정규화된 주소 문자열
 */
export function normalizeJibunAddress(address: string | null | undefined): string {
    if (!address || address.trim() === '') {
        return '';
    }

    return address
        .replace(/\([^)]*\)/g, '') // 괄호 내용 제거
        .replace(/[^\w\s가-힣0-9-]/g, '') // 특수문자 제거
        .replace(/\s+/g, ' ') // 연속 공백 축약
        .trim();
}

/**
 * 이름을 정규화합니다 (동일 조합원 매칭 키 생성용)
 * - 모든 공백 제거
 * - 소문자로 변환
 *
 * @param name - 이름
 * @returns 정규화된 이름 문자열
 */
export function normalizeName(name: string | null | undefined): string {
    if (!name || name.trim() === '') {
        return '';
    }

    return name.replace(/\s+/g, '').toLowerCase().trim();
}

/**
 * 동일 조합원 매칭 키를 생성합니다
 * 이름 + 거주지 지번(정규화) 조합
 *
 * @param name - 이름
 * @param residentAddressJibun - 거주지 지번 주소
 * @returns 매칭 키 문자열 (빈 문자열이면 매칭 불가)
 */
export function createUserMatchingKey(
    name: string | null | undefined,
    residentAddressJibun: string | null | undefined
): string {
    const normalizedName = normalizeName(name);
    const normalizedAddress = normalizeJibunAddress(residentAddressJibun);

    if (!normalizedName || !normalizedAddress) {
        return '';
    }

    return `${normalizedName}|${normalizedAddress}`;
}

/**
 * 주소를 표시 형식으로 포맷팅합니다
 * - 지번만 있을 때: 지번
 * - 지번+도로명 둘 다 있을 때: 지번 (도로명)
 * - 지번이 없고 도로명만 있을 때: 도로명
 *
 * @param jibunAddress - 지번 주소
 * @param roadAddress - 도로명 주소
 * @returns 포맷팅된 주소 문자열
 */
export function formatAddressDisplay(
    jibunAddress: string | null | undefined,
    roadAddress: string | null | undefined
): string {
    const jibun = jibunAddress?.trim() || '';
    const road = roadAddress?.trim() || '';

    if (jibun && road) {
        return `${jibun} (${road})`;
    }

    if (jibun) {
        return jibun;
    }

    if (road) {
        return road;
    }

    return '';
}

/**
 * 거주지 주소를 표시 형식으로 포맷팅합니다
 * 지번 + 상세주소 + (도로명)
 *
 * @param jibunAddress - 지번 주소
 * @param roadAddress - 도로명 주소
 * @param detail - 상세 주소 (동/호수 등)
 * @returns 포맷팅된 주소 문자열
 */
export function formatResidentAddressDisplay(
    jibunAddress: string | null | undefined,
    roadAddress: string | null | undefined,
    detail: string | null | undefined
): string {
    const baseAddress = formatAddressDisplay(jibunAddress, roadAddress);
    const detailStr = detail?.trim() || '';

    if (baseAddress && detailStr) {
        return `${baseAddress} ${detailStr}`;
    }

    return baseAddress || detailStr;
}

/**
 * 물건지 주소를 표시 형식으로 포맷팅합니다
 * 지번 + 동/호수 + (도로명)
 *
 * @param jibunAddress - 지번 주소
 * @param roadAddress - 도로명 주소
 * @param dong - 동
 * @param ho - 호수
 * @returns 포맷팅된 주소 문자열
 */
export function formatPropertyAddressDisplay(
    jibunAddress: string | null | undefined,
    roadAddress: string | null | undefined,
    dong: string | null | undefined,
    ho: string | null | undefined
): string {
    const jibun = jibunAddress?.trim() || '';
    const road = roadAddress?.trim() || '';
    const dongStr = dong?.trim() || '';
    const hoStr = ho?.trim() || '';

    // 동/호수 조합
    let unitPart = '';
    if (dongStr && hoStr) {
        unitPart = `${dongStr}동 ${hoStr}호`;
    } else if (dongStr) {
        unitPart = `${dongStr}동`;
    } else if (hoStr) {
        unitPart = `${hoStr}호`;
    }

    // 주소 조합
    let result = jibun;

    if (unitPart) {
        result = result ? `${result} ${unitPart}` : unitPart;
    }

    if (road) {
        result = result ? `${result} (${road})` : road;
    }

    return result;
}

/**
 * 주소에서 도로명/지번 타입을 판별합니다
 * 도로명 주소: 로, 길, 대로 등으로 끝나는 도로명 + 건물번호
 * 지번 주소: 동/리 + 번지
 *
 * @param address - 주소 문자열
 * @returns 'road' | 'jibun' | 'unknown'
 */
export function detectAddressType(address: string | null | undefined): 'road' | 'jibun' | 'unknown' {
    if (!address || address.trim() === '') {
        return 'unknown';
    }

    const trimmed = address.trim();

    // 도로명 주소 패턴: 로, 길, 대로 + 숫자
    if (/[로길대로]\s*\d+/.test(trimmed)) {
        return 'road';
    }

    // 지번 주소 패턴: 동/리/읍/면 + 번지 (숫자-숫자 또는 숫자)
    if (/[동리읍면]\s+(?:산\s*)?\d+(?:-\d+)?/.test(trimmed)) {
        return 'jibun';
    }

    return 'unknown';
}
