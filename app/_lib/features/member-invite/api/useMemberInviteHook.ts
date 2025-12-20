'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { MemberInvite, MemberInviteWithUnion, SyncMemberInvitesResult } from '@/app/_lib/shared/type/database.types';
import useMemberInviteStore from '../model/useMemberInviteStore';
import { sendBulkMemberInviteAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';

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
            members: { name: string; phone_number: string; property_address?: string }[];
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
        meta: {
            skipErrorToast: true, // 컴포넌트에서 직접 에러 처리하므로 전역 토스트 비활성화
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

// 일괄 알림톡 발송 Progress 타입
export interface BulkSendProgress {
    totalBatches: number;
    completedBatches: number;
    totalRecipients: number;
    sentCount: number;
    failCount: number;
    kakaoCount: number;
    smsCount: number;
}

// 조합원 일괄 알림톡 발송
export const useSendBulkMemberAlimtalk = () => {
    const [progress, setProgress] = useState<BulkSendProgress | null>(null);

    const mutation = useMutation({
        mutationFn: async (input: {
            unionId: string;
            unionName: string;
            domain: string;
            inviteIds: string[];
        }) => {
            // 선택된 초대 정보 조회
            const { data: invites, error } = await supabase
                .from('member_invites')
                .select('*')
                .in('id', input.inviteIds)
                .eq('status', 'PENDING'); // PENDING 상태만 발송

            if (error) {
                throw new Error('초대 정보 조회에 실패했습니다.');
            }

            if (!invites || invites.length === 0) {
                throw new Error('발송할 대상이 없습니다. (대기중 상태만 발송 가능)');
            }

            // 발송 대상 구성
            const members = invites.map((invite) => ({
                name: invite.name,
                phoneNumber: invite.phone_number,
                inviteToken: invite.invite_token,
                expiresAt: invite.expires_at,
            }));

            // 알림톡 일괄 발송 (500건씩 배치 처리)
            const result = await sendBulkMemberInviteAlimTalk(
                {
                    unionId: input.unionId,
                    unionName: input.unionName,
                    domain: input.domain,
                    members,
                },
                (progressData) => {
                    setProgress(progressData);
                }
            );

            return result;
        },
        onSettled: () => {
            // 발송 완료 후 progress 초기화 (약간의 딜레이)
            setTimeout(() => setProgress(null), 2000);
        },
        meta: {
            skipErrorToast: true, // 컴포넌트에서 직접 에러 처리
        },
    });

    return { ...mutation, progress };
};

// UUID 생성 헬퍼 (crypto.randomUUID 대체)
const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// 수동 회원 등록 및 알림톡 발송
export const useCreateManualInvites = () => {
    const addMemberInvites = useMemberInviteStore((state) => state.addMemberInvites);
    const [progress, setProgress] = useState<BulkSendProgress | null>(null);

    const mutation = useMutation({
        mutationFn: async (input: {
            unionId: string;
            unionName: string;
            domain: string;
            createdBy: string;
            members: { name: string; phone_number: string }[];
        }) => {
            const { unionId, unionName, domain, createdBy, members } = input;

            if (members.length === 0) {
                throw new Error('등록할 회원이 없습니다.');
            }

            // 만료 시간: 1년 후
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            // 초대 데이터 생성
            const invitesToInsert = members.map((member) => ({
                union_id: unionId,
                name: member.name,
                phone_number: member.phone_number,
                property_address: '', // 물건지 정보 없이 등록
                invite_token: generateUUID(),
                status: 'PENDING' as const,
                created_by: createdBy,
                expires_at: expiresAt.toISOString(),
            }));

            // Bulk INSERT
            const { data: insertedInvites, error: insertError } = await supabase
                .from('member_invites')
                .insert(invitesToInsert)
                .select();

            if (insertError) {
                throw new Error(`회원 등록에 실패했습니다: ${insertError.message}`);
            }

            if (!insertedInvites || insertedInvites.length === 0) {
                throw new Error('회원 등록에 실패했습니다.');
            }

            // Store 업데이트
            addMemberInvites(insertedInvites);

            // 알림톡 발송 대상 구성
            const alimtalkMembers = insertedInvites.map((invite) => ({
                name: invite.name,
                phoneNumber: invite.phone_number,
                inviteToken: invite.invite_token,
                expiresAt: invite.expires_at,
            }));

            // 알림톡 일괄 발송
            const alimtalkResult = await sendBulkMemberInviteAlimTalk(
                {
                    unionId,
                    unionName,
                    domain,
                    members: alimtalkMembers,
                },
                (progressData) => {
                    setProgress(progressData);
                }
            );

            return {
                insertedCount: insertedInvites.length,
                alimtalkResult,
            };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['member-invites', variables.unionId] });
        },
        onSettled: () => {
            setTimeout(() => setProgress(null), 2000);
        },
        meta: {
            skipErrorToast: true,
        },
    });

    return { ...mutation, progress };
};

