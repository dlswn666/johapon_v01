'use client';

import * as React from 'react';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateShort } from '@/app/_lib/shared/utils/commonUtil';

interface DatePickerProps {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
}

export function DatePicker({
    value,
    onChange,
    className,
    disabled = false,
    placeholder = '날짜 선택',
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (date: Date | undefined) => {
        onChange(date);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full h-[48px] justify-start text-left font-normal rounded-[12px] border-[#CCCCCC] px-4 hover:bg-gray-200',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#5FA37C] shrink-0" />
                    <span className="text-[14px] truncate">
                        {value ? formatDateShort(value) : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={handleSelect}
                    initialFocus
                    locale={ko}
                />
            </PopoverContent>
        </Popover>
    );
}

export default DatePicker;
