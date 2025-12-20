import { create } from 'zustand';
import { AlimtalkTemplate } from '@/app/_lib/shared/type/database.types';

interface AlimtalkTemplateStore {
    // 상태
    templates: AlimtalkTemplate[];
    selectedTemplate: AlimtalkTemplate | null;
    isLoading: boolean;
    isSyncing: boolean;
    lastSyncedAt: string | null;

    // 액션
    setTemplates: (templates: AlimtalkTemplate[]) => void;
    addTemplate: (template: AlimtalkTemplate) => void;
    updateTemplate: (templateCode: string, template: Partial<AlimtalkTemplate>) => void;
    removeTemplate: (templateCode: string) => void;
    setSelectedTemplate: (template: AlimtalkTemplate | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    setIsSyncing: (isSyncing: boolean) => void;
    setLastSyncedAt: (lastSyncedAt: string | null) => void;
    reset: () => void;
}

const initialState = {
    templates: [],
    selectedTemplate: null,
    isLoading: false,
    isSyncing: false,
    lastSyncedAt: null,
};

const useAlimtalkTemplateStore = create<AlimtalkTemplateStore>((set) => ({
    ...initialState,

    setTemplates: (templates) => {
        // 마지막 동기화 시간 계산
        const latestSync = templates.reduce((latest, t) => {
            if (!t.synced_at) return latest;
            if (!latest) return t.synced_at;
            return new Date(t.synced_at) > new Date(latest) ? t.synced_at : latest;
        }, null as string | null);

        set({ templates, lastSyncedAt: latestSync });
    },

    addTemplate: (template) =>
        set((state) => ({
            templates: [...state.templates, template],
        })),

    updateTemplate: (idOrCode, updatedTemplate) =>
        set((state) => ({
            templates: state.templates.map((t) =>
                t.id === idOrCode || t.template_code === idOrCode ? { ...t, ...updatedTemplate } : t
            ),
            // selectedTemplate도 함께 업데이트
            selectedTemplate:
                state.selectedTemplate &&
                (state.selectedTemplate.id === idOrCode || state.selectedTemplate.template_code === idOrCode)
                    ? { ...state.selectedTemplate, ...updatedTemplate }
                    : state.selectedTemplate,
        })),

    removeTemplate: (templateCode) =>
        set((state) => ({
            templates: state.templates.filter((t) => t.template_code !== templateCode),
        })),

    setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),

    setIsLoading: (isLoading) => set({ isLoading }),

    setIsSyncing: (isSyncing) => set({ isSyncing }),

    setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

    reset: () => set(initialState),
}));

export default useAlimtalkTemplateStore;

