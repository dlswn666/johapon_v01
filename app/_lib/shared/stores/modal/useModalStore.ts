'use client';

import { create } from 'zustand';

interface ConfirmModalConfig {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
}

interface AlertModalConfig {
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ModalStore {
    // Confirm Modal State
    confirmModal: {
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText: string;
        cancelText: string;
        variant: 'default' | 'danger';
    };

    // Alert Modal State
    alertModal: {
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    };

    // Confirm Modal Actions
    openConfirmModal: (config: ConfirmModalConfig) => void;
    closeConfirmModal: () => void;

    // Alert Modal Actions
    openAlertModal: (config: AlertModalConfig) => void;
    closeAlertModal: () => void;

    // Reset
    reset: () => void;
}

const initialState = {
    confirmModal: {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        confirmText: '확인',
        cancelText: '취소',
        variant: 'default' as const,
    },
    alertModal: {
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as const,
    },
};

const useModalStore = create<ModalStore>((set) => ({
    ...initialState,

    openConfirmModal: (config) =>
        set({
            confirmModal: {
                isOpen: true,
                title: config.title,
                message: config.message,
                onConfirm: config.onConfirm,
                confirmText: config.confirmText || '확인',
                cancelText: config.cancelText || '취소',
                variant: config.variant || 'default',
            },
        }),

    closeConfirmModal: () =>
        set({
            confirmModal: initialState.confirmModal,
        }),

    openAlertModal: (config) =>
        set({
            alertModal: {
                isOpen: true,
                title: config.title,
                message: config.message,
                type: config.type,
            },
        }),

    closeAlertModal: () =>
        set({
            alertModal: initialState.alertModal,
        }),

    reset: () => set(initialState),
}));

export default useModalStore;
