'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface StartEndPickerProps {
    startDate: Date | undefined;
    endDate: Date | undefined;
    onStartDateChange: (date: Date | undefined) => void;
    onEndDateChange: (date: Date | undefined) => void;
    className?: string;
    disabled?: boolean;
}

/**
 * 시작일/종료일 선택 위젯
 * - 시작일은 종료일 이후가 될 수 없음
 * - 종료일은 시작일 이전이 될 수 없음
 * - 모바일/데스크톱 모두 좌우 배치 유지
 */
export function StartEndPicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    className,
    disabled = false,
}: StartEndPickerProps) {
    const [startOpen, setStartOpen] = React.useState(false);
    const [endOpen, setEndOpen] = React.useState(false);

    // 시작일 선택 핸들러
    const handleStartDateSelect = (date: Date | undefined) => {
        onStartDateChange(date);
        setStartOpen(false);

        // 시작일이 종료일보다 늦으면 종료일 초기화
        if (date && endDate && date > endDate) {
            onEndDateChange(undefined);
        }
    };

    // 종료일 선택 핸들러
    const handleEndDateSelect = (date: Date | undefined) => {
        onEndDateChange(date);
        setEndOpen(false);
    };

    // 날짜 포맷 함수 - 모바일에서는 간결하게 표시
    const formatDate = (date: Date) => {
        // 화면 너비에 따라 포맷 변경 (SSR 호환을 위해 CSS로 처리)
        return format(date, 'yy.MM.dd', { locale: ko });
    };

    return (
        <div className={cn('flex flex-row items-end gap-2 sm:gap-4', className)}>
            {/* 시작일 선택 */}
            <div className="flex-1 min-w-0">
                <label className="block text-[12px] sm:text-[14px] font-medium text-gray-700 mb-1 sm:mb-2">
                    시작일
                </label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            disabled={disabled}
                            className={cn(
                                'w-full h-[40px] sm:h-[48px] justify-start text-left font-normal rounded-[8px] sm:rounded-[12px] border-[#CCCCCC] px-2 sm:px-4 hover:bg-gray-200',
                                !startDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-[#5FA37C] shrink-0" />
                            <span className="text-[12px] sm:text-[14px] truncate">
                                {startDate ? formatDate(startDate) : '시작일'}
                            </span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={handleStartDateSelect}
                            disabled={(date) => {
                                // 종료일이 있으면 종료일 이후는 선택 불가
                                if (endDate && date > endDate) return true;
                                return false;
                            }}
                            initialFocus
                            locale={ko}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* 구분선 - 모바일/데스크톱 모두 표시 */}
            <div className="flex items-center pb-1 sm:pb-3">
                <span className="text-gray-400 text-[12px] sm:text-[14px]">~</span>
            </div>

            {/* 종료일 선택 */}
            <div className="flex-1 min-w-0">
                <label className="block text-[12px] sm:text-[14px] font-medium text-gray-700 mb-1 sm:mb-2">
                    종료일
                </label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            disabled={disabled}
                            className={cn(
                                'w-full h-[40px] sm:h-[48px] justify-start text-left font-normal rounded-[8px] sm:rounded-[12px] border-[#CCCCCC] px-2 sm:px-4 hover:bg-gray-200',
                                !endDate && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-[#5FA37C] shrink-0" />
                            <span className="text-[12px] sm:text-[14px] truncate">
                                {endDate ? formatDate(endDate) : '종료일'}
                            </span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={handleEndDateSelect}
                            disabled={(date) => {
                                // 시작일이 있으면 시작일 이전은 선택 불가
                                if (startDate && date < startDate) return true;
                                return false;
                            }}
                            initialFocus
                            locale={ko}
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}

export default StartEndPicker;

