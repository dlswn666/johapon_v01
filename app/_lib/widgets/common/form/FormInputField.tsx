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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel';

interface FormInputFieldProps<T extends FieldValues> {
    /** react-hook-form control 객체 */
    control: Control<T>;
    /** 필드명 (form 데이터 키) */
    name: Path<T>;
    /** 레이블 텍스트 */
    label: string;
    /** 플레이스홀더 텍스트 */
    placeholder?: string;
    /** input 타입 */
    type?: InputType;
    /** 비활성화 여부 */
    disabled?: boolean;
    /** 추가 스타일 클래스 */
    className?: string;
}

/**
 * FormInputField 위젯
 * 
 * react-hook-form과 통합된 입력 필드 위젯입니다.
 * 디자인 시스템에 맞춰 흰색 배경, 테마 색상 레이블이 적용됩니다.
 * 
 * @example
 * <FormInputField
 *   control={form.control}
 *   name="title"
 *   label="제목"
 *   placeholder="제목을 입력해주세요"
 * />
 */
export function FormInputField<T extends FieldValues>({
    control,
    name,
    label,
    placeholder = '',
    type = 'text',
    disabled = false,
    className,
}: FormInputFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">
                        {label}
                    </FormLabel>
                    <FormControl>
                        <Input
                            type={type}
                            placeholder={placeholder}
                            disabled={disabled}
                            {...field}
                            className={cn(
                                'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                'bg-white' // 디자인 시스템: Input 영역 배경색 흰색
                            )}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default FormInputField;

