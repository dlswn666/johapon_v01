import { create } from 'zustand';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';

interface HeroSlidesStore {
    slides: HeroSlide[];
    setSlides: (slides: HeroSlide[]) => void;
    addSlide: (slide: HeroSlide) => void;
    updateSlide: (id: string, slide: Partial<HeroSlide>) => void;
    removeSlide: (id: string) => void;
    reset: () => void;
}

const initialState = {
    slides: [] as HeroSlide[],
};

const useHeroSlidesStore = create<HeroSlidesStore>((set) => ({
    ...initialState,
    setSlides: (slides: HeroSlide[]) => set({ slides }),
    addSlide: (slide: HeroSlide) =>
        set((state) => ({
            slides: [...state.slides, slide],
        })),
    updateSlide: (id: string, updatedSlide: Partial<HeroSlide>) =>
        set((state) => ({
            slides: state.slides.map((slide) =>
                slide.id === id ? { ...slide, ...updatedSlide } : slide
            ),
        })),
    removeSlide: (id: string) =>
        set((state) => ({
            slides: state.slides.filter((slide) => slide.id !== id),
        })),
    reset: () => set(initialState),
}));

export default useHeroSlidesStore;

