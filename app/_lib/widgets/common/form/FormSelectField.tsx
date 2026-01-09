'use client';

import React from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
}

interface FormSelectFieldProps<T extends FieldValues> {
    /** react-hook-form control 객체 */
    control: Control<T>;
    /** 필드명 (form 데이터 키) */
    name: Path<T>;
    /** 레이블 텍스트 */
    label: string;
    /** 플레이스홀더 텍스트 */
    placeholder?: string;
    /** 선택 옵션 목록 */
    options: SelectOption[];
    /** 비활성화 여부 */
    disabled?: boolean;
    /** 추가 스타일 클래스 */
    className?: string;
    /** 필수 여부 표시 */
    required?: boolean;
}

/**
 * FormSelectField 위젯
 * 
 * react-hook-form과 통합된 Select 필드 위젯입니다.
 * 디자인 시스템에 맞춰 흰색 배경, 테마 색상 레이블이 적용됩니다.
 * 
 * @example
 * <FormSelectField
 *   control={form.control}
 *   name="business_type"
 *   label="사업 유형"
 *   placeholder="선택하세요"
 *   options={[
 *     { value: 'REDEVELOPMENT', label: '재개발' },
 *     { value: 'RECONSTRUCTION', label: '재건축' },
 *   ]}
 * />
 */
export function FormSelectField<T extends FieldValues>({
    control,
    name,
    label,
    placeholder = '선택하세요',
    options,
    disabled = false,
    className,
    required = false,
}: FormSelectFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={disabled}
                    >
                        <FormControl>
                            <SelectTrigger
                                className={cn(
                                    'h-[48px] w-full text-[16px] rounded-[12px] border-[#CCCCCC]',
                                    'bg-white'
                                )}
                            >
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default FormSelectField;
