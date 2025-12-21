'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useUserStore from '@/app/_lib/entities/user/model/useUserStore';
import {
    User,
    NewUser,
    UpdateUser,
    UserStatus,
    UserRole,
} from '@/app/_lib/shared/type/database.types';

// ========================================
// Query: 사용자 목록 조회
// ========================================
export interface UseUsersOptions {
    unionId?: string | null;
    status?: UserStatus | 'ALL';
    role?: UserRole | 'ALL';
    search?: string;
    page?: number;
    pageSize?: number;
    enabled?: boolean;
}

export const useUsers = (options: UseUsersOptions = {}) => {
    const {
        unionId,
        status = 'ALL',
        role = 'ALL',
        search = '',
        page = 1,
        pageSize = 20,
        enabled = true,
    } = options;

    const setUsers = useUserStore((state) => state.setUsers);

    const queryResult = useQuery({
        queryKey: ['users', unionId, status, role, search, page, pageSize],
        queryFn: async ({ signal }) => {
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .abortSignal(signal);

            // 조합 필터
            if (unionId) {
                query = query.eq('union_id', unionId);
            }

            // 상태 필터
            if (status !== 'ALL') {
                query = query.eq('user_status', status);
            }

            // 역할 필터
            if (role !== 'ALL') {
                query = query.eq('role', role);
            }

            // 검색
            if (search) {
                query = query.or(
                    `name.ilike.%${search}%,phone_number.ilike.%${search}%,property_address.ilike.%${search}%`
                );
            }

            // 페이징
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                throw error;
            }

            return { users: data as User[], total: count || 0 };
        },
        enabled,
    });

    // Store에 데이터 동기화
    useEffect(() => {
        if (queryResult.data?.users && queryResult.isSuccess) {
            setUsers(queryResult.data.users);
        }
    }, [queryResult.data, queryResult.isSuccess, setUsers]);

    return queryResult;
};

// ========================================
// Query: 특정 사용자 조회
// ========================================
export const useUser = (userId: string | undefined, enabled: boolean = true) => {
    const setSelectedUser = useUserStore((state) => state.setSelectedUser);

    const queryResult = useQuery({
        queryKey: ['users', userId],
        queryFn: async ({ signal }) => {
            if (!userId) throw new Error('User ID is required');

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .abortSignal(signal)
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        enabled: !!userId && enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setSelectedUser(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setSelectedUser]);

    return queryResult;
};

// ========================================
// Query: auth.users ID로 사용자 조회
// ========================================
export const useUserByAuthId = (authUserId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['users', 'by-auth-id', authUserId],
        queryFn: async ({ signal }) => {
            if (!authUserId) throw new Error('Auth User ID is required');

            // user_auth_links에서 연결된 user_id 조회
            const { data: authLink, error: linkError } = await supabase
                .from('user_auth_links')
                .select('user_id')
                .eq('auth_user_id', authUserId)
                .abortSignal(signal)
                .single();

            if (linkError || !authLink) {
                return null;
            }

            // public.users에서 사용자 정보 조회
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authLink.user_id)
                .abortSignal(signal)
                .single();

            if (userError) {
                throw userError;
            }

            return userData as User;
        },
        enabled: !!authUserId && enabled,
    });
};

// ========================================
// Mutation: 사용자 생성
// ========================================
export const useAddUser = () => {
    const addUser = useUserStore((state) => state.addUser);

    return useMutation({
        mutationFn: async (newUser: NewUser) => {
            const { data, error } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        onSuccess: (data) => {
            addUser(data);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('사용자가 생성되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('사용자 생성에 실패했습니다.');
            console.error('Add user error:', error);
        },
    });
};

// ========================================
// Mutation: 사용자 수정
// ========================================
export const useUpdateUser = () => {
    const updateUser = useUserStore((state) => state.updateUser);

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateUser }) => {
            const { data, error } = await supabase
                .from('users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        onSuccess: (data) => {
            updateUser(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users', data.id] });
            toast.success('사용자 정보가 수정되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('사용자 수정에 실패했습니다.');
            console.error('Update user error:', error);
        },
    });
};

// ========================================
// Mutation: 사용자 삭제
// ========================================
export const useDeleteUser = () => {
    const removeUser = useUserStore((state) => state.removeUser);

    return useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase.from('users').delete().eq('id', userId);

            if (error) {
                throw error;
            }

            return userId;
        },
        onSuccess: (userId) => {
            removeUser(userId);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('사용자가 삭제되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('사용자 삭제에 실패했습니다.');
            console.error('Delete user error:', error);
        },
    });
};

// ========================================
// Mutation: 사용자 승인
// ========================================
export const useApproveUser = () => {
    const updateUser = useUserStore((state) => state.updateUser);

    return useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await supabase
                .from('users')
                .update({
                    user_status: 'APPROVED',
                    role: 'USER',
                    approved_at: new Date().toISOString(),
                    rejected_reason: null,
                    rejected_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        onSuccess: (data) => {
            updateUser(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('사용자가 승인되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('사용자 승인에 실패했습니다.');
            console.error('Approve user error:', error);
        },
    });
};

// ========================================
// Mutation: 사용자 반려
// ========================================
export const useRejectUser = () => {
    const updateUser = useUserStore((state) => state.updateUser);

    return useMutation({
        mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
            const { data, error } = await supabase
                .from('users')
                .update({
                    user_status: 'REJECTED',
                    rejected_reason: reason,
                    rejected_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        onSuccess: (data) => {
            updateUser(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('사용자가 반려되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('사용자 반려에 실패했습니다.');
            console.error('Reject user error:', error);
        },
    });
};

// ========================================
// Mutation: 재신청 (상태 초기화)
// ========================================
export const useReapplyUser = () => {
    const updateUser = useUserStore((state) => state.updateUser);

    return useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await supabase
                .from('users')
                .update({
                    user_status: 'PENDING_PROFILE',
                    rejected_reason: null,
                    rejected_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        onSuccess: (data) => {
            updateUser(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('재신청이 가능합니다.');
        },
        onError: (error: Error) => {
            toast.error('재신청 처리에 실패했습니다.');
            console.error('Reapply user error:', error);
        },
    });
};

// ========================================
// Mutation: 반려 취소 (REJECTED → PENDING_APPROVAL)
// 관리자가 잘못 반려한 경우 취소하여 다시 승인 대기 상태로 복구
// ========================================
export const useCancelRejection = () => {
    const updateUser = useUserStore((state) => state.updateUser);

    return useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await supabase
                .from('users')
                .update({
                    user_status: 'PENDING_APPROVAL',
                    rejected_reason: null,
                    rejected_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        onSuccess: (data) => {
            updateUser(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('반려가 취소되었습니다. 다시 승인 대기 상태입니다.');
        },
        onError: (error: Error) => {
            toast.error('반려 취소에 실패했습니다.');
            console.error('Cancel rejection error:', error);
        },
    });
};

// ========================================
// Mutation: 재신청 시 정보 업데이트
// 반려된 사용자가 정보를 수정하고 다시 승인 요청
// ========================================
export interface ReapplyWithUpdateInput {
    userId: string;
    name: string;
    phone_number: string;
    birth_date: string;
    property_zonecode?: string;
    property_address_road?: string;
    property_address_jibun?: string;
    property_address_detail?: string;
}

export const useReapplyWithUpdate = () => {
    const updateUser = useUserStore((state) => state.updateUser);

    return useMutation({
        mutationFn: async (input: ReapplyWithUpdateInput) => {
            const { userId, ...updates } = input;

            const { data, error } = await supabase
                .from('users')
                .update({
                    ...updates,
                    property_address: updates.property_address_road, // 기존 호환성
                    user_status: 'PENDING_APPROVAL',
                    rejected_reason: null,
                    rejected_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as User;
        },
        onSuccess: (data) => {
            updateUser(data.id, data);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('재신청이 완료되었습니다. 관리자 승인을 기다려주세요.');
        },
        onError: (error: Error) => {
            toast.error('재신청에 실패했습니다.');
            console.error('Reapply with update error:', error);
        },
    });
};

// ========================================
// Mutation: 소셜 계정 연결
// ========================================
export const useLinkAuthUser = () => {
    return useMutation({
        mutationFn: async ({
            userId,
            authUserId,
            provider,
        }: {
            userId: string;
            authUserId: string;
            provider: 'kakao' | 'naver';
        }) => {
            const { data, error } = await supabase
                .from('user_auth_links')
                .insert({
                    user_id: userId,
                    auth_user_id: authUserId,
                    provider,
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('계정이 연결되었습니다.');
        },
        onError: (error: Error) => {
            toast.error('계정 연결에 실패했습니다.');
            console.error('Link auth user error:', error);
        },
    });
};

