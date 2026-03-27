'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useEvote } from '@/app/_lib/features/evote/api/useEvoteList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bell, Inbox } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import type { NotificationChannel, NotificationLogStatus } from '@/app/_lib/shared/type/assembly.types';

// 알림 발송 이력 (evote 전용)
interface EvoteNotificationLog {
  id: string;
  evote_id: string;
  recipient_name: string;
  channel: NotificationChannel;
  status: NotificationLogStatus;
  sent_at: string | null;
  created_at: string;
}

// 채널 배지 색상
const CHANNEL_BADGE: Record<NotificationChannel, { bg: string; text: string; label: string }> = {
  KAKAO_ALIMTALK: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '카카오' },
  SMS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'SMS' },
  EMAIL: { bg: 'bg-purple-100', text: 'text-purple-700', label: '이메일' },
};

// 상태 배지 색상
const STATUS_BADGE: Record<NotificationLogStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-600', label: '대기' },
  SENT: { bg: 'bg-green-100', text: 'text-green-700', label: '발송' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-600', label: '실패' },
  RETRIED: { bg: 'bg-amber-100', text: 'text-amber-700', label: '재시도' },
};

export default function EvoteNotificationsPage({
  params,
}: {
  params: Promise<{ evoteId: string }>;
}) {
  const { evoteId } = use(params);
  const router = useRouter();
  const { slug, union, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: evote, isLoading: isEvoteLoading } = useEvote(evoteId);

  const { data: notifications, isLoading: isNotiLoading } = useQuery({
    queryKey: ['evote-notifications', union?.id, evoteId],
    queryFn: async () => {
      const res = await fetch(`/api/evotes/${evoteId}/notifications`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '알림 이력 조회 실패');
      }
      const { data } = await res.json();
      return data as EvoteNotificationLog[];
    },
    enabled: !!evoteId && !!union?.id,
  });

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading || isEvoteLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin || !evote) return null;

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(getUnionPath(slug, `/admin/assembly/evote/${evoteId}`))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">알림 관리</h1>
            <p className="text-sm text-gray-500">{evote.title}</p>
          </div>
        </div>
        <Button variant="outline" disabled>
          <Bell className="w-4 h-4" />
          수동 알림 발송
        </Button>
      </div>

      {/* 알림 이력 테이블 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {isNotiLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Inbox className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-sm">발송된 알림이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">수신자</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">채널</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">상태</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-700">발송일시</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((log) => {
                  const channel = CHANNEL_BADGE[log.channel];
                  const status = STATUS_BADGE[log.status];
                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{log.recipient_name}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${channel.bg} ${channel.text} border-transparent`}>
                          {channel.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${status.bg} ${status.text} border-transparent`}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {log.sent_at
                          ? new Date(log.sent_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
