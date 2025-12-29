'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';

interface ParcelData {
    pnu: string;
    status: 'FULL_AGREED' | 'PARTIAL_AGREED' | 'NONE_AGREED';
    address?: string;
    totalOwners?: number;
    agreedOwners?: number;
}

interface EChartsMapProps {
    geoJson: GeoJSON.FeatureCollection;
    data: ParcelData[];
    onParcelClick?: (pnu: string) => void;
}

// 상태 라벨 매핑
const STATUS_LABELS: Record<string, { label: string; description: string }> = {
    'FULL_AGREED': { label: '동의 완료', description: '모든 소유주가 동의함' },
    'PARTIAL_AGREED': { label: '일부 동의', description: '일부 소유주만 동의함' },
    'NONE_AGREED': { label: '미동의', description: '동의한 소유주 없음' }
};

export default function EChartsMap({ geoJson, data, onParcelClick }: EChartsMapProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    // 데이터 맵 생성 (PNU -> 상세정보)
    const dataMap = useMemo(() => {
        const map = new Map<string, ParcelData>();
        data.forEach(item => map.set(item.pnu, item));
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
                    fontSize: 13
                },
                formatter: (params: { name: string; value: string }) => {
                    const pnu = params.name;
                    const parcelData = dataMap.get(pnu);
                    const statusInfo = STATUS_LABELS[params.value] || { label: '정보 없음', description: '' };
                    
                    // 상태에 따른 색상
                    const statusColors: Record<string, string> = {
                        'FULL_AGREED': '#22c55e',
                        'PARTIAL_AGREED': '#eab308',
                        'NONE_AGREED': '#ef4444'
                    };
                    const statusColor = statusColors[params.value] || '#94a3b8';
                    
                    let html = `
                        <div style="min-width: 200px;">
                            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #0f172a;">
                                ${parcelData?.address || pnu}
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-bottom: 10px; font-family: monospace;">
                                PNU: ${pnu}
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; padding: 8px; background: ${statusColor}15; border-radius: 6px; margin-bottom: 8px;">
                                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor};"></span>
                                <span style="font-weight: 500; color: ${statusColor};">${statusInfo.label}</span>
                            </div>
                    `;
                    
                    if (parcelData?.totalOwners !== undefined) {
                        const rate = parcelData.totalOwners > 0 
                            ? Math.round((parcelData.agreedOwners || 0) / parcelData.totalOwners * 100) 
                            : 0;
                        html += `
                            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
                                <span>소유주</span>
                                <span><strong>${parcelData.agreedOwners || 0}</strong> / ${parcelData.totalOwners}명 (${rate}%)</span>
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
                }
            },
            visualMap: {
                type: 'piecewise',
                pieces: [
                    { value: 'FULL_AGREED', label: '동의 완료', color: '#22c55e' },
                    { value: 'PARTIAL_AGREED', label: '일부 동의', color: '#eab308' },
                    { value: 'NONE_AGREED', label: '미동의', color: '#ef4444' }
                ],
                show: true,
                orient: 'horizontal',
                bottom: 20,
                left: 'center',
                textStyle: {
                    color: '#64748b'
                }
            },
            series: [
                {
                    name: '필지별 동의 현황',
                    type: 'map',
                    map: 'GIS_MAP',
                    roam: true,
                    zoom: 1.2,
                    label: {
                        show: false
                    },
                    itemStyle: {
                        borderColor: '#94a3b8',
                        borderWidth: 0.5
                    },
                    emphasis: {
                        label: { show: false },
                        itemStyle: { 
                            areaColor: '#3b82f6',
                            borderColor: '#1d4ed8',
                            borderWidth: 2,
                            shadowColor: 'rgba(59, 130, 246, 0.5)',
                            shadowBlur: 10
                        }
                    },
                    select: {
                        label: { show: false },
                        itemStyle: {
                            areaColor: '#2563eb',
                            borderColor: '#1e40af',
                            borderWidth: 2
                        }
                    },
                    data: data.map(item => ({
                        name: item.pnu,
                        value: item.status
                    }))
                }
            ]
        };

        chartInstance.current.setOption(option, true);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [geoJson, data, dataMap, onParcelClick]);

    return <div ref={chartRef} className="w-full h-full min-h-[500px] cursor-pointer" />;
}
