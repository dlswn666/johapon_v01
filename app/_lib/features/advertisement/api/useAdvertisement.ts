'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { AdType, Advertisement, NewAdvertisement, UpdateAdvertisement } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

// ============================================
// Query Hooks (사용자 페이지용)
// ============================================

/**
 * 특정 타입의 유효한 광고 조회
 */
export const useAdsByType = (type: AdType, enabled: boolean = true) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['ads', union?.id, type],
    queryFn: async () => {
      if (!union?.id) return [];

      const now = new Date().toISOString().split('T')[0]; // DATE 타입 비교를 위해 YYYY-MM-DD 포맷

      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('union_id', union.id)
        .eq('type', type)
        .lte('contract_start_date', now)
        .gte('contract_end_date', now);

      if (error) throw error;
      return data as Advertisement[];
    },
    enabled: !!union?.id && enabled,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
};

/**
 * 특정 광고 상세 조회
 */
export const useAd = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['ad', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Advertisement;
    },
    enabled: !!id && enabled,
  });
};

/**
 * 랜덤 광고 조회 (메인 배너 2개, 게시판 광고 3개 등)
 * 클라이언트 사이드 셔플 적용
 */
export const useRandomAds = (type: AdType, limit: number = 0, enabled: boolean = true) => {
  const { data: ads, isLoading, error } = useAdsByType(type, enabled);
  
  const result = useMemo(() => {
    if (!ads) return [];
    // eslint-disable-next-line react-hooks/purity
    const shuffled = [...ads].sort(() => Math.random() - 0.5);
    return limit > 0 ? shuffled.slice(0, limit) : shuffled;
  }, [ads, limit]);

  return { data: result, isLoading, error };
};

// ============================================
// Admin Hooks (관리자용)
// ============================================

/**
 * 어드민용 전체 광고 리스트 (필터 포함)
 */
export const useAdminAds = (filters?: { type?: AdType; status?: 'ACTIVE' | 'EXPIRED' }) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['ads-admin', union?.id, filters],
    queryFn: async () => {
      if (!union?.id) return [];

      let query = supabase
        .from('advertisements')
        .select('*')
        .eq('union_id', union.id)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const now = new Date().toISOString().split('T')[0];
      if (filters?.status === 'ACTIVE') {
        query = query.lte('contract_start_date', now).gte('contract_end_date', now);
      } else if (filters?.status === 'EXPIRED') {
        query = query.lt('contract_end_date', now);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Advertisement[];
    },
    enabled: !!union?.id,
  });
};

/**
 * 광고 등록
 */
export const useAddAd = () => {
  const { union } = useSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAd: NewAdvertisement) => {
      if (!union?.id) throw new Error('Union ID is required');

      const { data, error } = await supabase
        .from('advertisements')
        .insert([{ ...newAd, union_id: union.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Advertisement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['ads-admin'] });
    },
  });
};

/**
 * 광고 수정
 */
export const useUpdateAd = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateAdvertisement }) => {
      const { data, error } = await supabase
        .from('advertisements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Advertisement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['ads-admin'] });
    },
  });
};

/**
 * 광고 삭제
 */
export const useDeleteAd = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('advertisements').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['ads-admin'] });
    },
  });
};
