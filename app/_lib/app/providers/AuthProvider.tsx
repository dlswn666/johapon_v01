'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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

    /**
     * auth.users ID로 연결된 public.users 조회
     */
    const fetchUserByAuthId = useCallback(async (authUserId: string): Promise<User | null> => {
        try {
            // user_auth_links에서 연결된 user_id 조회
            const { data: authLink, error: linkError } = await supabase
                .from('user_auth_links')
                .select('user_id')
                .eq('auth_user_id', authUserId)
                .single();

            if (linkError || !authLink) {
                console.log('No linked user found for auth_user_id:', authUserId);
                return null;
            }

            // public.users에서 사용자 정보 조회
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authLink.user_id)
                .single();

            if (userError || !userData) {
                console.error('Failed to fetch user:', userError);
                return null;
            }

            return userData as User;
        } catch (error) {
            console.error('Error fetching user by auth ID:', error);
            return null;
        }
    }, []);

    /**
     * 세션에서 사용자 정보 처리 (공통 로직)
     * INITIAL_SESSION, SIGNED_IN 이벤트에서 공통으로 사용
     */
    const handleSessionWithUser = useCallback(
        async (currentSession: Session | null, event: AuthChangeEvent): Promise<void> => {
            // 세션이 없으면 상태 초기화
            if (!currentSession?.user) {
                setSession(null);
                setAuthUser(null);
                setUser(null);
                return;
            }

            const sessionId = currentSession.user.id;

            // 이미 같은 세션을 처리 중이면 중복 실행 방지
            if (processingSessionRef.current === sessionId) {
                console.log(`Already processing session for user ${sessionId}, skipping...`);
                return;
            }

            processingSessionRef.current = sessionId;
            setIsUserFetching(true);

            try {
                console.log(`Processing session for event: ${event}, user: ${sessionId}`);

                const linkedUser = await fetchUserByAuthId(sessionId);

                if (linkedUser) {
                    // 연결된 사용자가 있으면 정상 처리
                    setSession(currentSession);
                    setAuthUser(currentSession.user);
                    setUser(linkedUser);
                } else {
                    // 연결된 사용자가 없으면 세션은 유지하되 user만 null
                    // (회원가입 플로우를 위해 authUser는 설정)
                    console.log(`${event}: No linked user found. Setting authUser without user...`);
                    setSession(currentSession);
                    setAuthUser(currentSession.user);
                    setUser(null);
                }
            } catch (error) {
                console.error(`Error handling session for ${event}:`, error);
                // 에러 발생 시에도 세션 정보는 설정
                setSession(currentSession);
                setAuthUser(currentSession.user);
                setUser(null);
            } finally {
                setIsUserFetching(false);
                processingSessionRef.current = null;
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

        // Auth 상태 변경 리스너 설정
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log('Auth state changed:', event, newSession?.user?.id ?? 'no user');

            switch (event) {
                case 'INITIAL_SESSION':
                    // 초기 세션 이벤트: 페이지 로드 시 첫 번째로 발생
                    // 이 이벤트에서 모든 초기화 처리
                    await handleSessionWithUser(newSession, event);
                    setIsLoading(false);
                    isInitializedRef.current = true;
                    break;

                case 'SIGNED_IN':
                    // 로그인 이벤트: 실제 로그인 시에만 처리 (초기화 완료 후)
                    // INITIAL_SESSION 이후에 발생하는 SIGNED_IN만 처리
                    if (isInitializedRef.current) {
                        await handleSessionWithUser(newSession, event);
                    }
                    break;

                case 'SIGNED_OUT':
                    // 로그아웃 이벤트
                    setSession(null);
                    setAuthUser(null);
                    setUser(null);
                    break;

                case 'TOKEN_REFRESHED':
                    // 토큰 갱신 이벤트: 세션만 업데이트
                    if (newSession) {
                        setSession(newSession);
                    }
                    break;

                case 'USER_UPDATED':
                    // 사용자 정보 업데이트 이벤트
                    if (newSession) {
                        setSession(newSession);
                        setAuthUser(newSession.user);
                    }
                    break;

                case 'PASSWORD_RECOVERY':
                    // 비밀번호 복구 이벤트
                    if (newSession) {
                        setSession(newSession);
                        setAuthUser(newSession.user);
                    }
                    break;

                default:
                    console.log('Unhandled auth event:', event);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useMockAuth]);

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

                // 연결된 public.users 조회
                const linkedUser = await fetchUserByAuthId(data.user.id);

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
     * 사용자 정보 새로고침
     */
    const refreshUser = useCallback(async () => {
        if (authUser) {
            const linkedUser = await fetchUserByAuthId(authUser.id);
            setUser(linkedUser);
        }
    }, [authUser, fetchUserByAuthId]);

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
