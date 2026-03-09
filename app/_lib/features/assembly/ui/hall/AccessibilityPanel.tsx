'use client';

import { useState, useEffect } from 'react';
import { Type, Contrast } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FONT_SCALES = [1.0, 1.25, 1.5];
const FONT_LABELS = ['100%', '125%', '150%'];

/**
 * 접근성 토글 패널
 * 큰 글씨 + 고대비 모드
 */
export default function AccessibilityPanel() {
  const [fontScaleIdx, setFontScaleIdx] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SCALES[fontScaleIdx] * 100}%`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [fontScaleIdx]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    return () => {
      document.documentElement.classList.remove('high-contrast');
    };
  }, [highContrast]);

  const cycleFontScale = () => {
    setFontScaleIdx((prev) => (prev + 1) % FONT_SCALES.length);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs text-gray-600 hover:bg-gray-100"
        onClick={cycleFontScale}
        title={`글씨 크기: ${FONT_LABELS[fontScaleIdx]}`}
        aria-label={`글씨 크기 변경 (현재 ${FONT_LABELS[fontScaleIdx]})`}
      >
        <Type className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
        {FONT_LABELS[fontScaleIdx]}
      </Button>
      <Button
        size="sm"
        variant={highContrast ? 'default' : 'ghost'}
        className={`h-8 px-2 text-xs ${highContrast ? '' : 'text-gray-600 hover:bg-gray-100'}`}
        onClick={() => setHighContrast(!highContrast)}
        title={highContrast ? '고대비 해제' : '고대비 모드'}
        aria-label={highContrast ? '고대비 모드 해제' : '고대비 모드 활성화'}
        aria-pressed={highContrast}
      >
        <Contrast className="w-3.5 h-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
