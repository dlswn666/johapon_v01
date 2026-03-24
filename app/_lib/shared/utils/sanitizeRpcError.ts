const KNOWN_ERRORS: Record<string, string> = {
  '이미 투표하셨습니다': '이미 투표하셨습니다.',
  '투표 기간이 아닙니다': '현재 투표 기간이 아닙니다.',
  'poll is not open': '투표가 마감되었습니다.',
  'already voted': '이미 투표하셨습니다.',
  'invalid nonce': '인증이 만료되었습니다. 다시 시도해주세요.',
  'nonce expired': '인증이 만료되었습니다. 다시 시도해주세요.',
};

export function sanitizeRpcError(errorMessage: string | undefined): string {
  if (!errorMessage) return '일시적 오류가 발생했습니다.';
  for (const [pattern, safeMessage] of Object.entries(KNOWN_ERRORS)) {
    if (errorMessage.includes(pattern)) return safeMessage;
  }
  // Korean messages are intentionally set by RPC — safe to pass through
  if (/^[가-힣\s.,!?·()0-9]+$/.test(errorMessage)) return errorMessage;
  // English/technical messages — generic fallback, log original for debugging
  console.error('RPC error (sanitized):', errorMessage);
  return '투표 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}
