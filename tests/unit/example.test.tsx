import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * 예시 테스트 파일
 * 실제 프로젝트의 컴포넌트에 맞게 수정하세요.
 */

// 간단한 버튼 컴포넌트 테스트 예시
describe('Button Component', () => {
  it('버튼이 렌더링되어야 함', () => {
    // 실제 Button 컴포넌트로 교체
    render(<button>테스트 버튼</button>);
    expect(screen.getByText('테스트 버튼')).toBeInTheDocument();
  });

  it('클릭 시 핸들러가 호출되어야 함', () => {
    const handleClick = vi.fn();
    render(<button onClick={handleClick}>클릭</button>);
    
    fireEvent.click(screen.getByText('클릭'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// 유틸리티 함수 테스트 예시
describe('Utility Functions', () => {
  it('formatDate 함수 테스트 예시', () => {
    // 실제 유틸리티 함수로 교체
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    const result = formatDate(new Date('2024-01-15'));
    expect(result).toBe('2024-01-15');
  });
});

// API 호출 테스트 예시
describe('API Functions', () => {
  it('fetch 호출 테스트 예시', async () => {
    // fetch mock 설정
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    const response = await fetch('/api/test');
    const data = await response.json();

    expect(data).toEqual({ data: 'test' });
    expect(fetch).toHaveBeenCalledWith('/api/test');
  });
});

/**
 * 테스트 작성 가이드라인:
 * 
 * 1. 테스트 파일 명명: [컴포넌트명].test.tsx
 * 2. describe로 컴포넌트/함수 그룹화
 * 3. it으로 개별 테스트 케이스 작성
 * 4. 한글로 테스트 설명 작성 권장
 * 5. AAA 패턴: Arrange(준비) → Act(실행) → Assert(검증)
 */
