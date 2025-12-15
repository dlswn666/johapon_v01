/**
 * 카카오 서비스 약관 태그 상수
 * 
 * 카카오 개발자 센터 > 카카오 로그인 > 서비스 약관에서 등록한 태그 값입니다.
 * 카카오싱크 간편가입 시 동의 화면에 서비스 약관이 함께 표시됩니다.
 * 
 * @see https://developers.kakao.com/docs/latest/ko/kakaologin/utilize#sync
 */
export const KAKAO_SERVICE_TERMS = {
    /** 이용약관 */
    TERMS_OF_SERVICE: 'service',
    /** 개인정보처리방침 */
    PRIVACY_POLICY: 'privacy',
    /** 만 14세 이상 확인 */
    AGE_14_OVER: 'age',
} as const;

/**
 * 카카오 로그인 시 전달할 서비스 약관 태그 문자열
 * 쉼표로 구분된 형태로 전달됩니다.
 */
export const KAKAO_SERVICE_TERMS_STRING = Object.values(KAKAO_SERVICE_TERMS).join(',');

export type KakaoServiceTermsType = typeof KAKAO_SERVICE_TERMS[keyof typeof KAKAO_SERVICE_TERMS];

