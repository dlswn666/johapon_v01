'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  channelName: string;
  table?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onEvent?: (payload: unknown) => void;
  invalidateKeys?: string[][];
  enabled?: boolean;
}

/**
 * Supabase Realtime 범용 훅
 * - postgres_changes 모드: table + filter 지정 시 DB 변경 감지
 * - onEvent 콜백 또는 queryClient.invalidateQueries로 쿼리 무효화
 */
export function useRealtimeChannel({
  channelName,
  table,
  filter,
  event = '*',
  onEvent,
  invalidateKeys,
  enabled = true,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !table) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as 'system',
        {
          event,
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        } as Record<string, unknown>,
        (payload: unknown) => {
          // 콜백 실행
          if (onEvent) {
            onEvent(payload);
          }

          // 쿼리 무효화
          if (invalidateKeys) {
            for (const key of invalidateKeys) {
              queryClient.invalidateQueries({ queryKey: key });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, filter, event, enabled]);

  return channelRef;
}
