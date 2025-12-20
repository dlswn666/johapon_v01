'use client';

import React from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type CheckboxVariant = 'default' | 'card';

interface FormCheckboxFieldProps<T extends FieldValues> {
    /** react-hook-form control 객체 */
    control: Control<T>;
    /** 필드명 (form 데이터 키) */
    name: Path<T>;
    /** 레이블 텍스트 */
    label: string;
    /** 부가 설명 텍스트 */
    description?: string;
    /** 비활성화 여부 */
    disabled?: boolean;
    /** 컨테이너 추가 스타일 */
    className?: string;
    /** 스타일 변형 (card: 카드형 배경) */
    variant?: CheckboxVariant;
}

/**
 * variant별 스타일
 * - default: 기본 체크박스
 * - card: 카드형 배경 (흰색 배경, 테두리)
 */
const variantStyles: Record<CheckboxVariant, string> = {
    default: '',
    card: 'flex flex-row items-start space-x-3 space-y-0 rounded-[12px] border border-[#CCCCCC] bg-white p-6 flex-1',
};

/**
 * FormCheckboxField 위젯
 * 
 * react-hook-form과 통합된 체크박스 위젯입니다.
 * 디자인 시스템에 맞춰 테마 색상이 적용됩니다.
 * 
 * @example
 * // 카드 스타일 체크박스
 * <FormCheckboxField
 *   control={form.control}
 *   name="is_popup"
 *   label="팝업으로 표시"
 *   variant="card"
 * />
 * 
 * // 기본 체크박스
 * <FormCheckboxField
 *   control={form.control}
 *   name="agree"
 *   label="동의합니다"
 * />
 */
export function FormCheckboxField<T extends FieldValues>({
    control,
    name,
    label,
    description,
    disabled = false,
    className,
    variant = 'default',
}: FormCheckboxFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem
                    className={cn(
                        variantStyles[variant],
                        variant === 'card' && 'cursor-pointer',
                        className
                    )}
                >
                    <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={disabled}
                            className={cn(
                                'data-[state=checked]:bg-[#4E8C6D] border-[#AFAFAF]',
                                'cursor-pointer'
                            )}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel
                            className={cn(
                                'text-[16px] text-gray-700 font-medium',
                                variant === 'card' && 'cursor-pointer'
                            )}
                        >
                            {label}
                        </FormLabel>
                        {description && (
                            <p className="text-[14px] text-gray-500">
                                {description}
                            </p>
                        )}
                    </div>
                </FormItem>
            )}
        />
    );
}

export default FormCheckboxField;

