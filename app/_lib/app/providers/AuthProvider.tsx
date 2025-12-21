'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { User, UserStatus } from '@/app/_lib/shared/type/database.types';
import { Session, User as SupabaseUser, AuthChangeEvent } from '@supabase/supabase-js';
import { KAKAO_SERVICE_TERMS_STRING } from '@/app/_lib/shared/constants/kakaoServiceTerms';

// 사용자 역할 타입
export type UserRole = 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';

interface AuthContextType {
    user: User | null;
    authUser: SupabaseUser | null;
    session: Session | null;
    isLoading: boolean;
    isUserFetching: boolean; // user 정보 fetch 중인지 여부
    isAuthenticated: boolean;
    isSystemAdmin: boolean;
    isAdmin: boolean;
    userStatus: UserStatus | null;
    login: (provider: 'kakao' | 'naver', slug?: string) => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    // 개발용 (나중에 제거)
    switchUser: (userId: string) => void;
    mockUsers: User[];
}

// 개발용 Mock 사용자 데이터
const MOCK_USERS: User[] = [
    {
        id: 'systemAdmin',
        name: '시스템 관리자',
        email: 'admin@johapon.com',
        phone_number: '010-1234-5678',
        role: 'SYSTEM_ADMIN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        union_id: null,
        user_status: 'APPROVED',
        birth_date: null,
        property_address: null,
        property_address_detail: null,
        property_address_road: null,
        property_address_jibun: null,
        property_zonecode: null,
        rejected_reason: null,
        approved_at: null,
        rejected_at: null,
    },
    {
        id: 'admin',
        name: '조합 관리자',
        email: 'union-admin@example.com',
        phone_number: '010-2345-6789',
        role: 'ADMIN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        union_id: null,
        user_status: 'APPROVED',
        birth_date: null,
        property_address: null,
        property_address_detail: null,
        property_address_road: null,
        property_address_jibun: null,
        property_zonecode: null,
        rejected_reason: null,
        approved_at: null,
        rejected_at: null,
    },
    {
        id: 'user',
        name: '일반 사용자',
        email: 'user@example.com',
        phone_number: '010-3456-7890',
        role: 'USER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        union_id: null,
        user_status: 'APPROVED',
        birth_date: null,
        property_address: null,
        property_address_detail: null,
        property_address_road: null,
        property_address_jibun: null,
        property_zonecode: null,
        rejected_reason: null,
        approved_at: null,
        rejected_at: null,
    },
];

const AuthContext = createContext<AuthContextType>({
    user: null,
    authUser: null,
    session: null,
    isLoading: true,
    isUserFetching: false,
    isAuthenticated: false,
    isSystemAdmin: false,
    isAdmin: false,
    userStatus: null,
    login: async () => {},
    loginWithEmail: async () => ({ success: false }),
    logout: async () => {},
    refreshUser: async () => {},
    switchUser: () => {},
    mockUsers: [],
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUserFetching, setIsUserFetching] = useState(false); // user fetch 중인지 여부

    // 개발 모드에서 Mock 사용자 사용 여부
    const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

    // 초기화 완료 여부를 추적하여 중복 실행 방지
    const isInitializedRef = useRef(false);
    // 현재 처리 중인 세션을 추적하여 race condition 방지
    const processingSessionRef = useRef<string | null>(null);
    // user 상태를 ref로 추적하여 클로저 문제 방지
    const userRef = useRef(user);
    userRef.current = user;

    // 현재 pathname에서 slug 추출 (예: /mia2/news -> mia2)
    const currentSlug = pathname?.split('/')[1] || null;
    // slug를 ref로도 관리하여 클로저 문제 방지
    const currentSlugRef = useRef(currentSlug);
    currentSlugRef.current = currentSlug;

    /**
     * auth.users ID로 연결된 public.users 조회
     * 다중 조합 지원: 현재 slug에 해당하는 조합의 user를 조회
     */
    const fetchUserByAuthId = useCallback(async (authUserId: string, slug?: string | null): Promise<User | null> => {
        try {
            // 1. 먼저 이 authUserId와 연결된 모든 유저 레코드를 가져옵니다.
            const { data: authLinks } = await supabase
                .from('user_auth_links')
                .select('user_id')
                .eq('auth_user_id', authUserId);

            if (!authLinks || authLinks.length === 0) return null;
            const userIds = authLinks.map((link) => link.user_id);

            // 2. [추가] 가져온 ID 중 시스템 관리자가 있는지 먼저 확인합니다.
            // 시스템 관리자는 union_id와 상관없이 어디든 접근 가능해야 하기 때문입니다.
            const { data: globalAdmin } = await supabase
                .from('users')
                .select('*')
                .in('id', userIds)
                .eq('role', 'SYSTEM_ADMIN')
                .single();

            if (globalAdmin) {
                console.log('[DEBUG] 시스템 관리자 세션 유지');
                return globalAdmin as User;
            }

            // 3. 시스템 관리자가 아니라면 기존처럼 조합별 멤버십을 체크합니다.
            let unionId: string | null = null;
            if (slug) {
                const { data: unionData } = await supabase.from('unions').select('id').eq('slug', slug).single();
                unionId = unionData?.id || null;
            }

            if (unionId) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .in('id', userIds)
                    .eq('union_id', unionId)
                    .single();

                if (userData) return userData as User;
                return null; // 해당 조합 멤버가 아님
            }

            // 4. slug가 없는 경우 (예: 시스템 관리자 페이지) 첫 번째 연결된 유저 반환
            const { data: firstUser } = await supabase.from('users').select('*').in('id', userIds).single();

            return firstUser as User;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }, []);

    /**
     * 세션에서 사용자 정보 처리 (공통 로직)
     * INITIAL_SESSION, SIGNED_IN 이벤트에서 공통으로 사용
     * 다중 조합 지원: 현재 slug에 해당하는 조합의 user를 조회
     */
    const handleSessionWithUser = useCallback(
        async (currentSession: Session | null, event: AuthChangeEvent, slug?: string | null): Promise<void> => {
            console.log('[DEBUG] 🔄 handleSessionWithUser 호출');
            console.log('[DEBUG] event:', event, 'slug:', slug);
            console.log(
                '[DEBUG] currentSession:',
                currentSession
                    ? {
                          user_id: currentSession.user?.id,
                          email: currentSession.user?.email,
                          provider: currentSession.user?.app_metadata?.provider,
                      }
                    : 'null'
            );

            // 세션이 없으면 상태 초기화
            if (!currentSession?.user) {
                console.log('[DEBUG] ⚠️ 세션이 없음 - 상태 초기화');
                setSession(null);
                setAuthUser(null);
                setUser(null);
                return;
            }

            const sessionId = currentSession.user.id;

            // 이미 같은 세션을 처리 중이면 중복 실행 방지
            if (processingSessionRef.current === sessionId) {
                console.log(`[DEBUG] ⏭️ Already processing session for user ${sessionId}, skipping...`);
                return;
            }

            processingSessionRef.current = sessionId;
            setIsUserFetching(true);

            try {
                console.log(`[DEBUG] 🔍 Processing session for event: ${event}, user: ${sessionId}, slug: ${slug}`);

                const linkedUser = await fetchUserByAuthId(sessionId, slug);

                console.log(
                    '[DEBUG] fetchUserByAuthId 결과:',
                    linkedUser
                        ? {
                              id: linkedUser.id,
                              name: linkedUser.name,
                              role: linkedUser.role,
                              user_status: linkedUser.user_status,
                              union_id: linkedUser.union_id,
                          }
                        : 'null (해당 조합에 멤버십 없음)'
                );

                if (linkedUser) {
                    // 연결된 사용자가 있으면 정상 처리
                    console.log('[DEBUG] ✅ 연결된 사용자 발견 - 정상 처리');
                    setSession(currentSession);
                    setAuthUser(currentSession.user);
                    setUser(linkedUser);
                } else {
                    // 연결된 사용자가 없으면 세션은 유지하되 user만 null
                    // (회원가입 플로우를 위해 authUser는 설정)
                    console.log(
                        `[DEBUG] ⚠️ ${event}: No linked user found for slug: ${slug}. Setting authUser without user...`
                    );
                    console.log('[DEBUG] 👉 회원가입 모달이 표시되어야 함');
                    setSession(currentSession);
                    setAuthUser(currentSession.user);
                    setUser(null);
                }
            } catch (error) {
                console.error(`[DEBUG] ❌ Error handling session for ${event}:`, error);
                // 에러 발생 시에도 세션 정보는 설정
                setSession(currentSession);
                setAuthUser(currentSession.user);
                setUser(null);
            } finally {
                setIsUserFetching(false);
                processingSessionRef.current = null;
                console.log('[DEBUG] handleSessionWithUser 완료');
            }
        },
        [fetchUserByAuthId]
    );

    /**
     * Supabase Auth 상태 변경 감지
     * onAuthStateChange가 모든 세션 상태 변화를 처리
     */
    useEffect(() => {
        // 개발 모드에서 Mock 인증 사용
        if (useMockAuth) {
            const savedUserId = localStorage.getItem('mock_user_id');
            const mockUser = MOCK_USERS.find((u) => u.id === savedUserId) || MOCK_USERS[0];
            setUser(mockUser);
            setIsLoading(false);
            return;
        }

        // 타임아웃 fallback (10초 후에도 초기화되지 않으면 수동 처리)
        const timeoutId = setTimeout(async () => {
            if (!isInitializedRef.current) {
                console.log('[DEBUG] ⏰ 타임아웃: INITIAL_SESSION 미발생 - 수동 세션 체크');
                try {
                    const {
                        data: { session: manualSession },
                    } = await supabase.auth.getSession();
                    await handleSessionWithUser(manualSession, 'INITIAL_SESSION', currentSlugRef.current);
                } catch (error) {
                    console.error('[DEBUG] ❌ 수동 세션 체크 실패:', error);
                } finally {
                    setIsLoading(false);
                    isInitializedRef.current = true;
                    console.log('[DEBUG] ✅ 타임아웃 fallback 처리 완료');
                }
            }
        }, 10000);

        // Auth 상태 변경 리스너 설정
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log('[DEBUG] 🔔 onAuthStateChange 이벤트 발생');
            console.log('[DEBUG] event:', event, 'currentSlug:', currentSlugRef.current);
            console.log(
                '[DEBUG] newSession:',
                newSession
                    ? {
                          user_id: newSession.user?.id,
                          email: newSession.user?.email,
                          provider: newSession.user?.app_metadata?.provider,
                      }
                    : 'null'
            );
            console.log('[DEBUG] isInitializedRef.current:', isInitializedRef.current);

            switch (event) {
                case 'INITIAL_SESSION':
                    // 초기 세션 이벤트: 페이지 로드 시 첫 번째로 발생
                    // 이 이벤트에서 모든 초기화 처리
                    console.log('[DEBUG] 📍 INITIAL_SESSION 처리 시작');
                    await handleSessionWithUser(newSession, event, currentSlugRef.current);
                    setIsLoading(false);
                    isInitializedRef.current = true;
                    // 정상 처리 시 타임아웃 취소
                    clearTimeout(timeoutId);
                    console.log('[DEBUG] ✅ INITIAL_SESSION 처리 완료');
                    break;

                case 'SIGNED_IN':
                    // 로그인 이벤트: 초기화 완료 후에만 처리
                    console.log('[DEBUG] 📍 SIGNED_IN 이벤트');
                    if (isInitializedRef.current) {
                        // 이미 user 정보가 있으면 스킵 (탭 복귀 시 로딩 방지)
                        if (userRef.current) {
                            console.log('[DEBUG] ⏭️ SIGNED_IN 스킵 (이미 user 있음)');
                        } else {
                            // user가 없으면 처리 (다른 탭에서 로그인한 경우 등)
                            console.log('[DEBUG] 🔄 SIGNED_IN 처리 (user 없음)');
                            await handleSessionWithUser(newSession, event, currentSlugRef.current);
                        }
                    } else {
                        console.log('[DEBUG] ⏭️ SIGNED_IN 스킵 (초기화 전)');
                    }
                    break;

                case 'SIGNED_OUT':
                    // 로그아웃 이벤트
                    console.log('[DEBUG] 📍 SIGNED_OUT 처리');
                    setSession(null);
                    setAuthUser(null);
                    setUser(null);
                    break;

                case 'TOKEN_REFRESHED':
                    // 토큰 갱신 이벤트: 세션만 업데이트
                    console.log('[DEBUG] 📍 TOKEN_REFRESHED 처리');
                    if (newSession) {
                        setSession(newSession);
                    }
                    break;

                case 'USER_UPDATED':
                    // 사용자 정보 업데이트 이벤트
                    console.log('[DEBUG] 📍 USER_UPDATED 처리');
                    if (newSession) {
                        setSession(newSession);
                        setAuthUser(newSession.user);
                    }
                    break;

                case 'PASSWORD_RECOVERY':
                    // 비밀번호 복구 이벤트
                    console.log('[DEBUG] 📍 PASSWORD_RECOVERY 처리');
                    if (newSession) {
                        setSession(newSession);
                        setAuthUser(newSession.user);
                    }
                    break;

                default:
                    console.log('[DEBUG] ⚠️ Unhandled auth event:', event);
            }
        });

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, [useMockAuth, handleSessionWithUser]);

    /**
     * 소셜 로그인
     */
    const login = useCallback(async (provider: 'kakao' | 'naver', slug?: string) => {
        if (provider === 'kakao') {
            // 카카오는 Supabase 공식 지원 (카카오싱크 간편 로그인)
            const redirectTo = `${window.location.origin}/auth/callback${slug ? `?slug=${slug}` : ''}`;

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'kakao',
                options: {
                    redirectTo,
                    // 카카오싱크: prompt 파라미터 없음 = 카카오톡 로그인 상태면 간편 로그인
                    queryParams: {
                        service_terms: KAKAO_SERVICE_TERMS_STRING,
                    },
                },
            });

            if (error) {
                console.error('Kakao login error:', error);
                throw error;
            }
        } else if (provider === 'naver') {
            // 네이버는 커스텀 OAuth
            const naverAuthUrl = `/api/auth/naver${slug ? `?slug=${slug}` : ''}`;
            window.location.href = naverAuthUrl;
        }
    }, []);

    /**
     * 이메일/비밀번호 로그인 (시스템 관리자용)
     */
    const loginWithEmail = useCallback(
        async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    console.error('Email login error:', error);
                    return { success: false, error: error.message };
                }

                if (!data.user) {
                    return { success: false, error: '로그인에 실패했습니다.' };
                }

                // 연결된 public.users 조회 (시스템 관리자: slug 없이 조회)
                const linkedUser = await fetchUserByAuthId(data.user.id, null);

                if (!linkedUser) {
                    // 연결된 사용자가 없으면 로그아웃
                    await supabase.auth.signOut();
                    return { success: false, error: '등록된 사용자가 아닙니다.' };
                }

                // SYSTEM_ADMIN 권한 확인
                if (linkedUser.role !== 'SYSTEM_ADMIN') {
                    await supabase.auth.signOut();
                    return { success: false, error: '시스템 관리자 권한이 없습니다.' };
                }

                setSession(data.session);
                setAuthUser(data.user);
                setUser(linkedUser);

                return { success: true };
            } catch (error) {
                console.error('Login with email error:', error);
                return { success: false, error: '로그인 중 오류가 발생했습니다.' };
            }
        },
        [fetchUserByAuthId]
    );

    /**
     * 로그아웃
     */
    const logout = useCallback(async () => {
        if (useMockAuth) {
            setUser(null);
            localStorage.removeItem('mock_user_id');
            return;
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Logout error:', error);
            throw error;
        }

        setSession(null);
        setAuthUser(null);
        setUser(null);
    }, [useMockAuth]);

    /**
     * 사용자 정보 새로고침 (현재 조합 기준)
     */
    const refreshUser = useCallback(async () => {
        if (authUser) {
            const linkedUser = await fetchUserByAuthId(authUser.id, currentSlugRef.current);
            setUser(linkedUser);
        }
    }, [authUser, fetchUserByAuthId]);

    useEffect(() => {
        // 초기화 전이거나 세션이 없으면 무시
        if (!isInitializedRef.current || !authUser) return;
        if (useMockAuth) return;

        // [Race Condition 방지] user 정보를 fetch 중이면 보안 체크 스킵
        // isUserFetching이 true면 아직 user 정보가 로딩 중이므로 판단 보류
        if (isUserFetching) {
            console.log('[DEBUG] ⏳ isUserFetching=true, 보안 체크 대기 중...');
            return;
        }

        const handleNavigationSecurity = async () => {
            console.log('[DEBUG] 🔒 handleNavigationSecurity 실행');
            console.log('[DEBUG] 현재 상태:', {
                currentSlug,
                user: user
                    ? { id: user.id, role: user.role, union_id: user.union_id, user_status: user.user_status }
                    : 'null',
                authUser: authUser ? { id: authUser.id, email: authUser.email } : 'null',
            });

            // 1. 시스템 관리자는 어디서든 접근 가능
            if (user?.role === 'SYSTEM_ADMIN') {
                console.log('[DEBUG] ✅ 시스템 관리자 - 접근 허용');
                return;
            }

            // 2. slug가 없으면 (시스템 페이지 등) 체크 불필요
            if (!currentSlug) {
                console.log('[DEBUG] ⏭️ slug 없음 - 체크 스킵');
                return;
            }

            // 3. 현재 조합 정보 조회
            const { data: unionData } = await supabase.from('unions').select('id').eq('slug', currentSlug).single();
            if (!unionData) {
                console.log('[DEBUG] ⏭️ 조합 정보 없음 - 체크 스킵');
                return;
            }
            const currentUnionId = unionData.id;

            // 4. user가 있는 경우: 현재 조합 회원인지 확인
            if (user) {
                if (user.union_id === currentUnionId) {
                    // 현재 조합 회원 → 상태에 따라 처리 (APPROVED, PENDING_APPROVAL, REJECTED)
                    // UserStatusModal에서 상태별 UI 처리
                    console.log('[DEBUG] ✅ 현재 조합 회원 - 상태:', user.user_status);
                    return;
                } else {
                    // 다른 조합 회원이 현재 조합에 접근
                    console.log('[DEBUG] ⚠️ 다른 조합 회원의 접근 감지: 강제 세션 파기');
                    await logout();
                    return;
                }
            }

            // 5. user가 없고 authUser만 있는 경우: 신규 사용자인지, 다른 조합 회원인지 확인
            if (!user && authUser) {
                // user_auth_links에서 해당 auth_user_id로 연결된 user들 조회
                const { data: authLinks } = await supabase
                    .from('user_auth_links')
                    .select('user_id')
                    .eq('auth_user_id', authUser.id);

                if (!authLinks || authLinks.length === 0) {
                    // 어떤 조합에도 미가입된 신규 사용자 → 회원가입 플로우 허용
                    console.log('[DEBUG] ✅ 신규 사용자 - 회원가입 플로우 허용');
                    return;
                }

                // 연결된 user들 중 현재 조합에 가입된 user가 있는지 확인
                const userIds = authLinks.map((link) => link.user_id);
                const { data: currentUnionUser } = await supabase
                    .from('users')
                    .select('id, user_status')
                    .in('id', userIds)
                    .eq('union_id', currentUnionId)
                    .single();

                if (currentUnionUser) {
                    // 현재 조합에도 가입되어 있음 → 다른 조합에서 로그인된 상태
                    // 로그아웃 후 현재 조합으로 재로그인 유도
                    console.log('[DEBUG] ⚠️ 다른 조합에서 로그인됨, 현재 조합에도 가입됨 → 재로그인 유도');
                    await logout();
                    return;
                } else {
                    // 다른 조합에만 가입됨, 현재 조합은 미가입 → 로그아웃 후 회원가입 유도
                    console.log('[DEBUG] ⚠️ 다른 조합 회원, 현재 조합 미가입 → 회원가입 유도');
                    await logout();
                    return;
                }
            }
        };

        handleNavigationSecurity();
    }, [currentSlug, authUser, user, useMockAuth, logout, isUserFetching]);

    /**
     * 개발용: Mock 사용자 전환
     */
    const switchUser = useCallback((userId: string) => {
        const foundUser = MOCK_USERS.find((u) => u.id === userId);
        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('mock_user_id', foundUser.id);
        }
    }, []);

    const isAuthenticated = !!user || !!authUser;
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN';
    const userStatus = user?.user_status || null;

    return (
        <AuthContext.Provider
            value={{
                user,
                authUser,
                session,
                isLoading,
                isUserFetching,
                isAuthenticated,
                isSystemAdmin,
                isAdmin,
                userStatus,
                login,
                loginWithEmail,
                logout,
                refreshUser,
                switchUser,
                mockUsers: MOCK_USERS,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// 권한 체크 유틸리티 함수들
export const checkSystemAdmin = (user: User | null): boolean => {
    return user?.role === 'SYSTEM_ADMIN';
};

export const checkAdmin = (user: User | null): boolean => {
    return user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN';
};

export const checkUnionMember = (user: User | null, unionId: string): boolean => {
    if (!user) return false;
    if (user.role === 'SYSTEM_ADMIN') return true;
    return user.union_id === unionId;
};

export const checkApproved = (user: User | null): boolean => {
    return user?.user_status === 'APPROVED';
};
