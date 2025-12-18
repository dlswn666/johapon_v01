'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
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
 * - 어떤 순서로 선택해도 값이 유지됨 (로컬 상태 사용)
 */
export function BirthDatePicker({ value, onChange, className, disabled = false }: BirthDatePickerProps) {
    const currentYear = new Date().getFullYear();

    // 로컬 상태: 부분 선택을 저장하기 위해 사용
    const [localYear, setLocalYear] = useState<string>('');
    const [localMonth, setLocalMonth] = useState<string>('');
    const [localDay, setLocalDay] = useState<string>('');

    // value prop이 변경되면 로컬 상태도 동기화
    useEffect(() => {
        if (value) {
            const parts = value.split('-');
            if (parts.length === 3) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- value prop 동기화 필요
                setLocalYear(parts[0]);
                setLocalMonth(parts[1].replace(/^0/, '')); // 앞의 0 제거
                setLocalDay(parts[2].replace(/^0/, '')); // 앞의 0 제거
            }
        } else {
            // value가 비어있으면 로컬 상태도 초기화
            setLocalYear('');
            setLocalMonth('');
            setLocalDay('');
        }
    }, [value]);

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

    // 일 옵션 생성 (선택된 년/월에 따라 - 로컬 상태 사용)
    const dayOptions = useMemo(() => {
        const y = parseInt(localYear) || currentYear;
        const m = parseInt(localMonth) || 1;
        const maxDay = getDaysInMonth(y, m);
        return Array.from({ length: maxDay }, (_, i) => i + 1);
    }, [localYear, localMonth, currentYear, getDaysInMonth]);

    // 3개 값이 모두 있을 때 onChange 호출
    const triggerOnChange = useCallback(
        (newYear: string, newMonth: string, newDay: string) => {
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
            }
        },
        [getDaysInMonth, onChange]
    );

    // 년도 변경 핸들러: 로컬 상태 업데이트 후 3개 모두 있으면 onChange 호출
    const handleYearChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newYear = e.target.value;
            setLocalYear(newYear);
            triggerOnChange(newYear, localMonth, localDay);
        },
        [triggerOnChange, localMonth, localDay]
    );

    // 월 변경 핸들러: 로컬 상태 업데이트 후 3개 모두 있으면 onChange 호출
    const handleMonthChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newMonth = e.target.value;
            setLocalMonth(newMonth);
            triggerOnChange(localYear, newMonth, localDay);
        },
        [triggerOnChange, localYear, localDay]
    );

    // 일 변경 핸들러: 로컬 상태 업데이트 후 3개 모두 있으면 onChange 호출
    const handleDayChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newDay = e.target.value;
            setLocalDay(newDay);
            triggerOnChange(localYear, localMonth, newDay);
        },
        [triggerOnChange, localYear, localMonth]
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
                    value={localYear}
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
                    value={localMonth}
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
                    value={localDay}
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

