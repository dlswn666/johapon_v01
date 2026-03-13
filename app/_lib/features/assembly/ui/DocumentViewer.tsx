'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface DocumentViewerProps {
  html: string;
  className?: string;
}

/** A4 문서 뷰어 (조합원용 — DOMPurify 적용) */
export default function DocumentViewer({ html, className = '' }: DocumentViewerProps) {
  const sanitizedHtml = useMemo(() => {
    if (typeof window === 'undefined') return html;
    return DOMPurify.sanitize(html);
  }, [html]);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div
        className="document-a4"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
