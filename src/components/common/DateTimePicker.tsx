/**
 * 현대적인 날짜/시간 선택 컴포넌트
 * 사용자 친화적이고 직관적인 날짜 선택 UI 제공
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Calendar, Clock, X, Check } from 'lucide-react';

interface DateTimePickerProps {
    label: string;
    value?: string;
    onChange: (value: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    helperText?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
    label,
    value,
    onChange,
    placeholder = '날짜와 시간을 선택하세요',
    disabled = false,
    className = '',
    helperText,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempDate, setTempDate] = useState('');
    const [tempTime, setTempTime] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // value가 변경되면 tempDate, tempTime 업데이트
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                // YYYY-MM-DD 형식으로 변환
                const dateStr = date.toISOString().split('T')[0];
                // HH:MM 형식으로 변환
                const timeStr = date.toTimeString().slice(0, 5);
                setTempDate(dateStr);
                setTempTime(timeStr);
            }
        } else {
            setTempDate('');
            setTempTime('');
        }
    }, [value]);

    // 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const formatDisplayValue = (dateTimeStr: string) => {
        if (!dateTimeStr) return '';

        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return '';

            return (
                date.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                }) +
                ' ' +
                date.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                })
            );
        } catch {
            return '';
        }
    };

    const handleApply = () => {
        if (tempDate && tempTime) {
            const dateTimeStr = `${tempDate}T${tempTime}`;
            onChange(dateTimeStr);
        } else if (!tempDate && !tempTime) {
            onChange(null);
        }
        setIsOpen(false);
    };

    const handleClear = () => {
        setTempDate('');
        setTempTime('');
        onChange(null);
        setIsOpen(false);
    };

    const handleQuickSet = (hours: number) => {
        const now = new Date();
        const target = new Date(now.getTime() + hours * 60 * 60 * 1000);

        const dateStr = target.toISOString().split('T')[0];
        const timeStr = target.toTimeString().slice(0, 5);

        setTempDate(dateStr);
        setTempTime(timeStr);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">{label}</Label>

            {/* 메인 입력 영역 */}
            <div
                className={`
                    relative w-full p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                    ${
                        isOpen
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-md'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                isOpen ? 'bg-blue-100' : 'bg-gray-100'
                            }`}
                        >
                            <Calendar
                                className={`h-5 w-5 transition-colors ${isOpen ? 'text-blue-600' : 'text-gray-500'}`}
                            />
                        </div>
                        <div className="flex-1">
                            {value ? (
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{formatDisplayValue(value)}</p>
                                    <p className="text-xs text-gray-500">클릭해서 변경</p>
                                </div>
                            ) : (
                                <p className="text-gray-500">{placeholder}</p>
                            )}
                        </div>
                    </div>

                    {value && !disabled && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* 헬퍼 텍스트 */}
            {helperText && <p className="text-xs text-gray-500 mt-2">{helperText}</p>}

            {/* 드롭다운 패널 */}
            {isOpen && !disabled && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-6">
                    {/* 빠른 설정 버튼들 */}
                    <div className="mb-6">
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">빠른 설정</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleQuickSet(1)} className="text-sm">
                                1시간 후
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleQuickSet(24)} className="text-sm">
                                내일
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickSet(24 * 7)}
                                className="text-sm"
                            >
                                일주일 후
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickSet(24 * 30)}
                                className="text-sm"
                            >
                                한달 후
                            </Button>
                        </div>
                    </div>

                    {/* 날짜 선택 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                날짜
                            </Label>
                            <Input
                                type="date"
                                value={tempDate}
                                onChange={(e) => setTempDate(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                시간
                            </Label>
                            <Input
                                type="time"
                                value={tempTime}
                                onChange={(e) => setTempTime(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            className="flex items-center space-x-2"
                        >
                            <X className="h-4 w-4" />
                            <span>지우기</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleApply}
                            disabled={!tempDate || !tempTime}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Check className="h-4 w-4" />
                            <span>적용</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateTimePicker;
