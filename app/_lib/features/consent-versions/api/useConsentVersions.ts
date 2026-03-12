'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';

// 동의 유형
export type ConsentType = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'THIRD_PARTY_SHARING' | 'MARKETING';

// 약관 버전 타입 정의
export interface ConsentVersion {
    id: string;
    consent_type: ConsentType;
    version_code: string;
    title: string;
    content: string;
    effective_from: string;
    created_at: string;
    created_by: string | null;
    is_active: boolean;
}

export interface CreateConsentVersionInput {
    consent_type: ConsentType;
    version_code: string;
    title: string;
    content: string;
    effective_from: string;
}

export interface UpdateConsentVersionInput {
    consent_type?: ConsentType;
    version_code?: string;
    title?: string;
    content?: string;
    effective_from?: string;
    is_active?: boolean;
}

// 동의 유형 한글 매핑
export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
    TERMS_OF_SERVICE: '서비스 이용약관',
    PRIVACY_POLICY: '개인정보 처리방침',
    THIRD_PARTY_SHARING: '제3자 제공 동의',
    MARKETING: '마케팅 수신 동의',
};

export const CONSENT_TYPES: ConsentType[] = [
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'THIRD_PARTY_SHARING',
    'MARKETING',
];

// 약관 버전 목록 조회
export const useConsentVersions = (consentType?: ConsentType) => {
    return useQuery({
        queryKey: ['consent-versions', consentType],
        queryFn: async () => {
            let query = supabase
                .from('consent_versions')
                .select('*')
                .order('effective_from', { ascending: false });

            if (consentType) {
                query = query.eq('consent_type', consentType);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as ConsentVersion[];
        },
    });
};

// 약관 버전 생성
export const useCreateConsentVersion = () => {
    return useMutation({
        mutationFn: async (newVersion: CreateConsentVersionInput) => {
            const { data, error } = await supabase
                .from('consent_versions')
                .insert([{
                    ...newVersion,
                    is_active: true,
                }])
                .select()
                .single();

            if (error) throw error;
            return data as ConsentVersion;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consent-versions'] });
        },
    });
};

// 약관 버전 수정
export const useUpdateConsentVersion = () => {
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateConsentVersionInput }) => {
            const { data, error } = await supabase
                .from('consent_versions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as ConsentVersion;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consent-versions'] });
        },
    });
};

// 약관 버전 삭제 (소프트 삭제: is_active = false)
export const useDeleteConsentVersion = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('consent_versions')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['consent-versions'] });
        },
    });
};
