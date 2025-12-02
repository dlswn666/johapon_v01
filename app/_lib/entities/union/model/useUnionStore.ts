import { create } from 'zustand';
import { Union } from '@/app/_lib/shared/type/database.types';

interface UnionStore {
    currentUnion: Union | null;
    isLoading: boolean;
    error: Error | null;
    
    // Actions
    setCurrentUnion: (union: Union | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: Error | null) => void;
    reset: () => void;
}

const initialState = {
    currentUnion: null,
    isLoading: false,
    error: null,
};

export const useUnionStore = create<UnionStore>((set) => ({
    ...initialState,

    setCurrentUnion: (union) => set({ currentUnion: union }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    
    reset: () => set(initialState),
}));

