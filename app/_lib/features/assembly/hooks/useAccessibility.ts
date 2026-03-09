'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

interface UseAccessibilityReturn {
  fontScale: number;
  isHighContrast: boolean;
  toggleFontScale: () => void;
  toggleHighContrast: () => void;
  cssVars: Record<string, string>;
}

const FONT_SCALES = [1.0, 1.2, 1.5] as const;
const STORAGE_KEY = 'assembly-a11y';

const MIN_TOUCH_TARGET: Record<number, string> = {
  1.0: '44px',
  1.2: '52px',
  1.5: '56px',
};

interface A11ySettings {
  fontScale: number;
  isHighContrast: boolean;
}

const loadSettings = (): A11ySettings => {
  if (typeof window === 'undefined') {
    return { fontScale: 1.0, isHighContrast: false };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<A11ySettings>;
      return {
        fontScale: FONT_SCALES.includes(parsed.fontScale as (typeof FONT_SCALES)[number])
          ? parsed.fontScale!
          : 1.0,
        isHighContrast: !!parsed.isHighContrast,
      };
    }
  } catch {
    // localStorage 접근 실패 시 기본값 사용
  }
  return { fontScale: 1.0, isHighContrast: false };
};

const saveSettings = (settings: A11ySettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage 쓰기 실패 무시
  }
};

export const useAccessibility = (): UseAccessibilityReturn => {
  const [fontScale, setFontScale] = useState(1.0);
  const [isHighContrast, setIsHighContrast] = useState(false);

  // 초기 로드 (클라이언트 전용)
  useEffect(() => {
    const settings = loadSettings();
    setFontScale(settings.fontScale);
    setIsHighContrast(settings.isHighContrast);
  }, []);

  const toggleFontScale = useCallback(() => {
    setFontScale((prev) => {
      const currentIndex = FONT_SCALES.indexOf(prev as (typeof FONT_SCALES)[number]);
      const nextIndex = (currentIndex + 1) % FONT_SCALES.length;
      const next = FONT_SCALES[nextIndex];
      setIsHighContrast((hc) => {
        saveSettings({ fontScale: next, isHighContrast: hc });
        return hc;
      });
      return next;
    });
  }, []);

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast((prev) => {
      const next = !prev;
      setFontScale((fs) => {
        saveSettings({ fontScale: fs, isHighContrast: next });
        return fs;
      });
      return next;
    });
  }, []);

  const cssVars = useMemo<Record<string, string>>(
    () => ({
      '--font-scale': String(fontScale),
      '--min-touch-target': MIN_TOUCH_TARGET[fontScale] ?? '44px',
    }),
    [fontScale],
  );

  return {
    fontScale,
    isHighContrast,
    toggleFontScale,
    toggleHighContrast,
    cssVars,
  };
};
