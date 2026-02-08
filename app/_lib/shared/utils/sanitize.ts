import DOMPurify from 'dompurify';

/**
 * HTML 콘텐츠를 DOMPurify로 산화하여 XSS 방지
 * 허용 태그: 기본 포맷팅 + 이미지 + 테이블 + 링크
 * 차단: script, onerror, onload, javascript: URI 등
 */
export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        USE_PROFILES: { html: true },
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
            'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span', 'hr', 'sub', 'sup',
        ],
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class',
            'target', 'rel', 'width', 'height', 'colspan', 'rowspan',
        ],
        FORBID_ATTR: ['style'],
        ALLOW_DATA_ATTR: false,
    });
}
