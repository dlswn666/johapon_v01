'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pen, Eraser } from 'lucide-react';
import { useIsMobile } from '@/app/_lib/shared/hooks/useMediaQuery';
import type { SignerRole } from '@/app/_lib/shared/type/assembly.types';
import { SIGNER_ROLE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => void;
  signerName: string;
  signerRole: SignerRole;
  documentTitle: string;
  isSubmitting?: boolean;
}

/** 전자서명 캡처 모달 (HTML5 Canvas) */
export default function SignatureModal({
  open,
  onClose,
  onConfirm,
  signerName,
  signerRole,
  documentTitle,
  isSubmitting = false,
}: SignatureModalProps) {
  const [hasStrokes, setHasStrokes] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const isMobile = useIsMobile();

  // DPI-aware 캔버스 초기화
  const setupCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = isMobile ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isMobile]);

  useEffect(() => {
    if (open && canvasRef.current) {
      // 약간의 딜레이 후 초기화 (Dialog 렌더링 대기)
      const timer = setTimeout(() => {
        if (canvasRef.current) setupCanvas(canvasRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, setupCanvas]);

  const getPoint = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getPoint(e);
    setHasStrokes(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) e.preventDefault();
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvasRef.current.width / dpr, canvasRef.current.height / dpr);
    setHasStrokes(false);
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !hasStrokes) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      clearCanvas();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={isMobile ? 'max-w-[95vw]' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5" />
            서명하기
          </DialogTitle>
          <DialogDescription>
            {signerName} ({SIGNER_ROLE_LABELS[signerRole]}) - {documentTitle}
          </DialogDescription>
        </DialogHeader>

        {/* 캔버스 영역 */}
        <div className="mt-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair"
              style={{
                height: isMobile ? 'calc((100vw - 64px) * 0.5)' : '240px',
                minHeight: '120px',
                touchAction: 'none',
              }}
              aria-label="서명 캔버스"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          {!hasStrokes && (
            <p className="text-sm text-gray-400 text-center mt-2">
              캔버스에 서명하세요
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className={`mt-4 flex ${isMobile ? 'flex-col' : 'justify-end'} gap-2`}>
          <Button
            variant="outline"
            onClick={clearCanvas}
            disabled={!hasStrokes}
            className={isMobile ? 'w-full min-h-[44px]' : ''}
          >
            <Eraser className="w-4 h-4 mr-2" />
            지우기
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasStrokes || isSubmitting}
            aria-disabled={!hasStrokes}
            className={isMobile ? 'w-full min-h-[44px]' : ''}
          >
            <Pen className="w-4 h-4 mr-2" />
            {isSubmitting ? '서명 중...' : '확인'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
