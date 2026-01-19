// 접근 범위 타입
export type AccessScope = 'all' | 'home_only' | 'specific_page';

// 접근 토큰 (DB)
export interface AccessToken {
  id: string;
  key: string;
  name: string;
  union_id: string | null;
  access_scope: AccessScope;
  allowed_pages: string[] | null;
  expires_at: string | null;
  max_usage: number | null;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// 토큰 생성 요청
export interface CreateAccessTokenRequest {
  name: string;
  union_id?: string | null;
  access_scope?: AccessScope;
  allowed_pages?: string[];
  expires_in_days?: number | null;  // null이면 무제한
  max_usage?: number | null;        // null이면 무제한
}

// 토큰 목록 응답 (UI용)
export interface AccessTokenListItem {
  id: string;
  key: string;
  name: string;
  union_id: string | null;
  union_name?: string | null;
  access_scope: AccessScope;
  expires_at: string | null;
  max_usage: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

// 토큰 사용 로그
export interface AccessTokenLog {
  id: string;
  token_id: string;
  accessed_at: string;
  accessed_path: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

// 토큰 검증 결과
export interface TokenValidationResult {
  valid: boolean;
  token?: AccessToken;
  reason?: 'not_found' | 'deleted' | 'expired' | 'max_usage_reached';
}
