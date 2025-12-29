/**
 * 주소 관련 유틸리티 (PNU 생성 로직은 브이월드 API 전용으로 대체됨)
 */

export interface AddressInfo {
    b_code: string; // 법정동 코드 (10자리)
    main_address_no: string; // 본번
    sub_address_no: string; // 부번
    mountain_yn?: 'Y' | 'N'; // 산지 여부
}

/**
 * 엑셀 행 데이터 또는 텍스트 주소에서 지번 정보를 추출하기 위한 정규식 및 파서
 */
export const parseLandLotFromText = (addressText: string): Partial<AddressInfo> | null => {
    // 예: 서울특별시 강북구 미아동 791-2882 -> 본번 791, 부번 2882 추출
    const jibunRegex = /(\d+)(?:-(\d+))?$/;
    const match = addressText.match(jibunRegex);

    if (match) {
        return {
            main_address_no: match[1],
            sub_address_no: match[2] || '0'
        };
    }
    return null;
};

/**
 * PNU 코드 생성 (19자리)
 */
export const generatePNU = (info: AddressInfo): string => {
    const { b_code, main_address_no, sub_address_no, mountain_yn } = info;

    // 본번을 4자리로 패딩
    const mainPad = main_address_no.padStart(4, '0');
    // 부번을 4자리로 패딩
    const subPad = sub_address_no.padStart(4, '0');
    // 산지 여부 (1: 대지, 2: 산)
    const mountainCode = mountain_yn === 'Y' ? '2' : '1';

    return `${b_code}${mountainCode}${mainPad}${subPad}`;
};
