'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BirthDatePickerProps {
    value: string; // "YYYY-MM-DD" 형식
    onChange: (date: string) => void;
    onPartialChange?: (isPartial: boolean) => void; // 부분 선택 상태 알림 (년/월만 선택한 경우)
    className?: string;
    disabled?: boolean;
}

type Step = 'year' | 'month' | 'day';

/**
 * 생년월일 선택 공통 컴포넌트
 * 단계별 선택: 년 → 월 → 일
 * - 년/월 선택 시 하단에 이전/다음 버튼
 * - 일 선택 시 완료 처리
 */
export function BirthDatePicker({ value, onChange, onPartialChange, className, disabled = false }: BirthDatePickerProps) {
    const currentYear = new Date().getFullYear();

    const [step, setStep] = useState<Step>('year');
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // 년도 스크롤 영역 ref
    const yearGridRef = useRef<HTMLDivElement>(null);

    // value prop이 변경되면 로컬 상태도 동기화
    useEffect(() => {
        if (value) {
            const parts = value.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0]);
                const m = parseInt(parts[1]);
                const d = parseInt(parts[2]);
                if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                    setSelectedYear(y);
                    setSelectedMonth(m);
                    setSelectedDay(d);
                    setStep('day'); // 이미 값이 있으면 일 선택 단계로
                }
            }
        } else {
            setSelectedYear(null);
            setSelectedMonth(null);
            setSelectedDay(null);
            setStep('year');
        }
    }, [value]);

    // 년도 선택 시 선택된 년도가 보이도록 스크롤
    useEffect(() => {
        if (step === 'year' && yearGridRef.current && selectedYear) {
            const selectedEl = yearGridRef.current.querySelector('[data-selected="true"]');
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
        }
    }, [step, selectedYear]);

    // 윤년 체크
    const isLeapYear = useCallback((y: number): boolean => {
        return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    }, []);

    // 해당 월의 일수 계산
    const getDaysInMonth = useCallback(
        (y: number, m: number): number => {
            const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (m === 2 && isLeapYear(y)) {
                return 29;
            }
            return daysInMonth[m - 1] || 31;
        },
        [isLeapYear]
    );

    // 년도 옵션 (현재년도 ~ 1900년, 내림차순)
    const yearOptions = useMemo(() => {
        const years: number[] = [];
        for (let y = currentYear; y >= 1900; y--) {
            years.push(y);
        }
        return years;
    }, [currentYear]);

    // 일 옵션
    const dayOptions = useMemo(() => {
        const y = selectedYear || currentYear;
        const m = selectedMonth || 1;
        const maxDay = getDaysInMonth(y, m);
        return Array.from({ length: maxDay }, (_, i) => i + 1);
    }, [selectedYear, selectedMonth, currentYear, getDaysInMonth]);

    // 부분 선택 상태 알림
    useEffect(() => {
        const hasPartialSelection = (selectedYear !== null || selectedMonth !== null) && selectedDay === null;
        onPartialChange?.(hasPartialSelection);
    }, [selectedYear, selectedMonth, selectedDay, onPartialChange]);

    // 년도 선택 핸들러
    const handleYearSelect = useCallback((year: number) => {
        setSelectedYear(year);
    }, []);

    // 월 선택 핸들러
    const handleMonthSelect = useCallback((month: number) => {
        setSelectedMonth(month);
    }, []);

    // 일 선택 핸들러 → 완료
    const handleDaySelect = useCallback(
        (day: number) => {
            setSelectedDay(day);
            if (selectedYear && selectedMonth) {
                const maxDay = getDaysInMonth(selectedYear, selectedMonth);
                const validDay = Math.min(day, maxDay);
                const formatted = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
                onChange(formatted);
            }
        },
        [selectedYear, selectedMonth, getDaysInMonth, onChange]
    );

    // 다음 단계
    const handleNext = useCallback(() => {
        if (step === 'year' && selectedYear !== null) {
            setStep('month');
        } else if (step === 'month' && selectedMonth !== null) {
            setStep('day');
        }
    }, [step, selectedYear, selectedMonth]);

    // 이전 단계
    const handlePrev = useCallback(() => {
        if (step === 'month') {
            setStep('year');
        } else if (step === 'day') {
            setStep('month');
        }
    }, [step]);

    // 현재 선택 상태를 보여주는 요약 텍스트
    const summaryText = useMemo(() => {
        const parts: string[] = [];
        if (selectedYear) parts.push(`${selectedYear}년`);
        if (selectedMonth) parts.push(`${selectedMonth}월`);
        if (selectedDay) parts.push(`${selectedDay}일`);
        return parts.length > 0 ? parts.join(' ') : '생년월일을 선택하세요';
    }, [selectedYear, selectedMonth, selectedDay]);

    // 단계 제목
    const stepTitle = useMemo(() => {
        if (step === 'year') return '년도 선택';
        if (step === 'month') return '월 선택';
        return '일 선택';
    }, [step]);

    // 단계 인디케이터
    const stepIndicator = useMemo(() => {
        const steps: { key: Step; label: string }[] = [
            { key: 'year', label: '년' },
            { key: 'month', label: '월' },
            { key: 'day', label: '일' },
        ];
        return steps.map((s) => ({
            ...s,
            active: s.key === step,
            completed:
                (s.key === 'year' && selectedYear !== null) ||
                (s.key === 'month' && selectedMonth !== null) ||
                (s.key === 'day' && selectedDay !== null),
        }));
    }, [step, selectedYear, selectedMonth, selectedDay]);

    if (disabled) {
        return (
            <div className={cn('text-center py-4 text-gray-500 bg-gray-100 rounded-lg', className)}>
                {summaryText}
            </div>
        );
    }

    return (
        <div className={cn('w-full', className)}>
            {/* 상단: 선택된 값 요약 + 단계 인디케이터 */}
            <div className="mb-3">
                <p className="text-sm text-gray-500 text-center mb-2">{summaryText}</p>
                <div className="flex justify-center gap-2">
                    {stepIndicator.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => {
                                // 이전 단계로만 이동 가능 (또는 완료된 단계)
                                if (s.key === 'year') setStep('year');
                                else if (s.key === 'month' && selectedYear !== null) setStep('month');
                                else if (s.key === 'day' && selectedYear !== null && selectedMonth !== null) setStep('day');
                            }}
                            className={cn(
                                'px-3 py-1 rounded-full text-xs font-medium transition-all',
                                s.active
                                    ? 'bg-[#4E8C6D] text-white'
                                    : s.completed
                                      ? 'bg-[#4E8C6D]/20 text-[#4E8C6D]'
                                      : 'bg-gray-100 text-gray-400'
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 단계 제목 */}
            <p className="text-center text-base font-semibold text-gray-700 mb-2">{stepTitle}</p>

            {/* 컨텐츠 영역 */}
            <div className="bg-gray-50 rounded-xl p-3">
                {/* 년도 선택 */}
                {step === 'year' && (
                    <div
                        ref={yearGridRef}
                        className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto px-1"
                    >
                        {yearOptions.map((year) => (
                            <button
                                key={year}
                                type="button"
                                data-selected={selectedYear === year}
                                onClick={() => handleYearSelect(year)}
                                className={cn(
                                    'py-2.5 rounded-lg text-sm font-medium transition-all',
                                    selectedYear === year
                                        ? 'bg-[#4E8C6D] text-white shadow-sm'
                                        : 'bg-white text-gray-700 hover:bg-[#4E8C6D]/10 border border-gray-200'
                                )}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                )}

                {/* 월 선택 */}
                {step === 'month' && (
                    <div className="grid grid-cols-4 gap-2 px-1">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <button
                                key={month}
                                type="button"
                                onClick={() => handleMonthSelect(month)}
                                className={cn(
                                    'py-3.5 rounded-lg text-base font-medium transition-all',
                                    selectedMonth === month
                                        ? 'bg-[#4E8C6D] text-white shadow-sm'
                                        : 'bg-white text-gray-700 hover:bg-[#4E8C6D]/10 border border-gray-200'
                                )}
                            >
                                {month}월
                            </button>
                        ))}
                    </div>
                )}

                {/* 일 선택 */}
                {step === 'day' && (
                    <div className="grid grid-cols-5 gap-2 px-1">
                        {dayOptions.map((day) => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDaySelect(day)}
                                className={cn(
                                    'py-2.5 rounded-lg text-sm font-medium transition-all',
                                    selectedDay === day
                                        ? 'bg-[#4E8C6D] text-white shadow-sm'
                                        : 'bg-white text-gray-700 hover:bg-[#4E8C6D]/10 border border-gray-200'
                                )}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 하단 네비게이션 버튼 */}
            <div className="flex gap-3 mt-3">
                {/* 년도 단계: 다음 버튼만 */}
                {step === 'year' && (
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={selectedYear === null}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold transition-all',
                            selectedYear !== null
                                ? 'bg-[#4E8C6D] text-white active:bg-[#3d7159]'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        )}
                    >
                        다음 (월 선택)
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}

                {/* 월 단계: 이전 + 다음 */}
                {step === 'month' && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold bg-gray-100 text-gray-700 active:bg-gray-200 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            이전
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={selectedMonth === null}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold transition-all',
                                selectedMonth !== null
                                    ? 'bg-[#4E8C6D] text-white active:bg-[#3d7159]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            )}
                        >
                            다음 (일 선택)
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}

                {/* 일 단계: 이전 버튼만 (일을 누르면 바로 완료) */}
                {step === 'day' && (
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold bg-gray-100 text-gray-700 active:bg-gray-200 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        이전 (월 선택)
                    </button>
                )}
            </div>
        </div>
    );
}

export default BirthDatePicker;
