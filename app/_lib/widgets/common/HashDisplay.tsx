'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashDisplayProps {
  hash: string | null;
  label?: string;
  className?: string;
}

/** 해시 프로그레시브 디스클로저 (축약 <-> 전체 토글) */
export default function HashDisplay({ hash, label = '해시', className = '' }: HashDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!hash) {
    return (
      <span className={`text-xs text-gray-400 ${className}`}>
        {label}: 없음
      </span>
    );
  }

  const shortened = `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <span className="text-gray-500">{label}:</span>
      <button
        onClick={() => setExpanded(!expanded)}
        className="font-mono text-gray-700 hover:text-blue-600 transition-colors"
        title={expanded ? '축약 보기' : '전체 보기'}
      >
        {expanded ? hash : shortened}
      </button>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-gray-600 p-0.5"
        title="복사"
      >
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
