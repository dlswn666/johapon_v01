'use client';

import { create } from 'zustand';
import {
  Assembly,
  AgendaItem,
  Poll,
  PollOption,
  AssemblyMemberSnapshotPublic,
  HallFeatureFlags,
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

  // 세션 상태
  sessionId: string | null;
  logId: string | null;
  entryAt: string | null;
  lastSeenAt: string | null;
  sessionStatus: 'INACTIVE' | 'STARTING' | 'ACTIVE' | 'IDLE' | 'RECONNECTING' | 'ENDED';
  isBootstrapped: boolean;
  featureFlags: HallFeatureFlags | null;

  // Actions
  setSnapshot: (snapshot: AssemblyMemberSnapshotPublic | null) => void;
  setAssembly: (assembly: Assembly) => void;
  setAgendaItems: (items: AgendaItemWithPollOptions[]) => void;
  setReceiptToken: (pollId: string, token: string) => void;
  markPollVoted: (pollId: string) => void;

  // 세션 Actions
  setSession: (data: { sessionId: string; logId: string; entryAt: string }) => void;
  updateLastSeen: (lastSeenAt: string) => void;
  setSessionStatus: (status: VoteState['sessionStatus']) => void;
  setFeatureFlags: (flags: HallFeatureFlags) => void;
  setBootstrapped: (value: boolean) => void;
  endSession: () => void;

  reset: () => void;
}

const createInitialState = () => ({
  snapshot: null as AssemblyMemberSnapshotPublic | null,
  assembly: null as Assembly | null,
  agendaItems: [] as AgendaItemWithPollOptions[],
  receiptTokens: {} as Record<string, string>,
  votedPolls: {} as Record<string, boolean>,
  sessionId: null as string | null,
  logId: null as string | null,
  entryAt: null as string | null,
  lastSeenAt: null as string | null,
  sessionStatus: 'INACTIVE' as VoteState['sessionStatus'],
  isBootstrapped: false,
  featureFlags: null as HallFeatureFlags | null,
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

  // 세션 Actions
  setSession: (data) =>
    set({
      sessionId: data.sessionId,
      logId: data.logId,
      entryAt: data.entryAt,
    }),

  updateLastSeen: (lastSeenAt) => set({ lastSeenAt }),

  setSessionStatus: (status) => set({ sessionStatus: status }),

  setFeatureFlags: (flags) => set({ featureFlags: flags }),

  setBootstrapped: (value) => set({ isBootstrapped: value }),

  endSession: () =>
    set({ sessionStatus: 'ENDED' }),

  reset: () => set(createInitialState()),
}));

export default useVoteStore;
