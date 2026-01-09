/**
 * 공통 유틸리티 함수 모음
 * 날짜 포맷, 작성자명 포맷 등 프로젝트 전체에서 사용되는 유틸리티 함수들을 관리합니다.
 */

/**
 * 날짜 포맷 함수
 * @param dateString - ISO 날짜 문자열
 * @param includeTime - 시간 포함 여부 (기본값: false)
 * @returns "2026년 01월 09일" 또는 "2026년 01월 09일 오후 02:30"
 */
export function formatDate(dateString: string | Date, includeTime: boolean = false): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) {
        return '-';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const dateStr = `${year}년 ${month}월 ${day}일`;

    if (!includeTime) {
        return dateStr;
    }

    // 시간 포함
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = String(hours % 12 || 12).padStart(2, '0');

    return `${dateStr} ${period} ${displayHours}:${minutes}`;
}

/**
 * 작성자명 포맷 함수
 * @param authorName - 작성자명 (null/undefined 가능)
 * @returns 작성자명 또는 "-"
 */
export function formatAuthorName(authorName: string | null | undefined): string {
    if (!authorName || authorName.trim() === '') {
        return '-';
    }
    return authorName;
}

/**
 * 파일 크기 포맷 함수
 * @param bytes - 바이트 단위 크기
 * @returns 포맷된 파일 크기 문자열 (예: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
