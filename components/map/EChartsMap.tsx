'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';

// 조회 모드
export type MapViewMode = 'consent' | 'registration' | 'preview' | 'address';

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
    selectedPnu?: string | null;
    onParcelHover?: (pnu: string | null) => void;
}

// 동의 현황 색상 및 라벨
const CONSENT_CONFIG = {
    pieces: [
        { value: 'FULL_AGREED', label: '동의 완료', color: '#22c55e66' }, // green-500 + 40% opacity
        { value: 'PARTIAL_AGREED', label: '일부 동의', color: '#eab30866' }, // yellow-500 + 40% opacity
        { value: 'NONE_AGREED', label: '비동의', color: '#ef444466' }, // red-500 + 40% opacity
        { value: 'NO_OWNER', label: '미제출', color: '#f1f5f9' }, // 연한 회색
    ],
    labels: {
        FULL_AGREED: { label: '동의 완료', description: '모든 소유주가 동의함' },
        PARTIAL_AGREED: { label: '일부 동의', description: '일부 소유주만 동의함' },
        NONE_AGREED: { label: '비동의', description: '비동의 의사 표시' },
        NO_OWNER: { label: '미제출', description: '동의서 미제출' },
    },
    colors: {
        FULL_AGREED: '#22c55e66',
        PARTIAL_AGREED: '#eab30866',
        NONE_AGREED: '#ef444466',
        NO_OWNER: '#f1f5f9',
    },
    seriesName: '필지별 동의 현황',
};

// 가입 현황 색상 및 라벨 (디자인 시스템에 맞게 조정)
const REGISTRATION_CONFIG = {
    pieces: [
        { value: 'ALL_REGISTERED', label: '전체 가입', color: '#22c55e66' }, // green-500 + 40% opacity
        { value: 'PARTIAL_REGISTERED', label: '일부 가입', color: '#ca8a0466' }, // yellow-600 + 40% opacity
        { value: 'NONE_REGISTERED', label: '미가입', color: '#dc262666' }, // red-600 + 40% opacity
        { value: 'NO_OWNER', label: '미제출', color: '#f1f5f9' }, // 연한 회색
    ],
    labels: {
        ALL_REGISTERED: { label: '전체 가입', description: '모든 소유주가 조합원 가입' },
        PARTIAL_REGISTERED: { label: '일부 가입', description: '일부 소유주만 조합원 가입' },
        NONE_REGISTERED: { label: '미가입', description: '가입한 조합원 없음' },
        NO_OWNER: { label: '미제출', description: '등록된 조합원 없음' },
    },
    colors: {
        ALL_REGISTERED: '#22c55e66', // green-500 + 40% opacity
        PARTIAL_REGISTERED: '#ca8a0466', // yellow-600 + 40% opacity
        NONE_REGISTERED: '#dc262666', // red-600 + 40% opacity
        NO_OWNER: '#f1f5f9', // 연한 회색
    },
    seriesName: '필지별 가입 현황',
};

// 미리보기 모드 설정 (시스템 페이지용)
const PREVIEW_CONFIG = {
    pieces: [
        { value: 'NONE_AGREED', label: '필지', color: '#3b82f6' },
        { value: 'NO_OWNER', label: '미제출', color: '#f1f5f9' }, // 연한 회색
    ],
    labels: {
        NONE_AGREED: { label: '필지', description: '' },
        NO_OWNER: { label: '미제출', description: '' },
    },
    colors: {
        NONE_AGREED: '#3b82f6',
        NO_OWNER: '#f1f5f9', // 연한 회색
    },
    seriesName: '필지 미리보기',
};

// 주소 보기 모드 설정 (새로 추가)
const ADDRESS_CONFIG = {
    pieces: [{ value: 'ALL', label: '필지', color: '#ffffff' }],
    labels: {},
    colors: {
        // 모든 상태를 동일한 색상(흰색)으로 처리
        FULL_AGREED: '#ffffff',
        PARTIAL_AGREED: '#ffffff',
        NONE_AGREED: '#ffffff',
        NO_OWNER: '#ffffff',
        ALL_REGISTERED: '#ffffff',
        PARTIAL_REGISTERED: '#ffffff',
        NONE_REGISTERED: '#ffffff',
    },
    seriesName: '필지 주소',
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

export default function EChartsMap({
    geoJson,
    data,
    mode = 'address',
    onParcelClick,
    selectedPnu,
    onParcelHover,
}: EChartsMapProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);
    const prevSelectedPnu = useRef<string | null>(null);
    const isInitialRender = useRef<boolean>(true);
    const prevGeoJsonRef = useRef<GeoJSON.FeatureCollection | null>(null);

    // 현재 모드에 따른 설정 선택
    const config = useMemo(() => {
        if (mode === 'registration') return REGISTRATION_CONFIG;
        if (mode === 'preview') return PREVIEW_CONFIG;
        if (mode === 'address') return ADDRESS_CONFIG;
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
            // 마우스 오버 이벤트
            chartInstance.current.on('mouseover', (params: { componentType: string; name: string }) => {
                if (params.componentType === 'series' && onParcelHover) {
                    onParcelHover(params.name);
                }
            });
            chartInstance.current.on('mouseout', () => {
                if (onParcelHover) {
                    onParcelHover(null);
                }
            });
        }

        // GeoJSON 등록
        echarts.registerMap('GIS_MAP', geoJson as unknown as Parameters<typeof echarts.registerMap>[1]);

        const option = {
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#000000',
                borderWidth: 1,
                padding: [12, 16],
                textStyle: {
                    color: '#1e293b',
                    fontSize: 13,
                },
                formatter: (params: { name: string; value: string }) => {
                    const pnu = params.name;
                    const parcelData = dataMap.get(pnu);

                    // 주소 보기 모드일 때는 툴팁 간소화
                    if (mode === 'address') {
                        return `
                            <div style="font-weight: 600; font-size: 14px; color: #0f172a;">
                                ${parcelData?.address || '주소 정보 없음'}
                            </div>
                        `;
                    }

                    const statusInfo = (config.labels as Record<string, { label: string; description: string }>)[
                        params.value
                    ] || { label: '미제출', description: '' };
                    const statusColor = (config.colors as Record<string, string>)[params.value] || '#f1f5f9';

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
            // visualMap 제거: map series에서 문자열 카테고리 매핑이 불안정하여
            // 각 데이터 항목에 itemStyle.areaColor를 직접 주입하는 방식으로 변경
            series: [
                {
                    name: config.seriesName,
                    type: 'map',
                    map: 'GIS_MAP',
                    roam: true, // 드래그 이동 + 줌 활성화
                    zoom: 1.44, // 1.2 * 1.2 = 1.44 (기존보다 1.2배 확대)
                    label: {
                        show: false, // 모든 모드에서 라벨 숨김
                        color: '#000',
                        fontSize: 10,
                        overflow: 'break',
                        formatter: (params: { name: string }) => {
                            if (mode !== 'address') return '';
                            const pnu = params.name;
                            const parcelData = dataMap.get(pnu);
                            // 주소에서 번지 부분만 추출하거나 전체 주소 표시
                            return parcelData?.address || '';
                        },
                    },
                    itemStyle: {
                        borderColor: '#000000', // 검은색 경계선
                        borderWidth: 1, // 경계선 두께 강화
                    },
                    emphasis: {
                        label: { show: false },
                        itemStyle: {
                            areaColor: mode === 'address' ? '#f8fafc' : '#3b82f6',
                            borderColor: mode === 'address' ? '#000000' : '#1d4ed8',
                            borderWidth: 2,
                            shadowColor: 'rgba(0, 0, 0, 0.3)',
                            shadowBlur: 10,
                        },
                    },
                    select: {
                        label: { show: false },
                        itemStyle: {
                            areaColor: mode === 'address' ? '#eff6ff' : '#2563eb',
                            borderColor: mode === 'address' ? '#000000' : '#1e40af',
                            borderWidth: 2,
                        },
                    },
                    data: data.map((item) => ({
                        name: item.pnu,
                        value: item.status,
                        itemStyle: {
                            // 상태별 채움색을 직접 지정 (가장 확실한 방식)
                            areaColor:
                                mode === 'address'
                                    ? '#ffffff'
                                    : (config.colors as Record<string, string>)[item.status] || '#f1f5f9',
                        },
                    })),
                },
            ],
        };

        // GeoJSON이 변경되었거나 초기 렌더링인 경우에만 전체 옵션 적용
        const isGeoJsonChanged = prevGeoJsonRef.current !== geoJson;

        if (isInitialRender.current || isGeoJsonChanged) {
            // 초기 렌더링 또는 GeoJSON 변경 시: 전체 옵션 적용 (zoom 포함)
            chartInstance.current.setOption(option, true);
            isInitialRender.current = false;
            prevGeoJsonRef.current = geoJson;
        } else {
            // 데이터만 변경된 경우: 시리즈 데이터만 업데이트 (zoom 유지)
            chartInstance.current.setOption(
                {
                    series: [
                        {
                            label: {
                                show: false,
                            },
                            data: data.map((item) => ({
                                name: item.pnu,
                                value: item.status,
                                itemStyle: {
                                    areaColor:
                                        mode === 'address'
                                            ? '#ffffff'
                                            : (config.colors as Record<string, string>)[item.status] || '#f1f5f9',
                                },
                            })),
                        },
                    ],
                },
                { notMerge: false }
            );
        }

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [geoJson, data, dataMap, onParcelClick, onParcelHover, config, mode]);

    // 외부에서 선택된 필지 하이라이트 및 포커스
    useEffect(() => {
        if (!chartInstance.current || !selectedPnu) return;

        // 이전 선택 해제
        if (prevSelectedPnu.current && prevSelectedPnu.current !== selectedPnu) {
            chartInstance.current.dispatchAction({
                type: 'downplay',
                seriesIndex: 0,
                name: prevSelectedPnu.current,
            });
        }

        // 새로운 필지 강조
        chartInstance.current.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            name: selectedPnu,
        });

        // 툴팁 표시
        chartInstance.current.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            name: selectedPnu,
        });

        prevSelectedPnu.current = selectedPnu;
    }, [selectedPnu]);

    return <div ref={chartRef} className="w-full h-full min-h-[500px]" />;
}

// 지도 범례 컴포넌트 (canvas 외부에 배치)
interface MapLegendProps {
    mode: MapViewMode;
}

export function MapLegend({ mode }: MapLegendProps) {
    // 주소 모드나 미리보기 모드일 때는 범례 숨김
    if (mode === 'preview' || mode === 'address') return null;

    const config = mode === 'registration' ? REGISTRATION_CONFIG : CONSENT_CONFIG;

    // 가입 현황일 때 '미제출'(NO_OWNER) 레전드 항목 제외
    const filteredPieces = mode === 'registration' 
        ? config.pieces.filter((piece) => piece.value !== 'NO_OWNER')
        : config.pieces;

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-wrap items-center justify-center gap-4">
            {filteredPieces.map((piece) => (
                <div key={piece.value} className="flex items-center gap-2">
                    <span
                        className="w-3 h-3 rounded-full border border-slate-200"
                        style={{ backgroundColor: piece.color }}
                    />
                    <span className="text-sm text-slate-600">{piece.label}</span>
                </div>
            ))}
        </div>
    );
}
