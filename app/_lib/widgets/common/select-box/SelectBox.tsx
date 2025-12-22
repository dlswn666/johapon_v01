'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface SelectBoxOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectBoxProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectBoxOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * SelectBox 공통 위젯
 * - 오른쪽 패딩 증가로 화살표 위치 개선
 * - 화살표 색상을 부드러운 회색으로 변경
 * - 호버 효과 추가
 * - 옵션 호버 효과 회색 계열 적용
 * - 기존 페이지 스타일과 일관성 유지 (rounded-xl, h-12, border-gray-300)
 */
export function SelectBox({
    value,
    onChange,
    options,
    placeholder = '선택하세요',
    className,
    disabled = false,
}: SelectBoxProps) {
    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger
                className={cn(
                    // 기본 스타일
                    'h-12 px-4 pr-10 rounded-xl border border-gray-300',
                    // 텍스트 스타일
                    'text-[14px] text-gray-900',
                    // 포커스 스타일
                    'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent',
                    // 호버 효과
                    'hover:bg-gray-50 hover:border-gray-400',
                    // 트랜지션
                    'transition-all duration-200',
                    // 화살표 색상 조정 (부드러운 회색)
                    '[&_svg]:text-gray-400',
                    // 비활성화 스타일
                    'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500',
                    className
                )}
            >
                <SelectValue placeholder={placeholder} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </SelectTrigger>
            <SelectContent
                className={cn(
                    'bg-white rounded-xl border border-gray-200 shadow-lg',
                    'max-h-60 overflow-y-auto'
                )}
            >
                {options.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        className={cn(
                            'text-[14px] text-gray-900 px-4 py-3 cursor-pointer',
                            // 호버 효과 - 회색 계열
                            'hover:bg-gray-100 focus:bg-gray-100',
                            // 선택된 항목 스타일
                            'data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#4E8C6D] data-[state=checked]:font-medium',
                            // 트랜지션
                            'transition-colors duration-150'
                        )}
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default SelectBox;




