'use client';

import React, { useEffect, useRef } from 'react';

interface QrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // html5-qrcode는 클라이언트에서만 동작
    let scanner: { clear: () => Promise<void> } | null = null;

    const initScanner = async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        const scannerId = 'qr-reader-' + Math.random().toString(36).slice(2);
        const div = document.createElement('div');
        div.id = scannerId;
        containerRef.current?.appendChild(div);

        const qrScanner = new Html5QrcodeScanner(
          scannerId,
          { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
          false
        );

        qrScanner.render(
          (decodedText: string) => {
            onScan(decodedText);
          },
          (errorMessage: string) => {
            // 스캔 실패는 일반적으로 무시 (프레임마다 발생)
            if (!errorMessage.includes('QR code parse error') && !errorMessage.includes('No MultiFormat Readers')) {
              onError?.(errorMessage);
            }
          }
        );

        scanner = qrScanner;
        scannerRef.current = qrScanner;
      } catch (err) {
        console.error('QR 스캐너 초기화 실패:', err);
        onError?.('카메라를 초기화할 수 없습니다. 카메라 권한을 확인해주세요.');
      }
    };

    initScanner();

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {
          // 정리 중 에러 무시
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" />
      <p className="text-xs text-gray-400 text-center mt-2">
        카메라에 QR 코드를 비춰주세요
      </p>
    </div>
  );
}
