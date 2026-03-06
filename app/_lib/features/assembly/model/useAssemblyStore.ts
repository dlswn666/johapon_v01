'use client';

import { create } from 'zustand';
import { Assembly, AgendaItem } from '@/app/_lib/shared/type/assembly.types';

interface AssemblyStore {
  assemblies: Assembly[];
  selectedAssembly: Assembly | null;
  agendaItems: AgendaItem[];

  setAssemblies: (assemblies: Assembly[]) => void;
  setSelectedAssembly: (assembly: Assembly | null) => void;
  addAssembly: (assembly: Assembly) => void;
  updateAssembly: (id: string, updates: Partial<Assembly>) => void;
  removeAssembly: (id: string) => void;

  setAgendaItems: (items: AgendaItem[]) => void;
  addAgendaItem: (item: AgendaItem) => void;
  updateAgendaItem: (id: string, updates: Partial<AgendaItem>) => void;
  removeAgendaItem: (id: string) => void;

  reset: () => void;
}

const initialState = {
  assemblies: [] as Assembly[],
  selectedAssembly: null as Assembly | null,
  agendaItems: [] as AgendaItem[],
};

const useAssemblyStore = create<AssemblyStore>((set) => ({
  ...initialState,

  setAssemblies: (assemblies) => set({ assemblies }),
  setSelectedAssembly: (assembly) => set({ selectedAssembly: assembly }),

  addAssembly: (assembly) =>
    set((state) => ({ assemblies: [assembly, ...state.assemblies] })),

  updateAssembly: (id, updates) =>
    set((state) => ({
      assemblies: state.assemblies.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      selectedAssembly: state.selectedAssembly?.id === id
        ? { ...state.selectedAssembly, ...updates }
        : state.selectedAssembly,
    })),

  removeAssembly: (id) =>
    set((state) => ({
      assemblies: state.assemblies.filter((a) => a.id !== id),
      selectedAssembly: state.selectedAssembly?.id === id ? null : state.selectedAssembly,
    })),

  setAgendaItems: (items) => set({ agendaItems: items }),

  addAgendaItem: (item) =>
    set((state) => ({ agendaItems: [...state.agendaItems, item] })),

  updateAgendaItem: (id, updates) =>
    set((state) => ({
      agendaItems: state.agendaItems.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  removeAgendaItem: (id) =>
    set((state) => ({
      agendaItems: state.agendaItems.filter((a) => a.id !== id),
    })),

  reset: () => set(initialState),
}));

export default useAssemblyStore;
