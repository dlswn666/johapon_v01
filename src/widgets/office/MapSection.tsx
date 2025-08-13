'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ExternalLink, MapPin } from 'lucide-react';

declare global {
    interface Window {
        naver: any;
        __initNaverMap__?: () => void;
        navermap_authFailure?: () => void;
    }
}

export interface Coordinates {
    lat: number;
    lng: number;
}

export default function MapSection({
    officeName,
    address,
    detailAddress,
    phone,
    coordinates,
}: {
    officeName: string;
    address: string;
    detailAddress: string;
    phone: string;
    coordinates: Coordinates;
}) {
    const mapRef = useRef<HTMLDivElement | null>(null);

    const initializeMap = () => {
        if (!window.naver || !mapRef.current) return;
        const { lat, lng } = coordinates;
        const map = new window.naver.maps.Map(mapRef.current, {
            center: new window.naver.maps.LatLng(lat, lng),
            zoom: 16,
            mapTypeControl: true,
            zoomControl: true,
            scaleControl: true,
        });

        const marker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(lat, lng),
            map,
            title: officeName,
        });

        const infoWindow = new window.naver.maps.InfoWindow({
            content: `
          <div style="padding: 10px; font-size: 14px; line-height: 1.5;">
            <strong>${officeName}</strong><br/>
            ${address}<br/>
            ${detailAddress}<br/>
            <a href="tel:${phone}" style="color: #0066cc;">${phone}</a>
          </div>
        `,
        });

        window.naver.maps.Event.addListener(marker, 'click', function () {
            if (infoWindow.getMap()) {
                infoWindow.close();
            } else {
                infoWindow.open(map, marker);
            }
        });
    };

    useEffect(() => {
        const KEY = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || '';

        window.navermap_authFailure = function () {
            // eslint-disable-next-line no-console
            console.error('NAVER Maps 인증에 실패했습니다. 키를 확인하세요.');
        };

        if (window.naver?.maps) {
            initializeMap();
            return;
        }

        window.__initNaverMap__ = () => {
            initializeMap();
        };

        const existing = document.getElementById('naver-map-script') as HTMLScriptElement | null;
        if (existing) return;

        const script = document.createElement('script');
        script.id = 'naver-map-script';
        const callback = '__initNaverMap__';
        const keyQuery = KEY ? `ncpKeyId=${encodeURIComponent(KEY)}` : '';
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${keyQuery}&callback=${callback}`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openExternalMap = (mapType: 'naver' | 'kakao' | 'google') => {
        const { lat, lng } = coordinates;
        const encodedAddress = encodeURIComponent(address);
        let url = '';
        switch (mapType) {
            case 'naver':
                url = `https://map.naver.com/v5/search/${encodedAddress}`;
                break;
            case 'kakao':
                url = `https://map.kakao.com/link/search/${encodedAddress}`;
                break;
            case 'google':
                url = `https://maps.google.com/maps?q=${lat},${lng}`;
                break;
        }
        window.open(url, '_blank');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <span>위치 안내</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <div ref={mapRef} className="w-full h-96 bg-gray-100 rounded-lg border" />
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => openExternalMap('naver')}
                            className="flex items-center space-x-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span>네이버 지도에서 보기</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => openExternalMap('kakao')}
                            className="flex items-center space-x-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span>카카오맵에서 보기</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => openExternalMap('google')}
                            className="flex items-center space-x-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span>구글맵에서 보기</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
