'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'outline' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'submit' | 'cancel' | 'default';

interface ActionButtonProps {
    /** 버튼 스타일 변형 */
    variant?: ButtonVariant;
    /** 버튼 크기 */
    size?: ButtonSize;
    /** 버튼 용도별 프리셋 스타일 (submit: 주요 액션, cancel: 보조 액션) */
    buttonType?: ButtonType;
    /** HTML button type */
    type?: 'button' | 'submit' | 'reset';
    /** 로딩 상태 (Spinner만 표시, 텍스트 숨김) */
    isLoading?: boolean;
    /** 클릭 이벤트 핸들러 */
    onClick?: () => void;
    /** 비활성화 여부 */
    disabled?: boolean;
    /** 추가 스타일 클래스 */
    className?: string;
    /** 버튼 텍스트 */
    children: React.ReactNode;
}

/**
 * 버튼 크기별 스타일 매핑
 */
const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-[36px] px-4 text-[14px]',
    md: 'h-[48px] px-8 text-[16px]',
    lg: 'h-[56px] px-10 text-[18px]',
};

/**
 * buttonType 프리셋 스타일
 * - submit: Brand 배경, 흰색 텍스트
 * - cancel: Outline 스타일, 회색 테두리
 * - default: 기본 스타일
 */
const buttonTypeStyles: Record<ButtonType, string> = {
    submit: 'bg-brand hover:bg-brand-hover text-white border-transparent',
    cancel: 'border-subtle-border text-gray-600 hover:bg-gray-50 bg-white',
    default: '',
};

/**
 * variant를 shadcn Button variant로 매핑
 */
const variantMap: Record<ButtonVariant, 'default' | 'outline' | 'destructive' | 'ghost'> = {
    primary: 'default',
    outline: 'outline',
    destructive: 'destructive',
    ghost: 'ghost',
};

/**
 * ActionButton 위젯
 * 
 * 프로젝트 전체에서 일관된 버튼 디자인을 위한 공통 위젯입니다.
 * buttonType을 사용하면 용도에 맞는 프리셋 스타일이 자동 적용됩니다.
 * 
 * @example
 * // 등록 버튼
 * <ActionButton buttonType="submit" type="submit" isLoading={isPending}>
 *   등록
 * </ActionButton>
 * 
 * // 취소 버튼
 * <ActionButton buttonType="cancel" onClick={handleCancel}>
 *   취소
 * </ActionButton>
 */
export function ActionButton({
    variant = 'primary',
    size = 'md',
    buttonType = 'default',
    type = 'button',
    isLoading = false,
    onClick,
    disabled = false,
    className,
    children,
}: ActionButtonProps) {
    // buttonType이 지정되면 해당 프리셋 스타일 사용
    const presetStyle = buttonTypeStyles[buttonType];
    
    // buttonType에 따른 variant 결정
    const effectiveVariant = buttonType === 'cancel' ? 'outline' : variantMap[variant];
    
    return (
        <Button
            type={type}
            variant={effectiveVariant}
            disabled={disabled || isLoading}
            onClick={onClick}
            className={cn(
                sizeStyles[size],
                presetStyle,
                'cursor-pointer',
                // 로딩 중일 때 최소 너비 유지
                isLoading && 'min-w-[80px]',
                className
            )}
        >
            {isLoading ? (
                <Spinner className="size-5" />
            ) : (
                children
            )}
        </Button>
    );
}

export default ActionButton;

