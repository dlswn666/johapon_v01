'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Search, MapPin, X } from 'lucide-react';

// 네이버 Maps API 타입 정의
declare global {
    interface Window {
        naver: any;
    }
}

interface AddressResult {
    address: string;
    roadAddress: string;
    jibunAddress: string;
    x: string;
    y: string;
}

interface AddressSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (address: string) => void;
}

export default function AddressSearchModal({ isOpen, onClose, onSelect }: AddressSearchModalProps) {
    const [isNaverLoaded, setIsNaverLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 네이버 Maps API 로드
    useEffect(() => {
        if (!isOpen) return;

        const loadNaverMaps = () => {
            if (window.naver && window.naver.maps) {
                setIsNaverLoaded(true);
                return;
            }

            const script = document.createElement('script');
            script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=geocoder`;
            script.async = true;
            script.onload = () => {
                setIsNaverLoaded(true);
            };
            script.onerror = () => {
                console.error('네이버 Maps API 로드에 실패했습니다.');
            };
            document.head.appendChild(script);
        };

        loadNaverMaps();
    }, [isOpen]);

    // 모달이 닫힐 때 상태 초기화
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [isOpen]);

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            alert('검색할 주소를 입력해 주세요.');
            return;
        }

        if (!isNaverLoaded || !window.naver || !window.naver.maps) {
            alert('네이버 지도 서비스가 아직 로딩 중입니다.');
            return;
        }

        setIsSearching(true);
        setSearchResults([]);

        // 네이버 Geocoder 서비스 사용
        window.naver.maps.Service.geocode(
            {
                query: searchQuery,
            },
            (status: any, response: any) => {
                setIsSearching(false);

                if (status === window.naver.maps.Service.Status.ERROR) {
                    alert('주소 검색 중 오류가 발생했습니다.');
                    return;
                }

                if (response.v2.addresses && response.v2.addresses.length > 0) {
                    const results: AddressResult[] = response.v2.addresses.map((address: any) => ({
                        address: address.roadAddress || address.jibunAddress,
                        roadAddress: address.roadAddress,
                        jibunAddress: address.jibunAddress,
                        x: address.x,
                        y: address.y,
                    }));
                    setSearchResults(results);
                } else {
                    alert('검색 결과가 없습니다. 다른 검색어를 입력해 보세요.');
                }
            }
        );
    };

    const selectAddress = (addressData: AddressResult) => {
        onSelect(addressData.roadAddress || addressData.address);
        onClose();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <h1 className="text-lg font-semibold text-gray-900">주소 검색</h1>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search Section */}
                <div className="p-4 border-b bg-blue-50">
                    <Label htmlFor="searchQuery" className="text-sm font-medium text-gray-700">
                        주소 검색
                    </Label>
                    <div className="mt-2 flex space-x-2">
                        <Input
                            id="searchQuery"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="검색할 주소를 입력하세요 (예: 강남구 테헤란로)"
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={!isNaverLoaded || isSearching}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
                        >
                            <Search className="h-4 w-4" />
                            <span>{isSearching ? '검색 중...' : '검색'}</span>
                        </Button>
                    </div>
                    {!isNaverLoaded && <p className="text-xs text-blue-600 mt-2">네이버 지도 서비스 로딩 중...</p>}
                </div>

                {/* Results Section */}
                <div className="p-4 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-medium text-gray-700">
                                    검색 결과 ({searchResults.length}개)
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {searchResults.map((result, index) => (
                                    <div
                                        key={index}
                                        onClick={() => selectAddress(result)}
                                        className="p-3 border rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                    >
                                        <div className="text-sm font-medium text-gray-900">
                                            {result.roadAddress || result.address}
                                        </div>
                                        {result.jibunAddress && result.jibunAddress !== result.roadAddress && (
                                            <div className="text-xs text-gray-600 mt-1">
                                                지번: {result.jibunAddress}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm">주소를 검색하세요</p>
                            <p className="text-xs mt-1">도로명 또는 지번 주소로 검색 가능합니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
