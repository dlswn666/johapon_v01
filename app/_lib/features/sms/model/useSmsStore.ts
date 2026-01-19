import { create } from 'zustand';
import {
  SmsRecipient,
  SmsMessageType,
  SmsSendProgress,
  SmsBatchResult,
  SmsSendStatus,
  SmsPricing,
} from '@/app/_lib/shared/type/sms.types';

interface SmsStore {
  // 수신자 정보
  recipients: SmsRecipient[];
  validRecipients: SmsRecipient[];
  invalidRecipients: SmsRecipient[];

  // 메시지 정보
  title: string;
  message: string;
  msgType: SmsMessageType;
  byteCount: number;

  // 전송 진행 상태
  progress: SmsSendProgress;

  // 단가 정보
  pricing: SmsPricing;

  // UI 상태
  currentStep: 'upload' | 'compose' | 'confirm' | 'sending' | 'result';
  isUploading: boolean;

  // 액션 - 수신자
  setRecipients: (recipients: SmsRecipient[]) => void;
  clearRecipients: () => void;

  // 액션 - 메시지
  setTitle: (title: string) => void;
  setMessage: (message: string) => void;
  setMsgType: (msgType: SmsMessageType) => void;
  setByteCount: (byteCount: number) => void;

  // 액션 - 전송 진행
  initProgress: (totalRecipients: number, batchSize: number) => void;
  updateBatchResult: (batchResult: SmsBatchResult) => void;
  setProgressStatus: (status: SmsSendStatus) => void;
  completeProgress: () => void;

  // 액션 - UI
  setCurrentStep: (step: SmsStore['currentStep']) => void;
  setIsUploading: (isUploading: boolean) => void;
  setPricing: (pricing: SmsPricing) => void;

  // 리셋
  reset: () => void;
  resetForNewSend: () => void;
}

const initialProgress: SmsSendProgress = {
  totalRecipients: 0,
  processedCount: 0,
  successCount: 0,
  failCount: 0,
  currentBatch: 0,
  totalBatches: 0,
  status: 'pending',
  batchResults: [],
  estimatedCost: 0,
  startedAt: null,
  completedAt: null,
};

const initialPricing: SmsPricing = {
  sms: 20,
  lms: 50,
  mms: 200,
};

const initialState = {
  recipients: [],
  validRecipients: [],
  invalidRecipients: [],
  title: '',
  message: '',
  msgType: 'LMS' as SmsMessageType,
  byteCount: 0,
  progress: initialProgress,
  pricing: initialPricing,
  currentStep: 'upload' as const,
  isUploading: false,
};

const useSmsStore = create<SmsStore>((set, get) => ({
  ...initialState,

  // 수신자 설정
  setRecipients: (recipients) => {
    const validRecipients = recipients.filter((r) => r.isValid);
    const invalidRecipients = recipients.filter((r) => !r.isValid);
    set({ recipients, validRecipients, invalidRecipients });
  },

  clearRecipients: () =>
    set({
      recipients: [],
      validRecipients: [],
      invalidRecipients: [],
    }),

  // 메시지 설정
  setTitle: (title) => set({ title }),
  setMessage: (message) => set({ message }),
  setMsgType: (msgType) => set({ msgType }),
  setByteCount: (byteCount) => set({ byteCount }),

  // 전송 진행 초기화
  initProgress: (totalRecipients, batchSize) => {
    const totalBatches = Math.ceil(totalRecipients / batchSize);
    const { msgType, pricing } = get();
    const unitPrice = pricing[msgType.toLowerCase() as keyof SmsPricing];
    const estimatedCost = totalRecipients * unitPrice;

    set({
      progress: {
        ...initialProgress,
        totalRecipients,
        totalBatches,
        status: 'sending',
        estimatedCost,
        startedAt: new Date(),
      },
    });
  },

  // 배치 결과 업데이트
  updateBatchResult: (batchResult) =>
    set((state) => {
      const batchResults = [...state.progress.batchResults, batchResult];
      const processedCount =
        state.progress.processedCount +
        batchResult.successCount +
        batchResult.failCount;
      const successCount = state.progress.successCount + batchResult.successCount;
      const failCount = state.progress.failCount + batchResult.failCount;

      return {
        progress: {
          ...state.progress,
          batchResults,
          processedCount,
          successCount,
          failCount,
          currentBatch: batchResult.batchIndex + 1,
        },
      };
    }),

  // 진행 상태 설정
  setProgressStatus: (status) =>
    set((state) => ({
      progress: { ...state.progress, status },
    })),

  // 전송 완료
  completeProgress: () =>
    set((state) => {
      const { msgType, pricing, progress } = state;
      const unitPrice = pricing[msgType.toLowerCase() as keyof SmsPricing];
      const actualCost = progress.successCount * unitPrice;

      return {
        progress: {
          ...state.progress,
          status: 'completed',
          estimatedCost: actualCost,
          completedAt: new Date(),
        },
        currentStep: 'result',
      };
    }),

  // UI 상태
  setCurrentStep: (currentStep) => set({ currentStep }),
  setIsUploading: (isUploading) => set({ isUploading }),
  setPricing: (pricing) => set({ pricing }),

  // 전체 리셋
  reset: () => set(initialState),

  // 새 전송을 위한 부분 리셋 (가격 정보 유지)
  resetForNewSend: () =>
    set((state) => ({
      ...initialState,
      pricing: state.pricing,
    })),
}));

export default useSmsStore;
