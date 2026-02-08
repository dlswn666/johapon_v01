'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Search } from 'lucide-react';

// 카카오 주소 검색 결과 데이터 타입
export interface AddressData {
    zonecode: string; // 우편번호
    roadAddress: string; // 도로명 주소 (신주소)
    jibunAddress: string; // 지번 주소 (구주소)
    buildingName: string; // 건물명
    address: string; // 기본 주소 (도로명 또는 지번)
    bcode: string; // 법정동 코드
    main_address_no: string; // 본번
    sub_address_no: string; // 부번
    mountain_yn: 'Y' | 'N'; // 산지 여부
}

interface KakaoAddressSearchProps {
    value: string; // 표시할 주소 값
    onAddressSelect: (data: AddressData) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

// Daum Postcode 스크립트 로드 상태
let isScriptLoaded = false;
let isScriptLoading = false;

// 스크립트 로드 Promise
const loadDaumPostcodeScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isScriptLoaded) {
            resolve();
            return;
        }

        if (isScriptLoading) {
            // 스크립트 로딩 중이면 로드 완료까지 대기
            const checkLoaded = setInterval(() => {
                if (isScriptLoaded) {
                    clearInterval(checkLoaded);
                    resolve();
                }
            }, 100);
            return;
        }

        isScriptLoading = true;

        const script = document.createElement('script');
        script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        script.async = true;

        script.onload = () => {
            isScriptLoaded = true;
            isScriptLoading = false;
            resolve();
        };

        script.onerror = () => {
            isScriptLoading = false;
            reject(new Error('Daum Postcode 스크립트 로드 실패'));
        };

        document.head.appendChild(script);
    });
};

/**
 * 카카오 주소 검색 공통 컴포넌트
 * - Input 클릭/터치 시 카카오 주소 검색 모달 표시
 * - 주소 선택 시 도로명 주소(신주소), 지번 주소(구주소) 모두 반환
 */
export function KakaoAddressSearch({
    value,
    onAddressSelect,
    placeholder = '주소를 검색해주세요',
    className,
    disabled = false,
}: KakaoAddressSearchProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // 컴포넌트 마운트 시 스크립트 로드
    useEffect(() => {
        loadDaumPostcodeScript().catch((error) => {
            console.error('Daum Postcode 스크립트 로드 실패:', error);
        });
    }, []);

    // 주소 검색 오버레이 열기
    const handleOpenPostcode = useCallback(() => {
        if (disabled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const daum = (window as any).daum;

        if (!daum || !daum.Postcode) {
            console.error('Daum Postcode API를 로드할 수 없습니다.');
            return;
        }

        new daum.Postcode({
            oncomplete: (data: {
                zonecode: string;
                roadAddress: string;
                jibunAddress: string;
                autoRoadAddress: string;
                autoJibunAddress: string;
                buildingName: string;
                address: string;
                addressType: string;
                bcode: string;
                main_address_no: string;
                sub_address_no: string;
                mountain: string;
            }) => {
                // 도로명 주소와 지번 주소 추출
                const roadAddress = data.roadAddress || data.autoRoadAddress || '';
                const jibunAddress = data.jibunAddress || data.autoJibunAddress || '';

                // 기본 주소는 도로명이 있으면 도로명, 없으면 지번
                const address = roadAddress || jibunAddress;

                const addressData: AddressData = {
                    zonecode: data.zonecode,
                    roadAddress,
                    jibunAddress,
                    buildingName: data.buildingName || '',
                    address,
                    bcode: data.bcode || '',
                    main_address_no: data.main_address_no || '',
                    sub_address_no: data.sub_address_no || '',
                    mountain_yn: data.mountain === 'Y' ? 'Y' : 'N',
                };

                onAddressSelect(addressData);
            },
            width: '100%',
            height: '100%',
        }).open();
    }, [disabled, onAddressSelect]);

    return (
        <div ref={containerRef} className={cn('w-full', className)}>
            <button
                type="button"
                onClick={handleOpenPostcode}
                disabled={disabled}
                className={cn(
                    'w-full flex items-center gap-3',
                    'h-14 md:h-16 px-5 rounded-xl border-2',
                    'text-left text-lg md:text-xl',
                    'transition-all cursor-pointer',
                    'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent',
                    value ? 'border-gray-200 text-gray-900' : 'border-gray-200 text-gray-400',
                    disabled && 'bg-gray-100 cursor-not-allowed opacity-60'
                )}
            >
                <MapPin className="w-5 h-5 text-[#4E8C6D] flex-shrink-0" />
                <span className="flex-1 truncate">{value || placeholder}</span>
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </button>
        </div>
    );
}

export default KakaoAddressSearch;

