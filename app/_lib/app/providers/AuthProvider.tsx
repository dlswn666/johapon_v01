'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { User } from '@/app/_lib/shared/type/database.types';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { KAKAO_SERVICE_TERMS_STRING } from '@/app/_lib/shared/constants/kakaoServiceTerms';
import BlockedUserModal from '@/app/_lib/widgets/common/BlockedUserModal';

import { isLocalhost } from '@/app/_lib/shared/utils/isLocalhost';

// 사용자 역할 타입
export type UserRole = 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';

/**
 * 개발용 systemAdmin 목(mock) 사용자 데이터
 * localhost 개발 환경에서만 사용됨
 */
const DEV_SYSTEM_ADMIN_USER: User = {
    id: 'systemAdmin',
    name: '개발용 시스템관리자',
    email: 'dev-admin@localhost.dev',
    phone_number: '010-0000-0000',
    role: 'SYSTEM_ADMIN',
    user_status: 'APPROVED',
    union_id: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    approved_at: new Date().toISOString(),
    birth_date: null,
    blocked_at: null,
    blocked_reason: null,
    executive_sort_order: null,
    executive_title: null,
    is_blocked: false,
    is_executive: false,
    notes: null,
    property_address: null,
    property_address_detail: null,
    property_type: null,
    property_zonecode: null,
    rejected_at: null,
    rejected_reason: null,
    resident_address: null,
    resident_address_detail: null,
    resident_address_jibun: null,
    resident_address_road: null,
    resident_zonecode: null,
};

interface AuthContextType {
    user: User | null; // 현재 조합에서의 프로필
    authUser: SupabaseUser | null; // Supabase 인증 계정 정보
    session: Session | null;
    isLoading: boolean; // 초기 로딩 상태
    isUserFetching: boolean; // 프로필 전환/조회 중 상태
    userStatus: 'PRE_REGISTERED' | 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null; // 사용자 상태
    isAuthenticated: boolean; // 로그인 여부
    isSystemAdmin: boolean; // 시스템 관리자 여부
    isAdmin: boolean; // 관리자(조합/시스템) 여부
    isBlocked: boolean; // 차단 여부
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

    // user 상태를 ref로 추적하여 클로저 문제 방지
    const userRef = useRef<User | null>(user);
    const isLoadingRef = useRef<boolean>(isLoading);
    const isUserFetchingRef = useRef<boolean>(isUserFetching);

    // ref 동기화
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        isUserFetchingRef.current = isUserFetching;
    }, [isUserFetching]);

    // isUserFetching 워치독 (무한 로딩 방지용)
    useEffect(() => {
        if (isUserFetching) {
            const timer = setTimeout(() => {
                console.warn('[AUTH] Watchdog: isUserFetching stuck for 15s, force reset.');
                setIsUserFetching(false);
                setIsLoading(false);
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [isUserFetching]);

    const currentSlug = pathname?.split('/')[1] || null;

    // 레이스 컨디션 방지용 Ref
    const processingSessionRef = useRef<string | null>(null);

    /**
     * 사용자의 계정 ID와 현재 Slug를 기반으로 최적의 프로필(User)을 결정
     * 단일 RPC 호출로 3~4개 순차 쿼리를 1회로 축소 (800ms+ → ~200ms)
     */
    const resolveUserProfile = useCallback(
        async (authUserId: string, slug: string | null, silent = false): Promise<User | null> => {
            if (!silent) setIsUserFetching(true);

            try {
                const RESERVED_SLUGS = ['systemAdmin', 'auth', 'api', 'admin', 'not-found', 'login'];
                const effectiveSlug = slug && !RESERVED_SLUGS.includes(slug) ? slug : null;

                const { data, error } = await Promise.race([
                    supabase.rpc('resolve_user_profile', {
                        p_auth_user_id: authUserId,
                        p_slug: effectiveSlug,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Profile resolution timeout')), 10000)
                    ),
                ]);

                if (error) {
                    console.error('[AUTH] Profile resolution error:', error);
                    return null;
                }

                if (!data || data.length === 0) {
                    return null;
                }

                return data[0] as User;
            } catch (error) {
                console.error('[AUTH] Profile resolution error:', error);
                return null;
            } finally {
                setIsUserFetching(false);
            }
        },
        []
    );

    const handleSessionWithUser = useCallback(async (newSession: Session | null, event: string, silent = false) => {
        const sessionId = newSession?.user?.id || 'no-session';
        const processKey = `${sessionId}-${currentSlug}`;

        if (processingSessionRef.current === processKey) return;

        processingSessionRef.current = processKey;
        if (!silent) setIsUserFetching(true);

        try {
            setSession(newSession);
            setAuthUser(newSession?.user ?? null);

            if (newSession?.user) {
                const profile = await resolveUserProfile(newSession.user.id, currentSlug, silent);
                setUser(profile);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error('[AUTH] Session handling error:', err);
        } finally {
            setIsUserFetching(false);
            processingSessionRef.current = null;
        }
    }, [currentSlug, resolveUserProfile]);

    /**
     * 초기 세션 로드 및 상태 변경 감지
     */
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            // [DEV ONLY] localhost 환경에서는 인증 스킵하고 systemAdmin으로 자동 로그인
            if (isLocalhost()) {
                setUser(DEV_SYSTEM_ADMIN_USER);
                setAuthUser(null);
                setSession(null);
                setIsLoading(false);
                return;
            }

            try {
                const {
                    data: { session: initSession },
                } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Session timeout')), 10000)
                    ),
                ]);

                if (!isMounted) return;

                if (initSession?.user) {
                    // handleSessionWithUser가 session/authUser/user 모두 설정
                    await handleSessionWithUser(initSession, 'INITIAL_SESSION', false);
                } else {
                    setSession(null);
                    setAuthUser(null);
                }
            } catch (err) {
                console.error('[AUTH] initAuth error:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initAuth();

        // [DEV ONLY] localhost 환경에서는 auth 이벤트 무시
        if (isLocalhost()) {
            return () => { isMounted = false; };
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!isMounted) return;

            try {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setAuthUser(null);
                    setSession(null);
                } else if (newSession?.user) {
                    const isUserChanged = authUser?.id !== newSession.user.id;

                    // 이미 프로필이 있고 같은 사용자면 스킵
                    if (event === 'SIGNED_IN' && userRef.current && !isUserChanged) return;
                    if (isUserFetchingRef.current && !isUserChanged) return;

                    await handleSessionWithUser(newSession, event, !isUserChanged);
                } else {
                    setUser(null);
                    setAuthUser(null);
                    setSession(null);
                }
            } catch (err) {
                console.error('[AUTH] Auth state change error:', err);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [currentSlug, resolveUserProfile, handleSessionWithUser, authUser?.id]);

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
        const { data: { user: latestAuthUser } } = await supabase.auth.getUser();
        if (latestAuthUser) {
            setAuthUser(latestAuthUser);
            setUser(await resolveUserProfile(latestAuthUser.id, currentSlug));
        }
    }, [currentSlug, resolveUserProfile]);

    // 파생 상태 계산
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
    const isAdmin = isSystemAdmin || user?.role === 'ADMIN';
    // [DEV ONLY] localhost에서는 user가 있으면 인증된 것으로 처리
    const isAuthenticated = !!authUser || (isLocalhost() && !!user);
    const userStatus = (user?.user_status ?? null) as 'PRE_REGISTERED' | 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
    const isBlocked = user?.is_blocked ?? false;

    // 조합 전화번호 상태 (차단 모달용)
    const [unionPhone, setUnionPhone] = useState<string | null>(null);

    // 차단된 사용자의 조합 전화번호 조회
    useEffect(() => {
        const fetchUnionPhone = async () => {
            if (isBlocked && user?.union_id) {
                const { data } = await supabase
                    .from('unions')
                    .select('phone')
                    .eq('id', user.union_id)
                    .single();
                if (data?.phone) {
                    setUnionPhone(data.phone);
                }
            } else {
                setUnionPhone(null);
            }
        };
        fetchUnionPhone();
    }, [isBlocked, user?.union_id]);

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
            isBlocked,
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
            isBlocked,
            login,
            loginWithEmail,
            logout,
            refreshUser,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
            {/* 차단된 사용자 모달 (관리자는 제외) */}
            {isBlocked && !isAdmin && (
                <BlockedUserModal 
                    reason={user?.blocked_reason || null} 
                    unionPhone={unionPhone}
                />
            )}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
