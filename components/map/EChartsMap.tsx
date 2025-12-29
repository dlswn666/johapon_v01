'use client';

import { useEffect, useRef } from 'react';
// @ts-ignore
import * as echarts from 'echarts';

interface EChartsMapProps {
    geoJson: any;
    data: { pnu: string; status: 'FULL_AGREED' | 'PARTIAL_AGREED' | 'NONE_AGREED' }[];
    onParcelClick?: (pnu: string) => void;
}

export default function EChartsMap({ geoJson, data, onParcelClick }: EChartsMapProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current || !geoJson) return;

        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
            chartInstance.current.on('click', (params: any) => {
                if (params.componentType === 'series' && onParcelClick) {
                    onParcelClick(params.name);
                }
            });
        }

        echarts.registerMap('GIS_MAP', geoJson);

        const option = {
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => `${params.name}<br/>상태: ${params.value || '정보 없음'}`
            },
            visualMap: {
                type: 'piecewise',
                pieces: [
                    { value: 'FULL_AGREED', label: '완료', color: '#22c55e' }, // 초록
                    { value: 'PARTIAL_AGREED', label: '미흡', color: '#eab308' }, // 노랑
                    { value: 'NONE_AGREED', label: '없음', color: '#ef4444' } // 빨강
                ],
                show: true,
                orient: 'horizontal',
                bottom: 20,
                left: 'center'
            },
            series: [
                {
                    name: '필지별 동의 현황',
                    type: 'map',
                    map: 'GIS_MAP',
                    roam: true,
                    emphasis: {
                        label: { show: false },
                        itemStyle: { areaColor: '#cbd5e1' }
                    },
                    data: data.map(item => ({
                        name: item.pnu,
                        value: item.status
                    }))
                }
            ]
        };

        chartInstance.current.setOption(option);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [geoJson, data, onParcelClick]);

    return <div ref={chartRef} className="w-full h-full min-h-[500px]" />;
}
