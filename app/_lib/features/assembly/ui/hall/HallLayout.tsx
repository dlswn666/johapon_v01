'use client';

import React from 'react';
import { useMediaQuery } from '@/app/_lib/shared/hooks/useMediaQuery';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import StreamPlayer from './StreamPlayer';
import AttendanceStatusBar from './AttendanceStatusBar';
import ActiveVoteCard from './ActiveVoteCard';
import AgendaVoteList from './AgendaVoteList';
import QaSection from './QaSection';
import DocumentSection from './DocumentSection';
import SpeakerSection from './SpeakerSection';
import MobileBottomSheet from './MobileBottomSheet';
import type { AgendaItem, Poll, PollOption } from '@/app/_lib/shared/type/assembly.types';

export interface HallLayoutProps {
  assemblyId: string;
  activePollIds: string[];
}

/**
 * 반응형 레이아웃
 * 데스크톱 (lg+): CSS Grid 좌측 영상 + 우측 콘텐츠
 * 모바일 (<lg): 영상 상단 + 바텀시트
 */
export default function HallLayout({ assemblyId, activePollIds }: HallLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { assembly, agendaItems, receiptTokens } = useVoteStore();

  // OPEN 투표 안건 필터
  const activeAgendas = agendaItems.filter((a) => {
    const poll = a.polls?.[0];
    return poll && activePollIds.includes(poll.id) && poll.status === 'OPEN';
  });

  if (isMobile) {
    return (
      <div className="h-[calc(100dvh-var(--header-height,56px))] flex flex-col">
        {/* 영상 */}
        <div className="z-10 flex-shrink-0">
          <StreamPlayer
            streamType={assembly?.stream_type ?? null}
            zoomMeetingId={assembly?.zoom_meeting_id ?? null}
            youtubeVideoId={assembly?.youtube_video_id ?? null}
            className="rounded-none"
          />
        </div>

        {/* 출석 상태 바 */}
        <div className="flex-shrink-0 px-4 py-1.5">
          <AttendanceStatusBar assemblyId={assemblyId} />
        </div>

        {/* 바텀 시트 */}
        <MobileBottomSheet assemblyId={assemblyId} activePollIds={activePollIds} />
      </div>
    );
  }

  // 데스크톱
  return (
    <div
      className="h-[calc(100dvh-var(--header-height,56px))] grid grid-cols-[42fr_58fr] gap-6 max-w-7xl mx-auto px-4 py-4"
    >
      {/* 좌측: 영상 (sticky) */}
      <div className="flex flex-col gap-4 overflow-hidden">
        <div className="sticky top-[calc(var(--header-height,56px)+16px)] z-10">
          <StreamPlayer
            streamType={assembly?.stream_type ?? null}
            zoomMeetingId={assembly?.zoom_meeting_id ?? null}
            youtubeVideoId={assembly?.youtube_video_id ?? null}
          />
        </div>
      </div>

      {/* 우측: 콘텐츠 */}
      <div className="overflow-y-auto space-y-4 pb-4">
        <AttendanceStatusBar assemblyId={assemblyId} />

        {/* OPEN 투표 카드 */}
        {activeAgendas.map((agenda) => {
          const poll = agenda.polls![0] as Poll & { poll_options?: PollOption[] };
          return (
            <ActiveVoteCard
              key={agenda.id}
              assemblyId={assemblyId}
              agenda={agenda as AgendaItem & { polls?: (Poll & { poll_options?: PollOption[] })[] }}
              poll={poll}
              receiptToken={receiptTokens[poll.id]}
            />
          );
        })}

        {/* 전체 안건 목록 */}
        <AgendaVoteList
          assemblyId={assemblyId}
          agendaItems={agendaItems}
          receiptTokens={receiptTokens}
          activePollIds={activePollIds}
        />

        {/* Q&A */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Q&A</h2>
          <QaSection assemblyId={assemblyId} />
        </div>

        {/* 자료 열람 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">자료 열람</h2>
          <DocumentSection assemblyId={assemblyId} />
        </div>

        {/* 발언 요청 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">발언 요청</h2>
          <SpeakerSection assemblyId={assemblyId} />
        </div>
      </div>
    </div>
  );
}
