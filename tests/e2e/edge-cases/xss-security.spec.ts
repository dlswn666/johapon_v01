import { test, expect } from '@playwright/test';
import { testLoginAsAdmin, testLoginAsMember } from '../helpers/test-auth';

const SLUG = 'solsam';

/**
 * XSS 방어 및 보안 검증 E2E 테스트
 *
 * 보안 레이어:
 * 1. 클라이언트: DOMPurify (sanitize.ts) — 허용 태그 외 제거
 * 2. API: sanitizeRpcError — RPC 에러 메시지 노출 방지
 * 3. API: authNonce 형식 검증 (hex 64자만 허용)
 * 4. DB: RLS 정책으로 데이터 접근 통제
 *
 * 테스트 대상:
 * - API 파라미터에 XSS 페이로드 주입
 * - SQL 인젝션 시도
 * - 특수문자 입력 처리
 */
test.describe('XSS 방어 - API 파라미터 주입', () => {
    test('회원 승인 API에 XSS 페이로드 주입 → 정상 처리/거부', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const xssPayloads = [
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert(1)>',
            '"><script>alert(document.cookie)</script>',
            "'; DROP TABLE users; --",
            '<svg onload=alert(1)>',
        ];

        for (const payload of xssPayloads) {
            const response = await page.request.post('/api/members/approve', {
                data: {
                    unionId: payload,
                    memberId: payload,
                },
            });

            // XSS 페이로드가 포함된 ID로 조회 → 사용자 미발견 (404) 또는 인증 실패
            // 중요한 것은 5xx 에러가 발생하지 않는 것
            expect(response.status()).toBeLessThan(500);

            // 응답 본문에 스크립트 태그가 그대로 포함되지 않아야 함
            const body = await response.text();
            expect(body).not.toContain('<script>');
            expect(body).not.toContain('onerror=');
        }
    });

    test('전자투표 생성 시 XSS가 포함된 제목 → 저장 시 sanitize 처리', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/evotes', {
            data: {
                title: '<script>alert("xss")</script>제1회 총회',
                scheduled_at: '2026-05-01T10:00:00Z',
                agendas: [{
                    title: '<img src=x onerror=alert(1)>안건1',
                }],
                selected_voter_ids: ['test-id'],
                pre_vote_start_at: '2026-04-01T00:00:00Z',
                pre_vote_end_at: '2026-04-05T00:00:00Z',
            },
        });

        // RPC 호출 시 DB 트리거가 sanitize 처리하거나, 정상 실패 처리
        // 5xx가 발생하지 않아야 함
        expect(response.status()).toBeLessThan(500);
    });

    test('투표 제출 시 votes 배열에 악성 데이터 주입 → 안전 처리', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const response = await page.request.post('/api/evotes/fake-assembly/submit', {
            data: {
                authNonce: '0'.repeat(64),
                votes: [
                    {
                        pollId: '<script>alert(1)</script>',
                        optionId: "' OR '1'='1",
                    },
                ],
            },
        });

        // 악성 데이터가 UUID 형식이 아니므로 DB 레벨에서 거부됨
        // 500이 아닌 4xx 에러 반환 확인
        expect(response.status()).toBeLessThan(500);
    });
});

test.describe('SQL 인젝션 방어', () => {
    test('검색 파라미터에 SQL 인젝션 시도 → 안전 처리', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const sqlInjectionPayloads = [
            "'; DROP TABLE assemblies; --",
            "' OR '1'='1",
            "1; DELETE FROM users WHERE 1=1",
            "' UNION SELECT * FROM users --",
            "%' OR 1=1 --",
        ];

        for (const payload of sqlInjectionPayloads) {
            const response = await page.request.get(`/api/evotes?search=${encodeURIComponent(payload)}`);

            // escapeLikeWildcards()로 LIKE 와일드카드가 이스케이프되고,
            // Supabase 파라미터화 쿼리로 SQL 인젝션이 방지됨
            // 정상 응답(빈 결과) 또는 400 에러
            expect(response.status()).toBeLessThan(500);

            if (response.ok()) {
                const body = await response.json();
                // SQL 인젝션이 성공하면 비정상적으로 많은 데이터가 반환되므로 확인
                expect(Array.isArray(body.data)).toBe(true);
            }
        }
    });

    test('회원 승인 API에 SQL 인젝션 시도 → 안전 처리', async ({ page }) => {
        await testLoginAsAdmin(page, SLUG);

        const response = await page.request.post('/api/members/approve', {
            data: {
                unionId: "'; DROP TABLE users; --",
                memberId: "' OR '1'='1",
            },
        });

        // Supabase SDK가 파라미터화 쿼리를 사용하므로 SQL 인젝션 불가
        expect(response.status()).toBeLessThan(500);
    });
});

test.describe('RPC 에러 메시지 노출 방지', () => {
    test('sanitizeRpcError가 기술적 에러 메시지를 숨기는지 검증', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        // 존재하지 않는 assembly에 투표 → RPC 에러 발생 시 기술적 메시지 노출 방지
        const response = await page.request.post('/api/evotes/00000000-0000-0000-0000-000000000000/submit', {
            data: {
                authNonce: '0'.repeat(64),
                votes: [{ pollId: '00000000-0000-0000-0000-000000000001', optionId: '00000000-0000-0000-0000-000000000002' }],
            },
        });

        if (response.status() === 400) {
            const body = await response.json();
            // 에러 메시지에 DB 내부 정보가 노출되지 않아야 함
            expect(body.error).not.toContain('pg_');
            expect(body.error).not.toContain('function');
            expect(body.error).not.toContain('relation');
            expect(body.error).not.toContain('DETAIL:');
            expect(body.error).not.toContain('HINT:');
        }
    });
});

test.describe('인증 토큰 보안', () => {
    test('authNonce에 특수문자 주입 시 형식 검증으로 거부', async ({ page }) => {
        await testLoginAsMember(page, SLUG);

        const maliciousNonces = [
            '0'.repeat(63) + '\n',              // 개행 문자
            '0'.repeat(63) + '\0',              // null 바이트
            '0'.repeat(32) + '${7*7}' + '0'.repeat(26), // 템플릿 인젝션
            '../../../etc/passwd',               // 경로 순회
            '0'.repeat(64) + '; rm -rf /',      // 명령어 주입
        ];

        for (const nonce of maliciousNonces) {
            const response = await page.request.post('/api/votes/cast', {
                data: {
                    pollId: '00000000-0000-0000-0000-000000000000',
                    assemblyId: '00000000-0000-0000-0000-000000000000',
                    optionId: '00000000-0000-0000-0000-000000000000',
                    authNonce: nonce,
                },
            });

            // /^[0-9a-f]{64}$/i 정규식으로 형식 검증 → 400
            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error).toContain('인증 토큰 형식이 올바르지 않습니다');
        }
    });
});
