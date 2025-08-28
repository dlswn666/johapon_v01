1. 프로젝트 개요 (Project Overview)

스택: Next.js(App Router) · TypeScript · Zustand(상태) · React Query/Fetch(선택) · Axios(서비스 레이어) · ESLint/Prettier · Jest/RTL

아키텍처 원칙

UI(Page/Route)와 도메인 로직(상태/서비스) 분리

Store(상태) 는 feature 단위 slice로 모듈화

Service(API) 는 axios 인스턴스/에러 규약으로 통일

변경은 작은 PR, 테스트/타입/문서 동반

개발 모드 안전장치

PR 전: 타입 통과, 린트 통과, 유닛 테스트 통과

상태/서비스 변경 시: 검증 시나리오와 롤백 방법 남김

2. 레포 구조 (Repository Map)
   src/
   ├─ app/ # Next.js App Router
   │ ├─ (tenant)/[slug]/... # 멀티 테넌시 라우팅(있다면)
   │ └─ api/...(route handlers) # 서버 액션/라우트(있다면)
   ├─ entities/ # 핵심 도메인 모델
   │ └─ review/ (types, schemas)
   ├─ features/ # 페이지 독립 기능 모듈(상태+UI 조합)
   │ └─ feed-filters/
   │ ├─ ui/ # Dumb UI (presentational)
   │ ├─ model/ # Zustand slice, selectors
   │ └─ service/ # API 호출 래퍼(필요시)
   ├─ shared/
   │ ├─ lib/axios.ts # axios 인스턴스/인터셉터
   │ ├─ lib/fetcher.ts # fetch 유틸(선택)
   │ ├─ stores/ # 전역 store 초기화(Provider 등)
   │ ├─ utils/ # 순수 유틸(불변/형식 변환 등)
   │ ├─ config/ # 환경변수, 상수, 권한 상수
   │ └─ types/ # 공용 타입
   ├─ tests/ # 유닛/컴포넌트 테스트
   └─ styles/ # 전역 스타일

Claude에게 중요: features/\*/model과 shared/lib/axios.ts는 수정 시 규칙을 반드시 따를 것.

3. 코딩 규칙 (Conventions)

언어/스타일: TypeScript 엄격 모드, ESLint(Next 규칙), Prettier

컴포넌트

Server Component 기본, 클라이언트 상태/이벤트 사용 시 use client

프레젠테이션(UI) vs 컨테이너(상태/행동) 분리

상태(Zustand)

feature slice로 분리, 얕은 비교 셀렉터로 렌더링 최소화

비동기 로직은 service 호출 → 상태 업데이트 순

immer 미사용 시 불변 업데이트 준수

API(Service)

shared/lib/axios.ts 인스턴스 사용(기본 헤더/에러 표준화)

모든 메서드는 입출력 타입 명시, 에러 도메인 통일

재시도/취소(AbortSignal) 옵션은 파라미터로 주입

4. 상태 설계 가이드 (Zustand Pattern)
   // features/feed-filters/model/useFeedFilterStore.ts
   'use client';
   import { create } from 'zustand';

type Sentiment = 'positive' | 'neutral' | 'negative';
type SourceType = 'SNS' | 'ECOM';

type FeedFilterState = {
sourceType: SourceType;
keyword: string;
dateRange: { start: string; end: string } | null;
channels: string[];
sentiments: Sentiment[];
topics: string[];
reactionMin?: { likes?: number; comments?: number; rating?: number; reviews?: number };
products: string[];
setSourceType: (v: SourceType) => void;
setKeyword: (v: string) => void;
setDateRange: (v: FeedFilterState['dateRange']) => void;
toggleSentiment: (s: Sentiment) => void;
reset: () => void;
};

export const useFeedFilterStore = create<FeedFilterState>((set, get) => ({
sourceType: 'SNS',
keyword: '',
dateRange: null,
channels: [],
sentiments: [],
topics: [],
products: [],
setSourceType: (v) => set({ sourceType: v }),
setKeyword: (v) => set({ keyword: v }),
setDateRange: (v) => set({ dateRange: v }),
toggleSentiment: (s) => {
const next = new Set(get().sentiments);
next.has(s) ? next.delete(s) : next.add(s);
set({ sentiments: Array.from(next) });
},
reset: () =>
set({
sourceType: 'SNS',
keyword: '',
dateRange: null,
channels: [],
sentiments: [],
topics: [],
products: [],
reactionMin: undefined,
}),
}));

SSR/Hydration 유의: 상태는 클라이언트 경로에서만 구독. 서버 컴포넌트에서 전역 상태에 의존하지 말고, 필요한 값은 props로 주입.

5. 서비스 레이어 (API Pattern)
   // shared/lib/axios.ts
   import axios from 'axios';

export const api = axios.create({
baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
timeout: 15000,
});

api.interceptors.response.use(
(res) => res,
(err) => {
// 표준 에러 객체로 변환
const status = err?.response?.status ?? 0;
const message = err?.response?.data?.message ?? err.message;
return Promise.reject({ status, message, cause: err });
}
);

// features/feed-filters/service/feed.service.ts
import { api } from '@/shared/lib/axios';

export type FeedItem = {
id: string;
source: 'instagram' | 'youtube' | 'naver' | 'smartstore';
title: string;
sentiment: 'positive' | 'neutral' | 'negative';
likes?: number;
comments?: number;
rating?: number;
reviewCount?: number;
createdAt: string;
};

export type FetchFeedParams = {
sourceType: 'SNS' | 'ECOM';
keyword?: string;
dateStart?: string;
dateEnd?: string;
channels?: string[];
sentiments?: string[];
topics?: string[];
products?: string[];
reactionMin?: { likes?: number; comments?: number; rating?: number; reviews?: number };
signal?: AbortSignal;
};

export async function fetchFeed(params: FetchFeedParams): Promise<FeedItem[]> {
const { signal, ...query } = params;
const { data } = await api.get('/feed', { params: query, signal });
return data;
}

규약: 서비스에서만 HTTP 호출. 페이지/컴포넌트는 서비스를 호출하고, 상태 업데이트는 store action에서 수행.

6. Claude 작업 규칙 (Agent Rules)

Claude가 할 일

요청 의도/범위 명시 → 영향 파일 목록 제시 → 안전한 변경 계획 수립 → 변경

변경 전후 diff 요약 + 검증 체크리스트 출력

런타임/타입/린트/테스트 오류를 자동 탐지하고 수정 제안

복잡한 변경은 단계적 PR로 분할 제안

Claude가 하면 안 되는 일

shared/lib/axios.ts의 프로덕션 헤더/토큰 처리 임의 변경 금지

상태/서비스 폴더 구조/이름 규약 임의 변경 금지

API 스키마가 불명확할 때 가정으로 타입을 확정하지 말 것(예시/가짜 데이터는 fixtures/에 국한)

PR 메시지 템플릿(Claude 출력 형식)

feat(feed-filters): add sentiment toggle & param wiring

-   add Zustand action: toggleSentiment
-   wire query params to service layer (fetchFeed)
-   update UI bindings and memoized selectors
    Tests: added unit test for toggleSentiment
    Risk: low (UI only); Rollback: revert feature slice & UI bindings

7. 워크플로우 (Preferred Workflow)

이해 단계: repo map 요약, 영향 범위 식별 → 질문이 있으면 추론 대신 질문

설계 단계: 변경 계획(목표, 파일, 타입/상태 흐름, 실패 케이스) 제안

구현 단계: 작은 커밋 단위로 구현 → 각 커밋에 테스트/타입 반영

검증 단계:

타입체크/린트/유닛테스트/빌드 결과

수동 시나리오: 필터 입력 → 쿼리 파라미터 생성 → 서비스 호출 → 피드 렌더

되돌리기 전략 제시

요약: 변경사항 TL;DR + 다음 할 일

위 흐름은 Claude Code의 “공통 워크플로우” 가이드에 부합합니다.
Anthropic

8. 테스트 정책 (Testing)

단위: slice action과 순수 유틸은 입출력 기반 테스트

서비스: axios 모킹, 에러/취소/재시도 케이스 포함

컴포넌트: RTL로 상호작용 테스트(필터 토글, 입력, 호출 횟수)

예:

// tests/filters.store.test.ts
import { act } from '@testing-library/react';
import { useFeedFilterStore } from '@/features/feed-filters/model/useFeedFilterStore';

test('toggleSentiment works', () => {
const set = useFeedFilterStore.getState().toggleSentiment;
act(() => set('positive'));
expect(useFeedFilterStore.getState().sentiments).toContain('positive');
act(() => set('positive'));
expect(useFeedFilterStore.getState().sentiments).not.toContain('positive');
});

9. 성능/접근성 (Perf & a11y)

렌더 최적화: 셀렉터/메모 사용, 리스트는 key 안정성 보장

네트워크: 서버 라우트 캐싱 정책 표기, 불필요한 재호출 방지

a11y: label/role/키보드 포커스 경로 유지

10. 작업 예시 (Playbook)

요구: “감정(긍/중/부) 필터를 UI와 서비스에 연결하고, 상태 초기화 버튼 추가”

변경 계획

features/feed-filters/model: toggleSentiment, reset 확인

features/feed-filters/ui: 토글 컴포넌트에서 store 액션 바인딩

features/feed-filters/service/fetchFeed: sentiments 쿼리 파라미터 전달

테스트 케이스 3건 추가(토글, 초기화, 서비스 파라미터)

완료 기준(DoD)

UI 상호작용 → 쿼리 파라미터 반영 확인

빈 결과/에러/취소 처리 경로 확인

테스트/린트/타입/빌드 통과

11. 문서/지식 축적 (Knowledge)

Known Issues: Claude가 과거에 범한 실수/오해 기록(예: slice 오탈자, 서버 컴포넌트에서 클라이언트 훅 사용)

Glossary: 도메인 용어/약어 정의

API 계약: 엔드포인트·스키마·에러 규약 링크

성숙한 코드베이스에서는 도구의 반복 실수를 문서화하여 팀이 공유하는 것이 효과적입니다.
Huikang’s blog

12. Claude에게 주는 힌트 (Prompting Tips)

맥락 우선: 이 파일의 규칙/구조를 먼저 따를 것

명확한 목표/제약/출력 형식을 매 요청에 선언

자체 검증(self-review)과 작업 계획을 항상 포함

변경 후 요약·체크리스트를 출력

명확한 스펙과 작업 지시를 앞에 두는 것이 성능을 높입니다.
