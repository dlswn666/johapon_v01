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

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

type AutocompleteValue =
    | 'off' | 'on' | 'name' | 'given-name' | 'family-name' | 'additional-name'
    | 'honorific-prefix' | 'honorific-suffix' | 'nickname'
    | 'email' | 'tel' | 'tel-country-code' | 'tel-national' | 'tel-local'
    | 'street-address' | 'address-line1' | 'address-line2' | 'address-line3'
    | 'address-level1' | 'address-level2' | 'address-level3' | 'address-level4'
    | 'country' | 'country-name' | 'postal-code'
    | 'organization' | 'organization-title'
    | 'url' | 'username' | 'new-password' | 'current-password' | 'one-time-code'
    | 'bday' | 'bday-day' | 'bday-month' | 'bday-year' | 'sex'
    | 'transaction-currency' | 'transaction-amount'
    | 'language' | 'impp' | 'photo';

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
    /** HTML autocomplete 속성 - 브라우저 자동완성 제어 */
    autoComplete?: AutocompleteValue;
    /** 맞춤법 검사 활성화 여부 (기본값: true, 민감 필드는 false 권장) */
    spellCheck?: boolean;
    /** 입력 모드 - 모바일 키보드 최적화 */
    inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
    /** 필수 필드 표시 */
    required?: boolean;
}

/**
 * FormInputField 위젯
 *
 * react-hook-form과 통합된 입력 필드 위젯입니다.
 * 디자인 시스템에 맞춰 흰색 배경, 테마 색상 레이블이 적용됩니다.
 * Vercel Web Interface Guidelines를 준수합니다.
 *
 * @example
 * // 이름 필드
 * <FormInputField
 *   control={form.control}
 *   name="name"
 *   label="이름"
 *   autoComplete="name"
 *   spellCheck={false}
 * />
 *
 * // 전화번호 필드
 * <FormInputField
 *   control={form.control}
 *   name="phone"
 *   label="전화번호"
 *   type="tel"
 *   autoComplete="tel"
 *   inputMode="tel"
 * />
 *
 * // 이메일 필드
 * <FormInputField
 *   control={form.control}
 *   name="email"
 *   label="이메일"
 *   type="email"
 *   autoComplete="email"
 *   inputMode="email"
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
    autoComplete,
    spellCheck,
    inputMode,
    required = false,
}: FormInputFieldProps<T>) {
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
                    <FormControl>
                        <Input
                            type={type}
                            placeholder={placeholder}
                            disabled={disabled}
                            autoComplete={autoComplete}
                            spellCheck={spellCheck}
                            inputMode={inputMode}
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

