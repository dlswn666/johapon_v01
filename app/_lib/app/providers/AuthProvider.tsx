'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { User } from '@/app/_lib/shared/type/database.types';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { KAKAO_SERVICE_TERMS_STRING } from '@/app/_lib/shared/constants/kakaoServiceTerms';

// 사용자 역할 타입
export type UserRole = 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';

interface AuthContextType {
    user: User | null; // 현재 조합에서의 프로필
    authUser: SupabaseUser | null; // Supabase 인증 계정 정보
    session: Session | null;
    isLoading: boolean; // 초기 로딩 상태
    isUserFetching: boolean; // 프로필 전환/조회 중 상태
    userStatus: 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null; // 사용자 상태
    isAuthenticated: boolean; // 로그인 여부
    isSystemAdmin: boolean; // 시스템 관리자 여부
    isAdmin: boolean; // 관리자(조합/시스템) 여부
    login: (provider: 'kakao' | 'naver', slug?: string) => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUserFetching, setIsUserFetching] = useState(false);

    const currentSlug = pathname?.split('/')[1] || null;

    // 캐싱 및 레이스 컨디션 방지용 Refs
    const unionCache = useRef<Record<string, string>>({});
    const processingRef = useRef<string | null>(null);

    /**
     * Slug로 Union ID 조회 (캐싱 적용)
     */
    const getUnionIdBySlug = useCallback(async (slug: string): Promise<string | null> => {
        if (unionCache.current[slug]) return unionCache.current[slug];
        const { data } = await supabase.from('unions').select('id').eq('slug', slug).single();
        if (data?.id) {
            unionCache.current[slug] = data.id;
            return data.id;
        }
        return null;
    }, []);

    /**
     * 사용자의 계정 ID와 현재 Slug를 기반으로 최적의 프로필(User)을 결정
     */
    const resolveUserProfile = useCallback(
        async (authUserId: string, slug: string | null): Promise<User | null> => {
            setIsUserFetching(true);
            try {
                // 1. 계정에 연결된 모든 프로필 ID 조회
                const { data: links } = await supabase
                    .from('user_auth_links')
                    .select('user_id')
                    .eq('auth_user_id', authUserId);
                if (!links || links.length === 0) return null;
                const userIds = links.map((l) => l.user_id);

                // 2. 시스템 관리자 권한 확인 (전역 권한)
                const { data: systemAdmin } = await supabase
                    .from('users')
                    .select('*')
                    .in('id', userIds)
                    .eq('role', 'SYSTEM_ADMIN')
                    .single();
                if (systemAdmin) return systemAdmin as User;

                // 3. 현재 접속한 조합(Slug)에 맞는 프로필 확인
                if (slug) {
                    const unionId = await getUnionIdBySlug(slug);
                    if (unionId) {
                        const { data: unionUser } = await supabase
                            .from('users')
                            .select('*')
                            .in('id', userIds)
                            .eq('union_id', unionId)
                            .single();
                        if (unionUser) return unionUser as User;
                    }
                }

                return null; // 맞는 프로필 없음 (신규 유저 혹은 타 조합원)
            } catch (error) {
                console.error('Profile resolution error:', error);
                return null;
            } finally {
                setIsUserFetching(false);
            }
        },
        [getUnionIdBySlug]
    );

    /**
     * 초기 세션 로드 및 상태 변경 감지
     */
    useEffect(() => {
        const initAuth = async () => {
            const {
                data: { session: initSession },
            } = await supabase.auth.getSession();
            setSession(initSession);
            setAuthUser(initSession?.user ?? null);

            if (initSession?.user) {
                const profile = await resolveUserProfile(initSession.user.id, currentSlug);
                setUser(profile);
            }
            setIsLoading(false);
        };

        initAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log(`[AUTH_EVENT] ${event}`);
            setSession(newSession);
            setAuthUser(newSession?.user ?? null);

            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (newSession?.user) {
                // 불필요한 반복 호출 방지
                const taskKey = `${newSession.user.id}-${currentSlug}`;
                if (processingRef.current === taskKey) return;
                processingRef.current = taskKey;

                const profile = await resolveUserProfile(newSession.user.id, currentSlug);
                setUser(profile);
                processingRef.current = null;
            }
        });

        return () => subscription.unsubscribe();
    }, [currentSlug, resolveUserProfile]);

    /**
     * 로그인/로그아웃 함수들
     */
    const login = useCallback(async (provider: 'kakao' | 'naver', slug?: string) => {
        if (provider === 'kakao') {
            const redirectTo = `${window.location.origin}/auth/callback${slug ? `?slug=${slug}` : ''}`;
            await supabase.auth.signInWithOAuth({
                provider: 'kakao',
                options: { redirectTo, queryParams: { service_terms: KAKAO_SERVICE_TERMS_STRING } },
            });
        } else if (provider === 'naver') {
            window.location.href = `/api/auth/naver${slug ? `?slug=${slug}` : ''}`;
        }
    }, []);

    const loginWithEmail = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        return { success: true };
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setAuthUser(null);
        setSession(null);
        router.push('/');
    }, [router]);

    const refreshUser = useCallback(async () => {
        if (authUser) setUser(await resolveUserProfile(authUser.id, currentSlug));
    }, [authUser, currentSlug, resolveUserProfile]);

    // 파생 상태 계산
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
    const isAdmin = isSystemAdmin || user?.role === 'ADMIN';
    const isAuthenticated = !!authUser;
    const userStatus = user?.user_status ?? null;

    const value = useMemo(
        () => ({
            user,
            authUser,
            session,
            isLoading,
            isUserFetching,
            userStatus,
            isAuthenticated,
            isSystemAdmin,
            isAdmin,
            login,
            loginWithEmail,
            logout,
            refreshUser,
        }),
        [
            user,
            authUser,
            session,
            isLoading,
            isUserFetching,
            userStatus,
            isAuthenticated,
            isSystemAdmin,
            isAdmin,
            login,
            loginWithEmail,
            logout,
            refreshUser,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
