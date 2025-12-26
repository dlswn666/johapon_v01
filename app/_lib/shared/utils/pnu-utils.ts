/**
 * PNU(필지고유번호) 생성 및 주소 관련 유틸리티
 * 규격: 법정동코드(10) + 산지여부(1) + 본번(4) + 부번(4) = 총 19자리
 */

export interface AddressInfo {
    b_code: string; // 법정동 코드 (10자리)
    main_address_no: string; // 본번
    sub_address_no: string; // 부번
    mountain_yn?: 'Y' | 'N'; // 산지 여부
}

/**
 * Kakao 주소 검색 결과 데이터를 기반으로 19자리 PNU 생성
 */
export const generatePNU = (info: AddressInfo): string => {
    const { b_code, main_address_no, sub_address_no, mountain_yn } = info;

    if (!b_code || b_code.length !== 10) {
        console.warn('Invalid b_code for PNU generation:', b_code);
        return '';
    }

    // 1. 법정동 코드 (10자리)
    const pnu_bcode = b_code;

    // 2. 산지 여부 (1자리): 대지 1, 산 2
    const pnu_mountain = mountain_yn === 'Y' ? '2' : '1';

    // 3. 본번 (4자리): 왼쪽 0 채우기
    const pnu_main = main_address_no.padStart(4, '0');

    // 4. 부번 (4자리): 왼쪽 0 채우기
    const pnu_sub = (sub_address_no || '0').padStart(4, '0');

    return `${pnu_bcode}${pnu_mountain}${pnu_main}${pnu_sub}`;
};

/**
 * 엑셀 행 데이터 또는 텍스트 주소에서 PNU를 추출하기 위한 정규식 및 파서
 * (참고: 실제 구현 시 엑셀의 컬럼 구성에 따라 수정 필요)
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
