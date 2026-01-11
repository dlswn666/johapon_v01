'use client';

import { create } from 'zustand';
import { Question } from '@/app/_lib/shared/type/database.types';

interface QuestionStore {
    questions: Question[];
    selectedQuestion: Question | null;
    editorImages: Record<string, File>; // blobUrl -> File 매핑
    answerEditorImages: Record<string, File>; // 답변용 에디터 이미지

    setQuestions: (questions: Question[]) => void;
    setSelectedQuestion: (question: Question | null) => void;
    addQuestion: (question: Question) => void;
    updateQuestion: (id: number, question: Partial<Question>) => void;
    removeQuestion: (id: number) => void;
    incrementViews: (id: number) => void;
    
    // 에디터 이미지 관리
    addEditorImage: (blobUrl: string, file: File) => void;
    removeEditorImage: (blobUrl: string) => void;
    clearEditorImages: () => void;

    // 답변 에디터 이미지 관리
    addAnswerEditorImage: (blobUrl: string, file: File) => void;
    removeAnswerEditorImage: (blobUrl: string) => void;
    clearAnswerEditorImages: () => void;

    reset: () => void;
}

const initialState = {
    questions: [],
    selectedQuestion: null,
    editorImages: {},
    answerEditorImages: {},
};

const useQuestionStore = create<QuestionStore>((set) => ({
    ...initialState,

    setQuestions: (questions) => set({ questions }),

    setSelectedQuestion: (question) => set({ selectedQuestion: question }),

    addQuestion: (question) =>
        set((state) => ({
            questions: [question, ...state.questions],
        })),

    updateQuestion: (id, updatedQuestion) =>
        set((state) => ({
            questions: state.questions.map((question) => (question.id === id ? { ...question, ...updatedQuestion } : question)),
            selectedQuestion: state.selectedQuestion?.id === id ? { ...state.selectedQuestion, ...updatedQuestion } : state.selectedQuestion,
        })),

    removeQuestion: (id) =>
        set((state) => ({
            questions: state.questions.filter((question) => question.id !== id),
            selectedQuestion: state.selectedQuestion?.id === id ? null : state.selectedQuestion,
        })),

    incrementViews: (id) =>
        set((state) => ({
            questions: state.questions.map((question) => (question.id === id ? { ...question, views: (question.views || 0) + 1 } : question)),
            selectedQuestion: state.selectedQuestion?.id === id ? { ...state.selectedQuestion, views: (state.selectedQuestion.views || 0) + 1 } : state.selectedQuestion,
        })),

    addEditorImage: (blobUrl, file) =>
        set((state) => ({
            editorImages: { ...state.editorImages, [blobUrl]: file },
        })),

    removeEditorImage: (blobUrl) =>
        set((state) => {
            const newImages = { ...state.editorImages };
            delete newImages[blobUrl];
            return { editorImages: newImages };
        }),

    clearEditorImages: () => set({ editorImages: {} }),

    addAnswerEditorImage: (blobUrl, file) =>
        set((state) => ({
            answerEditorImages: { ...state.answerEditorImages, [blobUrl]: file },
        })),

    removeAnswerEditorImage: (blobUrl) =>
        set((state) => {
            const newImages = { ...state.answerEditorImages };
            delete newImages[blobUrl];
            return { answerEditorImages: newImages };
        }),

    clearAnswerEditorImages: () => set({ answerEditorImages: {} }),

    reset: () => set(initialState),
}));

export default useQuestionStore;

