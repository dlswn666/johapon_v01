import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isLocalhost } from '@/app/_lib/shared/utils/isLocalhost';

/**
 * isLocalhost 함수 테스트
 * BUG-001: localhost 접속 시 systemAdmin 자동 로그인 기능
 */

describe('isLocalhost', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let originalLocation: Location;

  beforeEach(() => {
    // window.location 백업
    originalLocation = window.location;
  });

  afterEach(() => {
    // 환경 복원
    (process.env as { NODE_ENV: string }).NODE_ENV = originalNodeEnv as string;
    // window.location 복원
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  describe('development 환경', () => {
    beforeEach(() => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'development';
    });

    it('hostname이 localhost일 때 true를 반환해야 함', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true,
      });

      expect(isLocalhost()).toBe(true);
    });

    it('hostname이 127.0.0.1일 때 true를 반환해야 함', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: '127.0.0.1' },
        writable: true,
      });

      expect(isLocalhost()).toBe(true);
    });

    it('hostname이 외부 도메인일 때 false를 반환해야 함', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com' },
        writable: true,
      });

      expect(isLocalhost()).toBe(false);
    });

    it('hostname이 vercel 도메인일 때 false를 반환해야 함', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'my-app.vercel.app' },
        writable: true,
      });

      expect(isLocalhost()).toBe(false);
    });
  });

  describe('production 환경', () => {
    beforeEach(() => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    });

    it('production에서 hostname이 localhost여도 false를 반환해야 함', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true,
      });

      expect(isLocalhost()).toBe(false);
    });

    it('production에서 hostname이 127.0.0.1여도 false를 반환해야 함', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: '127.0.0.1' },
        writable: true,
      });

      expect(isLocalhost()).toBe(false);
    });
  });

  describe('서버 사이드 렌더링', () => {
    it('window가 undefined일 때 false를 반환해야 함', () => {
      // window를 undefined로 만들기 위한 테스트
      // jsdom 환경에서는 window가 항상 존재하므로 이 테스트는 스킵
      // 실제 SSR 환경에서 테스트됨
      const originalWindow = global.window;

      // @ts-expect-error - 테스트를 위해 window를 임시로 undefined로 설정
      delete global.window;

      // 함수가 에러 없이 false를 반환하는지 확인
      // Note: isLocalhost 함수 내부에서 typeof window === 'undefined' 체크가 있어야 함
      try {
        const result = isLocalhost();
        expect(result).toBe(false);
      } finally {
        // window 복원
        global.window = originalWindow;
      }
    });
  });
});
