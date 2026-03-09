'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncements, useSendAnnouncement } from '@/app/_lib/features/assembly/api/useAnnouncementsHook';

interface AnnouncementSenderProps {
  assemblyId: string;
}

export default function AnnouncementSender({ assemblyId }: AnnouncementSenderProps) {
  const [content, setContent] = useState('');
  const { data: announcements } = useAnnouncements(assemblyId);
  const sendMutation = useSendAnnouncement(assemblyId);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    sendMutation.mutate(
      { content: trimmed },
      {
        onSuccess: () => {
          setContent('');
        },
      }
    );
  };

  // 최근 3개만 표시
  const recentAnnouncements = (announcements ?? []).slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">공지 발송</h3>

      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          placeholder="참석자에게 전달할 공지를 입력하세요"
          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{content.length}/500</span>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!content.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4 mr-1" />
            발송
          </Button>
        </div>
      </div>

      {recentAnnouncements.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500 mb-2">최근 공지</p>
          <ul className="space-y-2">
            {recentAnnouncements.map((ann) => (
              <li key={ann.id} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                <p className="line-clamp-2">{ann.content}</p>
                <p className="text-gray-400 mt-1">
                  {new Date(ann.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
