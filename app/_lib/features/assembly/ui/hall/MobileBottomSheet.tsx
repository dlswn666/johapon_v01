'use client';

import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Vote, MessageCircle, FileText, Hand, Monitor, BarChart2 } from 'lucide-react';
import ActiveVoteCard from './ActiveVoteCard';
import AgendaVoteList from './AgendaVoteList';
import QaSection from './QaSection';
import DocumentSection from './DocumentSection';
import SpeakerSection from './SpeakerSection';
import ResultsSection from './ResultsSection';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import type { AgendaItem, Poll, PollOption } from '@/app/_lib/shared/type/assembly.types';

type TabId = 'agenda' | 'qa' | 'documents' | 'speaker' | 'results';

const BASE_TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'agenda', label: '투표', icon: <Vote className="w-4 h-4" aria-hidden="true" /> },
  { id: 'qa', label: 'Q&A', icon: <MessageCircle className="w-4 h-4" aria-hidden="true" /> },
  { id: 'documents', label: '자료', icon: <FileText className="w-4 h-4" aria-hidden="true" /> },
  { id: 'speaker', label: '발언', icon: <Hand className="w-4 h-4" aria-hidden="true" /> },
];

const RESULTS_TAB: { id: TabId; label: string; icon: React.ReactNode } = {
  id: 'results', label: '결과', icon: <BarChart2 className="w-4 h-4" aria-hidden="true" />,
};

const RESULTS_VISIBLE_STATUSES = ['VOTING_CLOSED', 'CLOSED', 'ARCHIVED'];

export interface MobileBottomSheetProps {
  assemblyId: string;
  activePollIds: string[];
}

/**
 * 모바일 바텀 시트 (vaul Drawer)
 * 투표/Q&A/자료/발언 섹션을 바텀시트로 제공
 */
export default function MobileBottomSheet({
  assemblyId,
  activePollIds,
}: MobileBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('agenda');
  const [snap, setSnap] = useState<string | number | null>(0.5);
  const { assembly, agendaItems, receiptTokens } = useVoteStore();

  const showResults = RESULTS_VISIBLE_STATUSES.includes(assembly?.status || '');
  const tabs = showResults ? [...BASE_TABS, RESULTS_TAB] : BASE_TABS;

  const isFullScreen = snap === 1;

  // OPEN 투표 안건 필터
  const activeAgendas = agendaItems.filter((a) => {
    const poll = a.polls?.[0];
    return poll && activePollIds.includes(poll.id) && poll.status === 'OPEN';
  });

  return (
    <>
      <Drawer
        open
        modal={false}
        snapPoints={[0.5, 0.8, 1]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
        <DrawerContent className="max-h-[100dvh]">
          <DrawerHeader className="pb-0 pt-2">
            <DrawerTitle className="sr-only">총회 콘텐츠</DrawerTitle>
            {/* 탭 네비게이션 */}
            <div role="tablist" className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`mobile-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </DrawerHeader>

          <div
            className="flex-1 overflow-y-auto p-4 pb-20"
            role="tabpanel"
            id={`mobile-panel-${activeTab}`}
          >
            {/* OPEN 투표 카드 (안건 탭에서만) */}
            {activeTab === 'agenda' && activeAgendas.length > 0 && (
              <div className="space-y-3 mb-4">
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
              </div>
            )}

            {activeTab === 'agenda' && (
              <AgendaVoteList
                assemblyId={assemblyId}
                agendaItems={agendaItems}
                receiptTokens={receiptTokens}
                activePollIds={activePollIds}
              />
            )}
            {activeTab === 'qa' && <QaSection assemblyId={assemblyId} />}
            {activeTab === 'documents' && <DocumentSection assemblyId={assemblyId} />}
            {activeTab === 'speaker' && <SpeakerSection assemblyId={assemblyId} />}
            {activeTab === 'results' && <ResultsSection assemblyId={assemblyId} />}
          </div>
        </DrawerContent>
      </Drawer>

      {/* 100% 시 영상 보기 플로팅 버튼 */}
      {isFullScreen && (
        <button
          onClick={() => setSnap(0.5)}
          className="fixed bottom-6 right-4 z-50 bg-blue-600 text-white rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
          aria-label="영상 보기"
        >
          <Monitor className="w-4 h-4" aria-hidden="true" />
          영상 보기
        </button>
      )}
    </>
  );
}
