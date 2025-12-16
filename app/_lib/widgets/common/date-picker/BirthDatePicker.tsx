'use client';

import React, { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface BirthDatePickerProps {
    value: string; // "YYYY-MM-DD" 형식
    onChange: (date: string) => void;
    className?: string;
    disabled?: boolean;
}

/**
 * 생년월일 선택 공통 컴포넌트
 * 년, 월, 일을 각각 SelectBox로 선택
 * - 년도: 1900년 ~ 현재년도
 * - 월: 1월 ~ 12월
 * - 일: 선택된 년/월에 따라 동적 변경 (윤년 고려)
 */
export function BirthDatePicker({ value, onChange, className, disabled = false }: BirthDatePickerProps) {
    const currentYear = new Date().getFullYear();

    // value에서 년, 월, 일 파싱 (상태 대신 직접 계산)
    const parsedDate = useMemo(() => {
        if (value) {
            const parts = value.split('-');
            if (parts.length === 3) {
                return {
                    year: parts[0],
                    month: parts[1].replace(/^0/, ''), // 앞의 0 제거
                    day: parts[2].replace(/^0/, ''), // 앞의 0 제거
                };
            }
        }
        return { year: '', month: '', day: '' };
    }, [value]);

    const { year, month, day } = parsedDate;

    // 년도 옵션 생성 (현재년도 ~ 1900년, 내림차순)
    const yearOptions = useMemo(() => {
        const years: number[] = [];
        for (let y = currentYear; y >= 1900; y--) {
            years.push(y);
        }
        return years;
    }, [currentYear]);

    // 월 옵션 생성 (1 ~ 12)
    const monthOptions = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => i + 1);
    }, []);

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

    // 일 옵션 생성 (선택된 년/월에 따라)
    const dayOptions = useMemo(() => {
        const y = parseInt(year) || currentYear;
        const m = parseInt(month) || 1;
        const maxDay = getDaysInMonth(y, m);
        return Array.from({ length: maxDay }, (_, i) => i + 1);
    }, [year, month, currentYear, getDaysInMonth]);

    // 값 변경 시 전체 날짜 업데이트
    const handleChange = useCallback(
        (newYear: string, newMonth: string, newDay: string) => {
            // 모든 값이 입력된 경우에만 onChange 호출
            if (newYear && newMonth && newDay) {
                const formattedMonth = newMonth.padStart(2, '0');

                // 선택된 월에 유효한 일인지 확인
                const y = parseInt(newYear);
                const m = parseInt(newMonth);
                const d = parseInt(newDay);
                const maxDay = getDaysInMonth(y, m);

                // 일이 최대 일수를 초과하면 최대 일수로 조정
                const validDay = Math.min(d, maxDay);
                const finalDay = String(validDay).padStart(2, '0');

                onChange(`${newYear}-${formattedMonth}-${finalDay}`);
            } else if (!newYear && !newMonth && !newDay) {
                // 모든 값이 비어있으면 빈 문자열 전달
                onChange('');
            }
        },
        [getDaysInMonth, onChange]
    );

    const handleYearChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newYear = e.target.value;
            handleChange(newYear, month, day);
        },
        [handleChange, month, day]
    );

    const handleMonthChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newMonth = e.target.value;
            handleChange(year, newMonth, day);
        },
        [handleChange, year, day]
    );

    const handleDayChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newDay = e.target.value;
            handleChange(year, month, newDay);
        },
        [handleChange, year, month]
    );

    const selectClassName = cn(
        'appearance-none bg-white border border-gray-300 rounded-lg',
        'px-3 py-3 pr-8',
        'text-base md:text-lg text-center',
        'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent',
        'transition-all cursor-pointer',
        'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500'
    );

    const selectWrapperClassName = 'relative flex-1';

    return (
        <div className={cn('flex gap-2 md:gap-3 items-center w-full', className)}>
            {/* 년도 선택 */}
            <div className={selectWrapperClassName}>
                <select
                    value={year}
                    onChange={handleYearChange}
                    disabled={disabled}
                    className={cn(selectClassName, 'w-full')}
                    aria-label="년도 선택"
                >
                    <option value="">년도</option>
                    {yearOptions.map((y) => (
                        <option key={y} value={y}>
                            {y}년
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* 월 선택 */}
            <div className={selectWrapperClassName}>
                <select
                    value={month}
                    onChange={handleMonthChange}
                    disabled={disabled}
                    className={cn(selectClassName, 'w-full')}
                    aria-label="월 선택"
                >
                    <option value="">월</option>
                    {monthOptions.map((m) => (
                        <option key={m} value={m}>
                            {m}월
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* 일 선택 */}
            <div className={selectWrapperClassName}>
                <select
                    value={day}
                    onChange={handleDayChange}
                    disabled={disabled}
                    className={cn(selectClassName, 'w-full')}
                    aria-label="일 선택"
                >
                    <option value="">일</option>
                    {dayOptions.map((d) => (
                        <option key={d} value={d}>
                            {d}일
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}

export default BirthDatePicker;

