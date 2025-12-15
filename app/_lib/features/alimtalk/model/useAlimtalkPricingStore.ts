import { create } from 'zustand';
import { AlimtalkPricing } from '@/app/_lib/shared/type/database.types';

interface AlimtalkPricingStore {
    // 상태
    pricingList: AlimtalkPricing[];
    currentPricing: Map<string, number>;
    isLoading: boolean;

    // 액션
    setPricingList: (pricingList: AlimtalkPricing[]) => void;
    addPricing: (pricing: AlimtalkPricing) => void;
    setCurrentPricing: (pricing: Map<string, number>) => void;
    setIsLoading: (isLoading: boolean) => void;
    getPrice: (messageType: string) => number;
    reset: () => void;
}

const initialState = {
    pricingList: [],
    currentPricing: new Map<string, number>([
        ['KAKAO', 15],
        ['SMS', 20],
        ['LMS', 50],
    ]),
    isLoading: false,
};

const useAlimtalkPricingStore = create<AlimtalkPricingStore>((set, get) => ({
    ...initialState,

    setPricingList: (pricingList) => {
        // 현재 적용 중인 단가 계산 (각 타입별 가장 최근 단가)
        const currentPricing = new Map<string, number>();
        const now = new Date();

        const sortedByType = pricingList.reduce((acc, p) => {
            if (!acc[p.message_type]) {
                acc[p.message_type] = [];
            }
            acc[p.message_type].push(p);
            return acc;
        }, {} as Record<string, AlimtalkPricing[]>);

        for (const [type, prices] of Object.entries(sortedByType)) {
            // 적용 시작일이 현재 이전인 것 중 가장 최근 것
            const validPrices = prices
                .filter((p) => new Date(p.effective_from) <= now)
                .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());

            if (validPrices.length > 0) {
                currentPricing.set(type, validPrices[0].unit_price);
            }
        }

        // 기본값 설정
        if (!currentPricing.has('KAKAO')) currentPricing.set('KAKAO', 15);
        if (!currentPricing.has('SMS')) currentPricing.set('SMS', 20);
        if (!currentPricing.has('LMS')) currentPricing.set('LMS', 50);

        set({ pricingList, currentPricing });
    },

    addPricing: (pricing) =>
        set((state) => {
            const newList = [...state.pricingList, pricing];
            // 새 단가 추가 시 현재 단가도 업데이트
            const now = new Date();
            if (new Date(pricing.effective_from) <= now) {
                const currentPricing = new Map(state.currentPricing);
                const existingPrice = currentPricing.get(pricing.message_type);
                // 더 최근 단가인 경우만 업데이트
                const existingPricing = state.pricingList.find(
                    (p) =>
                        p.message_type === pricing.message_type &&
                        p.unit_price === existingPrice
                );
                if (
                    !existingPricing ||
                    new Date(pricing.effective_from) > new Date(existingPricing.effective_from)
                ) {
                    currentPricing.set(pricing.message_type, pricing.unit_price);
                }
                return { pricingList: newList, currentPricing };
            }
            return { pricingList: newList };
        }),

    setCurrentPricing: (currentPricing) => set({ currentPricing }),

    setIsLoading: (isLoading) => set({ isLoading }),

    getPrice: (messageType) => {
        const { currentPricing } = get();
        return currentPricing.get(messageType) || 0;
    },

    reset: () => set(initialState),
}));

export default useAlimtalkPricingStore;

