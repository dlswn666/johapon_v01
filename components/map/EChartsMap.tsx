'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';

// 조회 모드
export type MapViewMode = 'consent' | 'registration' | 'preview';

// 동의 상태
type ConsentStatus = 'FULL_AGREED' | 'PARTIAL_AGREED' | 'NONE_AGREED' | 'NO_OWNER';

// 가입 상태
type RegistrationStatus = 'ALL_REGISTERED' | 'PARTIAL_REGISTERED' | 'NONE_REGISTERED' | 'NO_OWNER';

export interface ParcelData {
    pnu: string;
    status: ConsentStatus | RegistrationStatus;
    address?: string;
    area?: number;
    officialPrice?: number;
    ownerCount?: number;
    totalOwners?: number;
    agreedOwners?: number;
    registeredCount?: number;
}

interface EChartsMapProps {
    geoJson: GeoJSON.FeatureCollection;
    data: ParcelData[];
    mode?: MapViewMode;
    onParcelClick?: (pnu: string) => void;
}

// 동의 현황 색상 및 라벨
const CONSENT_CONFIG = {
    pieces: [
        { value: 'FULL_AGREED', label: '동의 완료', color: '#22c55e' },
        { value: 'PARTIAL_AGREED', label: '일부 동의', color: '#eab308' },
        { value: 'NONE_AGREED', label: '미동의', color: '#ef4444' },
        { value: 'NO_OWNER', label: '정보 없음', color: '#94a3b8' },
    ],
    labels: {
        FULL_AGREED: { label: '동의 완료', description: '모든 소유주가 동의함' },
        PARTIAL_AGREED: { label: '일부 동의', description: '일부 소유주만 동의함' },
        NONE_AGREED: { label: '미동의', description: '동의한 소유주 없음' },
        NO_OWNER: { label: '정보 없음', description: '소유주 정보 없음' },
    },
    colors: {
        FULL_AGREED: '#22c55e',
        PARTIAL_AGREED: '#eab308',
        NONE_AGREED: '#ef4444',
        NO_OWNER: '#94a3b8',
    },
    seriesName: '필지별 동의 현황',
};

// 가입 현황 색상 및 라벨
const REGISTRATION_CONFIG = {
    pieces: [
        { value: 'ALL_REGISTERED', label: '전체 가입', color: '#22c55e' },
        { value: 'PARTIAL_REGISTERED', label: '일부 가입', color: '#eab308' },
        { value: 'NONE_REGISTERED', label: '미가입', color: '#ef4444' },
        { value: 'NO_OWNER', label: '정보 없음', color: '#94a3b8' },
    ],
    labels: {
        ALL_REGISTERED: { label: '전체 가입', description: '모든 소유주가 조합원 가입' },
        PARTIAL_REGISTERED: { label: '일부 가입', description: '일부 소유주만 조합원 가입' },
        NONE_REGISTERED: { label: '미가입', description: '가입한 조합원 없음' },
        NO_OWNER: { label: '정보 없음', description: '소유주 정보 없음' },
    },
    colors: {
        ALL_REGISTERED: '#22c55e',
        PARTIAL_REGISTERED: '#eab308',
        NONE_REGISTERED: '#ef4444',
        NO_OWNER: '#94a3b8',
    },
    seriesName: '필지별 가입 현황',
};

// 미리보기 모드 설정 (시스템 페이지용)
const PREVIEW_CONFIG = {
    pieces: [
        { value: 'NONE_AGREED', label: '필지', color: '#3b82f6' },
        { value: 'NO_OWNER', label: '정보 없음', color: '#94a3b8' },
    ],
    labels: {
        NONE_AGREED: { label: '필지', description: '' },
        NO_OWNER: { label: '정보 없음', description: '' },
    },
    colors: {
        NONE_AGREED: '#3b82f6',
        NO_OWNER: '#94a3b8',
    },
    seriesName: '필지 미리보기',
};

// 금액 포맷팅 함수
function formatPrice(price: number | undefined): string {
    if (!price) return '-';
    if (price >= 100000000) {
        return `${(price / 100000000).toFixed(1)}억원`;
    } else if (price >= 10000) {
        return `${(price / 10000).toFixed(0)}만원`;
    }
    return `${price.toLocaleString()}원`;
}

// 면적 포맷팅 함수
function formatArea(area: number | undefined): string {
    if (!area) return '-';
    return `${area.toLocaleString()}㎡`;
}

export default function EChartsMap({ geoJson, data, mode = 'consent', onParcelClick }: EChartsMapProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    // 현재 모드에 따른 설정 선택
    const config = useMemo(() => {
        if (mode === 'registration') return REGISTRATION_CONFIG;
        if (mode === 'preview') return PREVIEW_CONFIG;
        return CONSENT_CONFIG;
    }, [mode]);

    // 데이터 맵 생성 (PNU -> 상세정보)
    const dataMap = useMemo(() => {
        const map = new Map<string, ParcelData>();
        data.forEach((item) => map.set(item.pnu, item));
        return map;
    }, [data]);

    useEffect(() => {
        if (!chartRef.current || !geoJson) return;

        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
            chartInstance.current.on('click', (params: { componentType: string; name: string }) => {
                if (params.componentType === 'series' && onParcelClick) {
                    onParcelClick(params.name);
                }
            });
        }

        // GeoJSON 등록
        echarts.registerMap('GIS_MAP', geoJson as unknown as Parameters<typeof echarts.registerMap>[1]);

        const option = {
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: [12, 16],
                textStyle: {
                    color: '#1e293b',
                    fontSize: 13,
                },
                formatter: (params: { name: string; value: string }) => {
                    const pnu = params.name;
                    const parcelData = dataMap.get(pnu);
                    const statusInfo = (config.labels as Record<string, { label: string; description: string }>)[
                        params.value
                    ] || { label: '정보 없음', description: '' };
                    const statusColor = (config.colors as Record<string, string>)[params.value] || '#94a3b8';

                    // 주소 표시 (PNU 제거)
                    let html = `
                        <div style="min-width: 220px;">
                            <div style="font-weight: 600; font-size: 14px; margin-bottom: 10px; color: #0f172a; line-height: 1.4;">
                                ${parcelData?.address || '주소 정보 없음'}
                            </div>
                    `;

                    // 미리보기 모드일 때: 면적, 공시지가, 소유주 수 표시
                    if (mode === 'preview') {
                        html += `
                            <div style="display: grid; gap: 6px; font-size: 12px; color: #475569;">
                                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span>면적</span>
                                    <span style="font-weight: 500;">${formatArea(parcelData?.area)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span>공시지가</span>
                                    <span style="font-weight: 500;">${formatPrice(parcelData?.officialPrice)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                                    <span>소유주</span>
                                    <span style="font-weight: 500;">${parcelData?.ownerCount ?? 0}명</span>
                                </div>
                            </div>
                            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                                클릭하여 상세 정보 보기
                            </div>
                        </div>
                        `;
                        return html;
                    }

                    // 동의/가입 모드일 때: 상태 표시
                    html += `
                        <div style="display: flex; align-items: center; gap: 6px; padding: 8px; background: ${statusColor}15; border-radius: 6px; margin-bottom: 8px;">
                            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor};"></span>
                            <span style="font-weight: 500; color: ${statusColor};">${statusInfo.label}</span>
                        </div>
                    `;

                    if (mode === 'consent' && parcelData?.totalOwners !== undefined) {
                        const rate =
                            parcelData.totalOwners > 0
                                ? Math.round(((parcelData.agreedOwners || 0) / parcelData.totalOwners) * 100)
                                : 0;
                        html += `
                            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
                                <span>동의 현황</span>
                                <span><strong>${parcelData.agreedOwners || 0}</strong> / ${
                            parcelData.totalOwners
                        }명 (${rate}%)</span>
                            </div>
                        `;
                    } else if (mode === 'registration' && parcelData?.totalOwners !== undefined) {
                        const rate =
                            parcelData.totalOwners > 0
                                ? Math.round(((parcelData.registeredCount || 0) / parcelData.totalOwners) * 100)
                                : 0;
                        html += `
                            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
                                <span>가입 현황</span>
                                <span><strong>${parcelData.registeredCount || 0}</strong> / ${
                            parcelData.totalOwners
                        }명 (${rate}%)</span>
                            </div>
                        `;
                    }

                    html += `
                            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                                클릭하여 상세 정보 보기
                            </div>
                        </div>
                    `;

                    return html;
                },
            },
            visualMap: {
                type: 'piecewise',
                pieces: config.pieces,
                show: mode !== 'preview', // 미리보기 모드에서는 범례 숨김
                orient: 'horizontal',
                bottom: 20,
                left: 'center',
                textStyle: {
                    color: '#64748b',
                },
            },
            series: [
                {
                    name: config.seriesName,
                    type: 'map',
                    map: 'GIS_MAP',
                    roam: true, // 드래그 이동 + 줌 활성화
                    zoom: 1.2,
                    label: {
                        show: false,
                    },
                    itemStyle: {
                        borderColor: '#94a3b8',
                        borderWidth: 0.5,
                    },
                    emphasis: {
                        label: { show: false },
                        itemStyle: {
                            areaColor: '#3b82f6',
                            borderColor: '#1d4ed8',
                            borderWidth: 2,
                            shadowColor: 'rgba(59, 130, 246, 0.5)',
                            shadowBlur: 10,
                        },
                    },
                    select: {
                        label: { show: false },
                        itemStyle: {
                            areaColor: '#2563eb',
                            borderColor: '#1e40af',
                            borderWidth: 2,
                        },
                    },
                    data: data.map((item) => ({
                        name: item.pnu,
                        value: item.status,
                    })),
                },
            ],
        };

        chartInstance.current.setOption(option, true);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [geoJson, data, dataMap, onParcelClick, config, mode]);

    return <div ref={chartRef} className="w-full h-full min-h-[500px]" />;
}
