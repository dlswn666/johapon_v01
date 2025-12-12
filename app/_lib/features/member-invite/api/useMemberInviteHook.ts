'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { MemberInvite, MemberInviteWithUnion, SyncMemberInvitesResult } from '@/app/_lib/shared/type/database.types';
import useMemberInviteStore from '../model/useMemberInviteStore';

// 조합별 조합원 초대 목록 조회
export const useMemberInvites = (unionId: string | undefined, enabled: boolean = true) => {
    const setMemberInvites = useMemberInviteStore((state) => state.setMemberInvites);

    const queryResult = useQuery({
        queryKey: ['member-invites', unionId],
        queryFn: async () => {
            if (!unionId) throw new Error('Union ID is required');

            const { data, error } = await supabase
                .from('member_invites')
                .select(`
                    *,
                    union:unions(id, name, slug)
                `)
                .eq('union_id', unionId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data as MemberInviteWithUnion[];
        },
        enabled: !!unionId && enabled,
    });

    useEffect(() => {
        if (queryResult.data && queryResult.isSuccess) {
            setMemberInvites(queryResult.data);
        }
    }, [queryResult.data, queryResult.isSuccess, setMemberInvites]);

    return queryResult;
};

// 토큰으로 조합원 초대 조회
export const useMemberInviteByToken = (token: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['member-invite', 'token', token],
        queryFn: async () => {
            if (!token) throw new Error('Token is required');

            const { data, error } = await supabase
                .from('member_invites')
                .select(`
                    *,
                    union:unions(id, name, slug)
                `)
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
                await supabase
                    .from('member_invites')
                    .update({ status: 'EXPIRED' })
                    .eq('id', data.id);
                
                return { ...data, status: 'EXPIRED' } as MemberInviteWithUnion;
            }

            return data as MemberInviteWithUnion;
        },
        enabled: !!token && enabled,
    });
};

// 조합원 초대 동기화 (엑셀 업로드)
export const useSyncMemberInvites = () => {
    return useMutation({
        mutationFn: async (input: {
            unionId: string;
            createdBy: string;
            expiresHours: number;
            members: { name: string; phone_number: string; property_address: string }[];
        }) => {
            // API Route를 통해 동기화 (auth.users 삭제 처리를 위해)
            const response = await fetch('/api/member-invite/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    unionId: input.unionId,
                    createdBy: input.createdBy,
                    expiresHours: input.expiresHours,
                    members: input.members,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '동기화에 실패했습니다.');
            }

            return response.json() as Promise<SyncMemberInvitesResult>;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['member-invites', variables.unionId] });
        },
    });
};

// 조합원 초대 삭제
export const useDeleteMemberInvite = () => {
    const removeMemberInvite = useMemberInviteStore((state) => state.removeMemberInvite);

    return useMutation({
        mutationFn: async ({ inviteId, unionId }: { inviteId: string; unionId: string }) => {
            const { error } = await supabase
                .from('member_invites')
                .delete()
                .eq('id', inviteId);

            if (error) {
                throw error;
            }

            return { inviteId, unionId };
        },
        onSuccess: ({ inviteId, unionId }) => {
            removeMemberInvite(inviteId);
            queryClient.invalidateQueries({ queryKey: ['member-invites', unionId] });
        },
    });
};

// 조합원 초대 수락 처리
export const useAcceptMemberInvite = () => {
    return useMutation({
        mutationFn: async ({ inviteToken, userId }: { inviteToken: string; userId: string }) => {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('member_invites')
                .update({
                    status: 'USED',
                    used_at: now,
                    user_id: userId,
                })
                .eq('invite_token', inviteToken)
                .eq('status', 'PENDING')
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data as MemberInvite;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['member-invites', data.union_id] });
            queryClient.invalidateQueries({ queryKey: ['member-invite', 'token', data.invite_token] });
        },
    });
};

// 초대 링크 생성 헬퍼
export const useGenerateMemberInviteLink = () => {
    return useCallback((token: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/member-invite/${token}`;
        }
        return `/member-invite/${token}`;
    }, []);
};

// 특정 조합원 초대 조회 (ID로)
export const useMemberInvite = (inviteId: string | undefined, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['member-invite', inviteId],
        queryFn: async () => {
            if (!inviteId) throw new Error('Invite ID is required');

            const { data, error } = await supabase
                .from('member_invites')
                .select(`
                    *,
                    union:unions(id, name, slug)
                `)
                .eq('id', inviteId)
                .single();

            if (error) {
                throw error;
            }

            return data as MemberInviteWithUnion;
        },
        enabled: !!inviteId && enabled,
    });
};

