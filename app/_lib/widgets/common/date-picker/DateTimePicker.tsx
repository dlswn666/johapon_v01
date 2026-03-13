'use client';

import * as React from 'react';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateShort } from '@/app/_lib/shared/utils/commonUtil';

interface DateTimePickerProps {
    value: Date | undefined | null;
    onChange: (date: Date | undefined) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
    /** 선택 가능한 최소 날짜 */
    min?: Date;
    /** 선택 가능한 최대 날짜 */
    max?: Date;
    /** 에러 상태 표시 */
    hasError?: boolean;
}

// 시간 옵션 생성 (00~23)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
// 분 옵션 생성 (00, 10, 20, 30, 40, 50)
const MINUTE_OPTIONS = Array.from({ length: 6 }, (_, i) => String(i * 10).padStart(2, '0'));

/**
 * 날짜+시간 선택 위젯
 * - StartEndPicker와 동일한 버튼 디자인
 * - Calendar 팝오버 + 하단 시/분 셀렉트
 */
export function DateTimePicker({
    value,
    onChange,
    label,
    className,
    disabled = false,
    placeholder = '날짜·시간 선택',
    min,
    max,
    hasError = false,
}: DateTimePickerProps) {
    const [open, setOpen] = React.useState(false);

    // 현재 선택된 시/분 값
    const selectedHour = value ? String(value.getHours()).padStart(2, '0') : '09';
    const selectedMinute = value ? String(Math.floor(value.getMinutes() / 10) * 10).padStart(2, '0') : '00';

    // 날짜 선택 핸들러
    const handleDateSelect = (date: Date | undefined) => {
        if (!date) {
            onChange(undefined);
            return;
        }

        // 기존 시간 유지, 날짜만 변경
        const hour = value ? value.getHours() : parseInt(selectedHour);
        const minute = value ? value.getMinutes() : parseInt(selectedMinute);

        const newDate = new Date(date);
        newDate.setHours(hour, minute, 0, 0);
        onChange(newDate);
    };

    // 시간 변경 핸들러
    const handleHourChange = (hour: string) => {
        if (!value) return;
        const newDate = new Date(value);
        newDate.setHours(parseInt(hour));
        onChange(newDate);
    };

    // 분 변경 핸들러
    const handleMinuteChange = (minute: string) => {
        if (!value) return;
        const newDate = new Date(value);
        newDate.setMinutes(parseInt(minute));
        onChange(newDate);
    };

    // 표시 텍스트 포맷
    const displayText = value
        ? `${formatDateShort(value)}  ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
        : null;

    return (
        <div className={cn('min-w-0', className)}>
            {label && (
                <label className="block text-[12px] sm:text-[14px] font-medium text-gray-700 mb-1 sm:mb-2">
                    {label}
                </label>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            'w-full h-[40px] sm:h-[48px] justify-start text-left font-normal rounded-[8px] sm:rounded-[12px] border-[#CCCCCC] px-2 sm:px-4 hover:bg-gray-200',
                            !value && 'text-muted-foreground',
                            hasError && 'border-red-500'
                        )}
                    >
                        <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-[#5FA37C] shrink-0" />
                        <span className="text-[12px] sm:text-[14px] truncate">
                            {displayText || placeholder}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={value ?? undefined}
                        onSelect={handleDateSelect}
                        disabled={(date) => {
                            if (min && date < new Date(min.getFullYear(), min.getMonth(), min.getDate())) return true;
                            if (max && date > new Date(max.getFullYear(), max.getMonth(), max.getDate())) return true;
                            return false;
                        }}
                        initialFocus
                        locale={ko}
                    />
                    {/* 시간 선택 영역 */}
                    <div className="flex items-center gap-2 px-4 pb-4 pt-2 border-t border-slate-100">
                        <span className="text-sm font-medium text-slate-600 shrink-0">시간</span>
                        <select
                            value={selectedHour}
                            onChange={(e) => handleHourChange(e.target.value)}
                            disabled={!value}
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center bg-white focus:ring-2 focus:ring-[#5FA37C] outline-none disabled:opacity-50"
                        >
                            {HOUR_OPTIONS.map((h) => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                        <span className="text-sm font-bold text-slate-400">:</span>
                        <select
                            value={selectedMinute}
                            onChange={(e) => handleMinuteChange(e.target.value)}
                            disabled={!value}
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center bg-white focus:ring-2 focus:ring-[#5FA37C] outline-none disabled:opacity-50"
                        >
                            {MINUTE_OPTIONS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default DateTimePicker;
