아래는 업로드된 요구사항명세서재개발 프로젝트 초기 설계 내용와 스토리보드develop_for_ai2를 기반으로, 제가 앞서 작성한 API 정의·요청/응답 예시를 설계 문서 형식으로 통합 정리한 것입니다.
Next.js(App Router) 멀티테넌트 구조와 Supabase/PostgreSQL 기반을 가정했고, API 경로·메서드·파라미터·응답 구조까지 포함했습니다.

재개발/재건축 홈페이지 API 설계 문서

1. 개요
   목적: 조합별 독립 운영이 가능한 멀티테넌트 웹/앱 API 제공

구조:

/api/public/... : 공개 API (슬러그 조회, 로그인 등)

/api/tenant/{slug}/... : 조합별 API (슬러그→union_id 매핑 필수)

/api/admin/... : 전역 관리자 API (systemadmin 전용)

공통 규칙:

응답 포맷: { success: boolean, data?: any, error?: { code, message } }

인증: Bearer 토큰 또는 세션 쿠키

권한: systemadmin > admin(조합 관리자) > member(조합원) > anonymous

2. API 목록
   2.1 공용(Public) API
   Method Path Description Request 예시 Response 예시
   GET /api/public/health 서버 상태 점검 - { "success": true, "data": { "status": "ok" }}
   GET /api/public/unions/lookup?slug={slug} 슬러그→조합 메타 조회 - { "success": true, "data": { "id":"uuid", "name":"미아 솔샘", "active":true }}
   POST /api/public/auth/login 로그인 { "userId": "hong", "password": "p@ssw0rd", "slug": "mia_solsam" } { "success": true, "data": { "accessToken": "jwt...", "user": { "id": "uuid", "role": "member" }}}
   POST /api/public/auth/register 회원가입(승인 대기) { "userId": "hong", "password": "...", "name":"홍길동", ... } { "success": true, "data": { "status": "PENDING_APPROVAL" }}

2.2 홈/메타
Method Path Description
GET /api/tenant/{slug}/meta 조합 기본 정보, 사용자 권한, 활성 기능 조회
GET /api/tenant/{slug}/slides 홈 슬라이드 목록
POST /api/tenant/{slug}/slides (admin) 슬라이드 등록 (이미지·링크·게시기간 포함)

2.3 재개발 진행 과정 & 현황 보고
Method Path Description
GET /api/tenant/{slug}/timeline 타임라인 목록(기간·정렬 지원)
POST /api/tenant/{slug}/timeline (admin) 타임라인 항목 등록
GET /api/tenant/{slug}/status-reports/{id} 현황 보고 상세 조회
POST /api/tenant/{slug}/status-reports (admin) 현황 보고 등록
PATCH /api/tenant/{slug}/status-reports/{id} (admin) 현황 보고 수정
DELETE /api/tenant/{slug}/status-reports/{id} (admin) 현황 보고 삭제

현황 보고 등록 Request

json
복사
편집
{
"date": "2024-01-04",
"title": "사무실 오픈",
"summary": "요약 500자",
"content": "<p>본문</p>",
"phase": "추진위",
"attachments": ["/files/photo.jpg"]
}
2.4 조합 소개
Method Path Description
GET /api/tenant/{slug}/orgchart 조합 조직도
GET /api/tenant/{slug}/office 사무실 안내(지도 API 데이터 포함)

2.5 재개발 정보
Method Path Description
GET /api/tenant/{slug}/knowledge 재개발 정보 목록/검색
GET /api/tenant/{slug}/knowledge/{id} 재개발 정보 상세
POST /api/tenant/{slug}/knowledge (admin) 정보 등록
PATCH /api/tenant/{slug}/knowledge/{id} (admin) 수정
DELETE /api/tenant/{slug}/knowledge/{id} (admin) 삭제

2.6 커뮤니티
공지사항

Method Path Description
GET /api/tenant/{slug}/notices 공지사항 목록(팝업 여부 필터)
GET /api/tenant/{slug}/notices/{id} 상세
POST /api/tenant/{slug}/notices (admin) 등록(팝업·알림톡 여부 포함)

Q&A

Method Path
GET /api/tenant/{slug}/qna
GET /api/tenant/{slug}/qna/{id}
POST /api/tenant/{slug}/qna (member 이상)

정보공유방

Method Path
GET /api/tenant/{slug}/boards/share
GET /api/tenant/{slug}/boards/share/{id}
POST /api/tenant/{slug}/boards/share (member 이상)
POST /api/tenant/{slug}/boards/share/{id}/report (member)
POST /api/tenant/{slug}/boards/share/{id}/warn (admin)

2.7 제휴업체/광고
Method Path Description
GET /api/tenant/{slug}/partners 제휴업체 목록
GET /api/tenant/{slug}/partners/{id} 상세
POST /api/tenant/{slug}/partners (admin) 등록
GET /api/tenant/{slug}/ads 광고 목록(노출용)
POST /api/tenant/{slug}/ads (admin) 광고 등록
POST /api/tenant/{slug}/metrics/ad-impressions 광고 노출 로그 기록

2.8 알림톡
Method Path Description
GET /api/tenant/{slug}/alrimtalk 알림톡 발송 이력
POST /api/tenant/{slug}/alrimtalk/send (admin) 발송

발송 Request

json
복사
편집
{
"title": "총회 안내",
"body": "내일 10시 사무실...",
"group": "전체",
"schedule": { "type": "now" }
}
2.9 파일
Method Path Description
GET /api/tenant/{slug}/files 파일 목록
POST /api/tenant/{slug}/files 업로드(사전서명)
DELETE /api/tenant/{slug}/files/{fileId} 삭제

2.10 관리자(Admin)
Method Path Description
GET /api/admin/unions 조합 목록
POST /api/admin/unions 조합 등록
GET /api/admin/users 사용자 검색
PATCH /api/admin/users/{userId} 사용자 승인/수정
POST /api/admin/users/bulk-upload 엑셀 업로드

3. 표준 응답/에러
   성공

json
복사
편집
{ "success": true, "data": { ... } }
에러

json
복사
편집
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "잘못된 요청" } } 4. 캐싱 정책
공지/광고/슬라이드: s-maxage=30

민감 데이터(로그인, 알림톡): no-store

슬러그→union 캐시: 서버 메모리 60~300초
