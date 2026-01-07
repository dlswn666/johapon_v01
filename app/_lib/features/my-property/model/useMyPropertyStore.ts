import { create } from 'zustand';

// 내 물건지 공시지가 정보 타입
export interface MyPropertyInfo {
    id: string;
    building_unit_id: string;
    // 주소 정보
    address: string | null;
    dong: string | null;
    ho: string | null;
    building_name: string | null;
    pnu: string | null;
    // 면적 정보
    land_area: number | null;
    building_area: number | null;
    // 지분율
    land_ownership_ratio: number | null;
    building_ownership_ratio: number | null;
    // 공시지가
    official_price: number | null;
    // 계산된 총 공시지가 (면적 x 공시지가 x 지분율)
    total_land_price: number | null;
    // 소유 유형
    ownership_type: string | null;
    is_primary: boolean | null;
}

interface MyPropertyStore {
    // 상태
    properties: MyPropertyInfo[];
    isLoading: boolean;
    error: string | null;
    
    // 상태 변경 함수
    setProperties: (properties: MyPropertyInfo[]) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    
    // 리셋
    reset: () => void;
}

const initialState = {
    properties: [] as MyPropertyInfo[],
    isLoading: false,
    error: null as string | null,
};

const useMyPropertyStore = create<MyPropertyStore>((set) => ({
    ...initialState,
    
    setProperties: (properties: MyPropertyInfo[]) => set({ properties }),
    
    setLoading: (isLoading: boolean) => set({ isLoading }),
    
    setError: (error: string | null) => set({ error }),
    
    reset: () => set(initialState),
}));

export default useMyPropertyStore;
