'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/app/_lib/shared/type/database.types';

// 사용자 역할 타입
export type UserRole = 'SYSTEM_ADMIN' | 'ADMIN' | 'USER';

// Mock 사용자 데이터 (개발용)
const MOCK_USERS: User[] = [
    {
        id: 'mock-system-admin-1',
        name: '시스템 관리자',
        email: 'admin@johapon.com',
        phone_number: '010-1234-5678',
        role: 'SYSTEM_ADMIN',
        created_at: new Date().toISOString(),
        union_id: null,
    },
    {
        id: 'mock-admin-1',
        name: '조합 관리자',
        email: 'union-admin@example.com',
        phone_number: '010-2345-6789',
        role: 'ADMIN',
        created_at: new Date().toISOString(),
        union_id: 'some-union-id',
    },
    {
        id: 'mock-user-1',
        name: '일반 사용자',
        email: 'user@example.com',
        phone_number: '010-3456-7890',
        role: 'USER',
        created_at: new Date().toISOString(),
        union_id: 'some-union-id',
    },
];

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isSystemAdmin: boolean;
    isAdmin: boolean;
    login: (email: string) => void;
    logout: () => void;
    switchUser: (userId: string) => void;
    mockUsers: User[];
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isSystemAdmin: false,
    isAdmin: false,
    login: () => {},
    logout: () => {},
    switchUser: () => {},
    mockUsers: [],
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 개발 환경에서는 항상 시스템 관리자로 시작 (개발 편의)
        // 사용자 전환 기능은 DEV 드롭다운에서 사용 가능
        setUser(MOCK_USERS[0]); // SYSTEM_ADMIN
        localStorage.setItem('mock_user_id', MOCK_USERS[0].id);
        setIsLoading(false);
    }, []);

    const login = (email: string) => {
        const foundUser = MOCK_USERS.find((u) => u.email === email);
        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('mock_user_id', foundUser.id);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('mock_user_id');
    };

    const switchUser = (userId: string) => {
        const foundUser = MOCK_USERS.find((u) => u.id === userId);
        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('mock_user_id', foundUser.id);
        }
    };

    const isAuthenticated = !!user;
    const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN';

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                isSystemAdmin,
                isAdmin,
                login,
                logout,
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
