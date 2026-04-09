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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FormTextareaFieldProps<T extends FieldValues> {
    /** react-hook-form control 객체 */
    control: Control<T>;
    /** 필드명 (form 데이터 키) */
    name: Path<T>;
    /** 레이블 텍스트 */
    label: string;
    /** 플레이스홀더 텍스트 */
    placeholder?: string;
    /** 줄 수 */
    rows?: number;
    /** 비활성화 여부 */
    disabled?: boolean;
    /** 추가 스타일 클래스 */
    className?: string;
    /** 필수 필드 표시 */
    required?: boolean;
}

/**
 * FormTextareaField 위젯
 *
 * react-hook-form과 통합된 Textarea 필드 위젯입니다.
 * 디자인 시스템에 맞춰 흰색 배경, 테마 색상 레이블이 적용됩니다.
 *
 * @example
 * <FormTextareaField
 *   control={form.control}
 *   name="description"
 *   label="설명"
 *   placeholder="내용을 입력하세요"
 *   rows={3}
 * />
 */
export function FormTextareaField<T extends FieldValues>({
    control,
    name,
    label,
    placeholder = '',
    rows = 3,
    disabled = false,
    className,
    required = false,
}: FormTextareaFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={className}>
                    <FormLabel className="text-[16px] font-bold text-brand-light">
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder={placeholder}
                            rows={rows}
                            disabled={disabled}
                            {...field}
                            className={cn(
                                'text-[16px] rounded-[12px] border-subtle-border',
                                'bg-white'
                            )}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export default FormTextareaField;
