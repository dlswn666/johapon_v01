'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { AdminInvite, AdminInviteWithUnion, NewAdminInvite } from '@/app/_lib/shared/type/database.types';

// 초대 토큰 생성 유틸리티
function generateInviteToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// 조합별 초대 목록 조회
export const useAdminInvites = (unionId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['admin-invites', unionId],
        queryFn: async () => {
            if (!unionId) throw new Error('Union ID is required');

            const { data, error } = await supabase
                .from('admin_invites')
                .select(
                    `
                    *,
                    union:unions(id, name, slug)
                `
                )
                .eq('union_id', unionId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data as AdminInviteWithUnion[];
        },
        enabled: !!unionId && enabled,
    });
};

// 토큰으로 초대 조회
export const useAdminInviteByToken = (token: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['admin-invite', 'token', token],
        queryFn: async () => {
            if (!token) throw new Error('Token is required');

            const { data, error } = await supabase
                .from('admin_invites')
                .select(
                    `
                    *,
                    union:unions(id, name, slug)
                `
                )
                .eq('invite_token', token)
                .single();

            if (error) {
                throw error;
            }

            // 만료 여부 확인
            const now = new Date();
            const expiresAt = new Date(data.expires_at);

            if (data.status === 'PENDING' && now > expiresAt) {
                // 만료된 경우 상태 업데이트
                await supabase.from('admin_invites').update({ status: 'EXPIRED' }).eq('id', data.id);

                return { ...data, status: 'EXPIRED' } as AdminInviteWithUnion;
            }

            return data as AdminInviteWithUnion;
        },
        enabled: !!token && enabled,
    });
};

// 초대 생성
export const useCreateAdminInvite = () => {
    return useMutation({
        mutationFn: async (input: {
            unionId: string;
            name: string;
            phoneNumber: string;
            email?: string;
            createdBy: string;
        }) => {
            const inviteToken = generateInviteToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

            const newInvite: NewAdminInvite = {
                union_id: input.unionId,
                name: input.name,
                phone_number: input.phoneNumber,
                email: input.email || null,
                invite_token: inviteToken,
                status: 'PENDING',
                created_by: input.createdBy,
                expires_at: expiresAt.toISOString(),
            };

            const { data, error } = await supabase
                .from('admin_invites')
                .insert([newInvite])
                .select(
                    `
                    *,
                    union:unions(id, name, slug)
                `
                )
                .single();

            if (error) {
                throw error;
            }

            return data as AdminInviteWithUnion;
        },
        onSuccess: (data) => {
            // 테스트용: 생성된 초대 URL을 콘솔에 출력
            const inviteUrl =
                typeof window !== 'undefined'
                    ? `${window.location.origin}/invite/admin?token=${data.invite_token}`
                    : `/invite/admin?token=${data.invite_token}`;

            console.log('='.repeat(60));
            console.log('🔗 [관리자 초대] 초대 URL이 생성되었습니다');
            console.log('='.repeat(60));
            console.log('조합명:', data.union?.name);
            console.log('초대 대상:', data.name);
            if (data.email) console.log('이메일:', data.email);
            console.log('전화번호:', data.phone_number);
            console.log('만료 시간:', new Date(data.expires_at).toLocaleString('ko-KR'));
            console.log('-'.repeat(60));
            console.log('📌 초대 URL:', inviteUrl);
            console.log('='.repeat(60));

            queryClient.invalidateQueries({ queryKey: ['admin-invites', data.union_id] });
        },
    });
};

// 초대 취소 (삭제)
export const useDeleteAdminInvite = () => {
    return useMutation({
        mutationFn: async ({ inviteId, unionId }: { inviteId: string; unionId: string }) => {
            const { error } = await supabase.from('admin_invites').delete().eq('id', inviteId);

            if (error) {
                throw error;
            }

            return { inviteId, unionId };
        },
        onSuccess: ({ unionId }) => {
            queryClient.invalidateQueries({ queryKey: ['admin-invites', unionId] });
        },
    });
};

// 초대 사용 처리 (관리자 가입 완료 시)
export const useAcceptAdminInvite = () => {
    return useMutation({
        mutationFn: async (inviteToken: string) => {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('admin_invites')
                .update({
                    status: 'USED',
                    used_at: now,
                })
                .eq('invite_token', inviteToken)
                .eq('status', 'PENDING')
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as AdminInvite;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-invites', data.union_id] });
            queryClient.invalidateQueries({ queryKey: ['admin-invite', 'token', data.invite_token] });
        },
    });
};

// 초대 링크 생성 헬퍼
export const useGenerateInviteLink = () => {
    return useCallback((token: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/invite/admin?token=${token}`;
        }
        return `/invite/admin?token=${token}`;
    }, []);
};

// 조합의 관리자 목록 조회
export const useUnionAdmins = (unionId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['union-admins', unionId],
        queryFn: async () => {
            if (!unionId) throw new Error('Union ID is required');

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('union_id', unionId)
                .eq('role', 'ADMIN')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data;
        },
        enabled: !!unionId && enabled,
    });
};

// 관리자 권한 해제 (role만 USER로 변경, union_id는 유지)
export const useRevokeAdmin = () => {
    return useMutation({
        mutationFn: async ({ userId, unionId }: { userId: string; unionId: string }) => {
            const { error } = await supabase
                .from('users')
                .update({
                    role: 'USER',
                })
                .eq('id', userId)
                .eq('union_id', unionId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { userId, unionId };
        },
        onSuccess: ({ unionId }) => {
            queryClient.invalidateQueries({ queryKey: ['union-admins', unionId] });
        },
    });
};
