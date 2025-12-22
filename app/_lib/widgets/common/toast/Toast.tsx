'use client';

import React from 'react';
import { 
    CheckCircle2, 
    AlertCircle, 
    Info, 
    X, 
    Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast, Toast as ToastType } from 'react-hot-toast';

export type ToastStatus = 'success' | 'error' | 'info' | 'loading';

interface ToastProps {
    t: ToastType;
    status: ToastStatus;
    message: React.ReactNode;
}

/**
 * 커스텀 토스트 위젯
 * - 프리미엄 디자인 적용 (Glassmorphism, 부드러운 애니메이션)
 * - 화면 상단 중앙 배치 최적화
 */
export function Toast({ t, status, message }: ToastProps) {
    const iconMap = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-rose-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        loading: <Loader2 className="w-5 h-5 text-[#4E8C6D] animate-spin" />,
    };

    const bgMap = {
        success: 'border-emerald-100',
        error: 'border-rose-100',
        info: 'border-blue-100',
        loading: 'border-gray-100',
    };

    return (
        <div
            className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl',
                'bg-white transition-all duration-300',
                bgMap[status],
                t.visible ? 'animate-in fade-in slide-in-from-top-4 duration-300' : 'animate-out fade-out slide-out-to-top-2 duration-200'
            )}
        >
            <div className="flex-shrink-0">
                {iconMap[status]}
            </div>
            
            <p className="text-[15px] font-medium text-gray-800 leading-tight">
                {message}
            </p>

            <button
                onClick={() => toast.dismiss(t.id)}
                className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
