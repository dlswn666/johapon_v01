/**
 * localhost 환경인지 확인하는 유틸리티 함수
 * production 환경에서는 절대 true를 반환하지 않음
 */
export function isLocalhost(): boolean {
    // 서버 사이드에서는 false 반환
    if (typeof window === 'undefined') return false;

    // production 환경에서는 절대 작동하지 않음
    if (process.env.NODE_ENV === 'production') return false;

    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * 서버사이드에서 localhost 환경인지 확인
 * API 라우트, Server Actions에서 사용
 */
export function isLocalhostServer(): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    return process.env.NODE_ENV === 'development';
}
