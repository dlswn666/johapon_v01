'use client';

import React from 'react';
import { Users, CheckCircle2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsentStatusBarProps {
    mode: 'consent' | 'registration';
    currentValue: number;
    totalValue: number;
    requiredRate: number;
    currentRate: number;
    areaRate?: number; // 동의 현황 모드에서만 사용
}

export default function ConsentStatusBar({
    mode,
    currentValue,
    totalValue,
    requiredRate,
    currentRate,
    areaRate
}: ConsentStatusBarProps) {
    const isAchieved = currentRate >= requiredRate;
    const remaining = Math.max(0, requiredRate - currentRate);
    
    // 모드별 텍스트
    const modeText = {
        consent: {
            title: '동의 현황',
            current: '현재 동의',
            target: '법적 효력 동의율',
            unit: '명'
        },
        registration: {
            title: '가입 현황',
            current: '가입 조합원',
            target: '전체 조합원',
            unit: '명'
        }
    };

    const text = modeText[mode];

    // 동의 현황 모드 렌더링
    if (mode === 'consent') {
        return (
            <div className="space-y-4">
                {/* 제목 */}
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {text.title}
                    </h3>
                    {areaRate !== undefined && (
                        <span className="text-xs text-slate-500">
                            면적 기준: <strong className="text-green-600">{Math.round(areaRate)}%</strong>
                        </span>
                    )}
                </div>

                {/* 동의율 표시 - 새로운 형식 */}
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm text-slate-600">현재 동의율</span>
                    <span className={cn(
                        "text-2xl font-bold",
                        isAchieved ? "text-primary" : "text-blue-600"
                    )}>
                        {Math.round(currentRate * 10) / 10}%
                    </span>
                    <span className="text-sm text-slate-500">
                        ({currentValue.toLocaleString()}명 / 총 {totalValue.toLocaleString()}명)
                    </span>
                    <span className="text-slate-300">-</span>
                    {isAchieved ? (
                        <span className="text-sm font-semibold text-primary">
                            동의율 달성
                        </span>
                    ) : (
                        <span className="text-sm font-semibold text-amber-600">
                            {Math.round(remaining * 10) / 10}% 부족
                        </span>
                    )}
                </div>

                {/* 프로그레스 바 */}
                <div className="space-y-2">
                    <div className="relative">
                        {/* 배경 바 */}
                        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                            {/* 현재 진행률 */}
                            <div 
                                className={cn(
                                    "h-full transition-all duration-500 ease-out rounded-full",
                                    isAchieved 
                                        ? "bg-gradient-to-r from-primary/80 to-primary" 
                                        : "bg-gradient-to-r from-blue-400 to-blue-500"
                                )}
                                style={{ width: `${Math.min(100, currentRate)}%` }}
                            />
                        </div>
                        
                        {/* 법적 효력 동의율 마커 */}
                        {requiredRate < 100 && (
                            <div 
                                className="absolute top-0 h-4 w-0.5 bg-red-500"
                                style={{ left: `${requiredRate}%` }}
                            >
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500 whitespace-nowrap">
                                    법적 효력 {requiredRate}%
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 가입 현황 모드 렌더링 (기존 구조 유지)
    return (
        <div className="space-y-4">
            {/* 제목 */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    {text.title}
                </h3>
            </div>

            {/* 수치 박스 */}
            <div className="grid gap-4 grid-cols-3">
                {/* 현재 수치 */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                    <div className="text-xs text-blue-600 font-medium mb-1">{text.current}</div>
                    <div className="text-2xl font-bold text-blue-700">
                        {currentValue.toLocaleString()}
                        <span className="text-sm font-normal text-blue-500 ml-1">{text.unit}</span>
                    </div>
                </div>

                {/* 목표/전체 수치 */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/50">
                    <div className="text-xs text-slate-600 font-medium mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {text.target}
                    </div>
                    <div className="text-2xl font-bold text-slate-700">
                        {totalValue.toLocaleString()}
                        <span className="text-sm font-normal text-slate-500 ml-1">{text.unit}</span>
                    </div>
                </div>

                {/* 가입률 퍼센트 카드 */}
                <div className={cn(
                    "rounded-xl p-4 border",
                    isAchieved 
                        ? "bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50"
                        : "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50"
                )}>
                    <div className={cn(
                        "text-xs font-medium mb-1",
                        isAchieved ? "text-green-600" : "text-amber-600"
                    )}>
                        가입률
                    </div>
                    <div className={cn(
                        "text-2xl font-bold",
                        isAchieved ? "text-green-700" : "text-amber-700"
                    )}>
                        {Math.round(currentRate * 10) / 10}
                        <span className={cn(
                            "text-sm font-normal ml-1",
                            isAchieved ? "text-green-500" : "text-amber-500"
                        )}>%</span>
                    </div>
                </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="space-y-2">
                <div className="relative">
                    {/* 배경 바 */}
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                        {/* 현재 진행률 */}
                        <div 
                            className={cn(
                                "h-full transition-all duration-500 ease-out rounded-full",
                                isAchieved 
                                    ? "bg-gradient-to-r from-green-400 to-green-500" 
                                    : "bg-gradient-to-r from-blue-400 to-blue-500"
                            )}
                            style={{ width: `${Math.min(100, currentRate)}%` }}
                        />
                    </div>
                </div>

                {/* 비율 표시 */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "font-bold text-lg",
                            isAchieved ? "text-green-600" : "text-blue-600"
                        )}>
                            {Math.round(currentRate * 10) / 10}%
                        </span>
                        {isAchieved && (
                            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                달성 완료
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

