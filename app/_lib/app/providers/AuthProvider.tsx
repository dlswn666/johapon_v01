'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { User } from '@/app/_lib/shared/type/database.types';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { KAKAO_SERVICE_TERMS_STRING } from '@/app/_lib/shared/constants/kakaoServiceTerms';
import BlockedUserModal from '@/app/_lib/widgets/common/BlockedUserModal';

// 사용자 역할 타입
export type UserRole = 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';

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

    // 마운트 로그
    useEffect(() => {
        console.log('[DEBUG] 🚀 AuthProvider mounted', {
            timestamp: new Date().toISOString()
        });
    }, []);

    // isUserFetching 워치독 (무한 로딩 방지용)
    useEffect(() => {
        if (isUserFetching) {
            const timer = setTimeout(() => {
                console.warn('[DEBUG] 🚨 Watchdog: isUserFetching is stuck for 15s. Force resetting loading states.');
                setIsUserFetching(false);
                setIsLoading(false);
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [isUserFetching]);

    const currentSlug = pathname?.split('/')[1] || null;

    // 캐싱 및 레이스 컨디션 방지용 Refs
    const unionCache = useRef<Record<string, string>>({});
    const processingSessionRef = useRef<string | null>(null); // 세션 처리 중복 방지

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
        async (authUserId: string, slug: string | null, silent = false): Promise<User | null> => {
            console.log('[DEBUG] resolveUserProfile 시작', { authUserId, slug, silent });
            if (!silent) setIsUserFetching(true);

            // 타임아웃 헬퍼 (15초 - 네트워크 지연 대응)
            const queryTimeout = (ms: number = 15000) => new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
            );
            try {
                // 1. 계정에 연결된 모든 프로필 ID 조회
                console.log('[DEBUG] 1. user_auth_links 조회 시작');
                const { data: links, error: linksError } = await Promise.race([
                    supabase
                        .from('user_auth_links')
                        .select('user_id')
                        .eq('auth_user_id', authUserId),
                    queryTimeout() as Promise<never>
                ]);
                
                if (linksError) {
                    console.error('[DEBUG] ❌ user_auth_links 조회 에러:', linksError);
                    return null;
                }
                
                if (!links || links.length === 0) {
                    console.log('[DEBUG] ⚠️ No links found for auth user');
                    return null;
                }
                
                const userIds = links.map((l) => l.user_id);
                console.log('[DEBUG] 📦 연동된 userIds:', userIds);

                // 2. 시스템 관리자 권한 확인 (전역 권한)
                console.log('[DEBUG] 2. SYSTEM_ADMIN 권한 확인 시작');
                const { data: systemAdmin, error: adminError } = await Promise.race([
                    supabase
                        .from('users')
                        .select('*')
                        .in('id', userIds)
                        .eq('role', 'SYSTEM_ADMIN')
                        .maybeSingle(),
                    queryTimeout() as Promise<never>
                ]);
                
                if (adminError) {
                    console.error('[DEBUG] ❌ SYSTEM_ADMIN 확인 중 에러:', adminError);
                }

                if (systemAdmin) {
                    console.log('[DEBUG] ✅ SYSTEM_ADMIN 발견');
                    return systemAdmin as User;
                }

                // 3. 현재 접속한 조합(Slug)에 맞는 프로필 확인
                const RESERVED_SLUGS = ['systemAdmin', 'auth', 'api', 'admin', 'not-found', 'login'];
                if (slug && !RESERVED_SLUGS.includes(slug)) {
                    console.log('[DEBUG] 3. 현재 조합 프로필 확인 시작', { slug });
                    const unionId = await getUnionIdBySlug(slug);
                    if (unionId) {
                        console.log('[DEBUG] 🔍 unionId 발견:', unionId);
                        const { data: unionUser, error: unionUserError } = await Promise.race([
                            supabase
                                .from('users')
                                .select('*')
                                .in('id', userIds)
                                .eq('union_id', unionId)
                                .maybeSingle(),
                            queryTimeout() as Promise<never>
                        ]);
                        
                        if (unionUserError) {
                            console.error('[DEBUG] ❌ 조합 프로필 확인 중 에러:', unionUserError);
                        }

                        if (unionUser) {
                            console.log('[DEBUG] ✅ 조합 프로필 발견');
                            return unionUser as User;
                        } else {
                            console.log('[DEBUG] ⚠️ 해당 조합에 프로필 없음');
                        }
                    } else {
                        console.log('[DEBUG] ⚠️ 해당 slug에 대한 조합 ID를 찾을 수 없음');
                    }
                } else if (slug) {
                    console.log('[DEBUG] ⏭️ Reserved slug 스킵:', slug);
                }

                console.log('[DEBUG] 🤷‍♀️ 적절한 프로필을 찾을 수 없음');
                return null; // 맞는 프로필 없음 (신규 유저 혹은 타 조합원)
            } catch (error) {
                console.error('[DEBUG] 💥 Profile resolution error:', error);
                return null;
            } finally {
                console.log('[DEBUG] resolveUserProfile 종료 - isUserFetching(false)');
                setIsUserFetching(false);
            }
        },
        [getUnionIdBySlug]
    );

    const handleSessionWithUser = useCallback(async (newSession: Session | null, event: string, silent = false) => {
        const sessionId = newSession?.user?.id || 'no-session-id';
        const processKey = `${sessionId}-${currentSlug}`;

        if (processingSessionRef.current === processKey) {
            console.log(`[DEBUG] ⏭️ Already processing session for user ${sessionId} on slug ${currentSlug}, skipping...`);
            return;
        }

        console.log(`[DEBUG] ⏳ Setting isUserFetching(true) for user ${sessionId} on slug ${currentSlug}`);
        processingSessionRef.current = processKey;
        if (!silent) setIsUserFetching(true);

        try {
            setSession(newSession);
            setAuthUser(newSession?.user ?? null);

            if (newSession?.user) {
                console.log(`[DEBUG] 🔍 Resolving profile for user ${newSession.user.id} (event: ${event}, silent: ${silent})`);
                const profile = await resolveUserProfile(newSession.user.id, currentSlug, silent);
                console.log(`[DEBUG] ✅ Profile resolved for user ${newSession.user.id}:`, profile ? '성공' : '없음');
                setUser(profile);
            } else {
                console.log('[DEBUG] 🗑️ No user in session, clearing user profile.');
                setUser(null);
            }
        } catch (err) {
            console.error(`[DEBUG] 💥 Error handling session for user ${sessionId}:`, err);
        } finally {
            console.log(`[DEBUG] 🏁 Finishing session processing for user ${sessionId}`);
            setIsUserFetching(false);
            processingSessionRef.current = null;
            console.log('[DEBUG] handleSessionWithUser 완료');
        }
    }, [currentSlug, resolveUserProfile]);

    /**
     * 초기 세션 로드 및 상태 변경 감지
     */
    useEffect(() => {
        const initAuth = async () => {
            console.log('[AUTH_DEBUG] 🚀 initAuth 시작');
            
            // 타임아웃 헬퍼 (10초로 증설)
            const timeout = (ms: number) => new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
            );

            try {
                console.log('[AUTH_DEBUG] ⏳ getSession 호출 중...');
                const {
                    data: { session: initSession },
                    error
                } = await Promise.race([
                    supabase.auth.getSession(),
                    timeout(10000) as Promise<never>
                ]);

                if (error) {
                    console.error('[AUTH_DEBUG] ❌ 세션 조회 에러:', error);
                }

                console.log('[AUTH_DEBUG] 📦 초기 세션:', initSession ? '있음' : '없음');
                setSession(initSession);
                setAuthUser(initSession?.user ?? null);

                if (initSession?.user) {
                    console.log('[AUTH_DEBUG]  handleSessionWithUser 호출 (initAuth)');
                    await handleSessionWithUser(initSession, 'INITIAL_SESSION', false);
                }
            } catch (err) {
                console.error('[AUTH_DEBUG] 💥 initAuth 에러 (타임아웃 포함):', err);
            } finally {
                setIsLoading(false);
                console.log('[AUTH_DEBUG] 🔚 initAuth 종료 (isLoading: false)');
            }
        };

        initAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log(`[AUTH_DEBUG] 🔔 [AUTH_EVENT] ${event}`);
            
            try {
                if (event === 'SIGNED_OUT') {
                    console.log('[DEBUG] 🗑️ SIGNED_OUT 처리');
                    setUser(null);
                } else if (newSession?.user) {
                    // 사용자 ID가 변경된 경우에만 로딩 표시와 함께 프로필 재갱신
                    // 단순 세션 갱신(TOKEN_REFRESHED 등)이거나 포커스 이벤트로 인한 중복 호출이면 무시
                    const isUserChanged = authUser?.id !== newSession.user.id;
                    
                    if (event === 'SIGNED_IN' && userRef.current && !isUserChanged) {
                        console.log('[DEBUG] ⏭️ SIGNED_IN 스킵 (이미 user가 있고 ID 동일)');
                        return;
                    }

                    if (isUserFetchingRef.current && !isUserChanged) {
                         console.log('[DEBUG] ⏭️ Auth 이벤트 스킵 (이미 fetch 중이고 ID 동일)');
                         return;
                    }

                    console.log(`[DEBUG] 🔄 Handling session for event: ${event}, Silent: ${!isUserChanged}`);
                    await handleSessionWithUser(newSession, event, !isUserChanged);
                } else {
                    console.log(`[DEBUG] 🤷‍♀️ Unhandled auth event or no user in session: ${event}`);
                    setUser(null);
                    setAuthUser(null);
                    setSession(null);
                }
            } catch (err) {
                console.error('[AUTH_DEBUG] 💥 onAuthStateChange 에러:', err);
            }
        });

        return () => {
            console.log('[AUTH_DEBUG] 🔌 AuthProvider useEffect Cleanup');
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
    const isAuthenticated = !!authUser;
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
