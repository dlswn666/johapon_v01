/**
 * SQL LIKE 패턴의 와일드카드 문자를 이스케이프
 * PostgREST의 ilike 필터에서 사용자 입력을 안전하게 사용하기 위함
 */
export function escapeLikeWildcards(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&');
}
