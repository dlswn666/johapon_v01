// 문서 해시 생성/검증 — 순수 TypeScript + crypto API
// 브라우저 환경에서 SubtleCrypto 사용

/** SHA-256 해시 생성 (hex 반환) */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 문서 source_json + html_content 기반 해시 생성 */
export async function generateDocumentHash(
  sourceJson: Record<string, unknown>,
  htmlContent: string | null
): Promise<string> {
  const combined = (JSON.stringify(sourceJson) || '{}') + (htmlContent || '');
  return generateHash(combined);
}

/** 해시 검증 */
export async function verifyDocumentHash(
  sourceJson: Record<string, unknown>,
  htmlContent: string | null,
  expectedHash: string
): Promise<boolean> {
  const computed = await generateDocumentHash(sourceJson, htmlContent);
  return computed === expectedHash;
}

/** 해시 축약 표시 (프로그레시브 디스클로저용) */
export function shortenHash(hash: string, length: number = 8): string {
  if (!hash) return '';
  return `${hash.substring(0, length)}...${hash.substring(hash.length - length)}`;
}
