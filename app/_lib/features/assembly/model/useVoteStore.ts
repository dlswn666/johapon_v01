'use client';

import { create } from 'zustand';
import {
  Assembly,
  AgendaItem,
  Poll,
  PollOption,
  AssemblyMemberSnapshotPublic,
} from '@/app/_lib/shared/type/assembly.types';

// 안건 + 투표 세션 + 선택지 포함
interface AgendaItemWithPollOptions extends AgendaItem {
  polls?: (Poll & { poll_options?: PollOption[] })[];
}

interface VoteState {
  // 총회 접근 정보
  snapshot: AssemblyMemberSnapshotPublic | null;
  assembly: Assembly | null;
  agendaItems: AgendaItemWithPollOptions[];

  // 투표 결과
  receiptTokens: Record<string, string>; // pollId → receipt_token
  votedPolls: Record<string, boolean>; // pollId → 투표 완료 여부

  // Actions
  setSnapshot: (snapshot: AssemblyMemberSnapshotPublic | null) => void;
  setAssembly: (assembly: Assembly) => void;
  setAgendaItems: (items: AgendaItemWithPollOptions[]) => void;
  setReceiptToken: (pollId: string, token: string) => void;
  markPollVoted: (pollId: string) => void;
  reset: () => void;
}

const createInitialState = () => ({
  snapshot: null as AssemblyMemberSnapshotPublic | null,
  assembly: null as Assembly | null,
  agendaItems: [] as AgendaItemWithPollOptions[],
  receiptTokens: {} as Record<string, string>,
  votedPolls: {} as Record<string, boolean>,
});

const useVoteStore = create<VoteState>((set) => ({
  ...createInitialState(),

  setSnapshot: (snapshot) => set({ snapshot }),

  setAssembly: (assembly) => set({ assembly }),

  setAgendaItems: (items) => set({ agendaItems: items }),

  setReceiptToken: (pollId, token) =>
    set((state) => ({
      receiptTokens: { ...state.receiptTokens, [pollId]: token },
      votedPolls: { ...state.votedPolls, [pollId]: true },
    })),

  markPollVoted: (pollId) =>
    set((state) => ({
      votedPolls: { ...state.votedPolls, [pollId]: true },
    })),

  reset: () => set(createInitialState()),
}));

export default useVoteStore;
