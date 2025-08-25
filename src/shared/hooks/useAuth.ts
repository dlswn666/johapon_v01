import { useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'member' | 'admin' | 'systemadmin';
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: 실제 인증 로직 구현
        // 현재는 임시로 하드코딩
        const checkAuth = async () => {
            try {
                // 임시 데이터 - 실제로는 JWT 토큰이나 세션에서 가져와야 함
                const tempUser: User = {
                    id: 'temp-user-id',
                    email: 'admin@example.com',
                    name: '관리자',
                    role: 'admin', // 임시로 admin 권한
                };

                setUser(tempUser);
            } catch (error) {
                console.error('Auth check error:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        // TODO: 실제 로그인 로직 구현
        console.log('Login attempt:', email);
    };

    const logout = async () => {
        setUser(null);
        // TODO: 실제 로그아웃 로직 구현
    };

    return {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        userRole: user?.role || 'member',
    };
}

