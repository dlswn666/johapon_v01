/**
 * Supabase Database Types
 *
 * 이 파일은 Supabase 데이터베이스의 타입 정의를 포함합니다.
 *
 * Supabase CLI를 사용하여 자동 생성할 수 있습니다:
 * npx supabase gen types typescript --project-id <project-id> > app/_lib/shared/type/database.types.ts
 *
 * 또는 Supabase 대시보드에서 타입을 복사할 수 있습니다:
 * Project Settings > API > TypeScript Types
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Database 인터페이스
 *
 * Supabase 데이터베이스의 전체 스키마를 정의합니다.
 */
export interface Database {
    public: {
        Tables: {
            // 예시: users 테이블
            users: {
                Row: {
                    id: string;
                    name: string;
                    email: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    email: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    email?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            // 예시: posts 테이블
            posts: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    content: string;
                    status: 'draft' | 'published' | 'archived';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    content: string;
                    status?: 'draft' | 'published' | 'archived';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    content?: string;
                    status?: 'draft' | 'published' | 'archived';
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'posts_user_id_fkey';
                        columns: ['user_id'];
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            // notices 테이블
            notices: {
                Row: {
                    id: number;
                    title: string;
                    content: string;
                    author_id: string;
                    is_popup: boolean;
                    end_date: string | null;
                    views: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    title: string;
                    content: string;
                    author_id: string;
                    is_popup?: boolean;
                    end_date?: string | null;
                    views?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    title?: string;
                    content?: string;
                    author_id?: string;
                    is_popup?: boolean;
                    end_date?: string | null;
                    views?: number;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'notices_author_id_fkey';
                        columns: ['author_id'];
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: {
            // 열거형이 있는 경우 여기에 정의
            post_status: 'draft' | 'published' | 'archived';
        };
        CompositeTypes: Record<string, never>;
    };
}

/**
 * 테이블별 타입 유틸리티
 */

// Users 타입
export type User = Database['public']['Tables']['users']['Row'];
export type NewUser = Database['public']['Tables']['users']['Insert'];
export type UpdateUser = Database['public']['Tables']['users']['Update'];

// Posts 타입
export type Post = Database['public']['Tables']['posts']['Row'];
export type NewPost = Database['public']['Tables']['posts']['Insert'];
export type UpdatePost = Database['public']['Tables']['posts']['Update'];

// Notices 타입
export type Notice = Database['public']['Tables']['notices']['Row'];
export type NewNotice = Database['public']['Tables']['notices']['Insert'];
export type UpdateNotice = Database['public']['Tables']['notices']['Update'];

// Enums
export type PostStatus = Database['public']['Enums']['post_status'];

/**
 * Supabase Client 타입
 *
 * 타입이 지정된 Supabase 클라이언트를 사용할 때:
 * import { createClient } from '@supabase/supabase-js';
 * import { Database } from '@/app/_lib/shared/type/database.types';
 *
 * const supabase = createClient<Database>(url, key);
 */
