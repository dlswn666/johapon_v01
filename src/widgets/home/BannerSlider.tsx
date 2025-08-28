'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Banner } from '@/lib/types';

interface BannerSliderProps {
    bannerData: Banner[];
}

export default function BannerSlider({ bannerData }: BannerSliderProps) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [shuffledBanners, setShuffledBanners] = useState<Banner[]>([]);
    const [displayBanners, setDisplayBanners] = useState<Banner[]>([]);

    useEffect(() => {
        if (currentSlideIndex >= shuffledBanners.length && shuffledBanners.length > 0) {
            setTimeout(() => {
                setCurrentSlideIndex(0);
            }, 0);
        }
    }, [currentSlideIndex, shuffledBanners.length]);

    useEffect(() => {
        const shuffled = [...bannerData].sort(() => 0.5 - Math.random());
        setShuffledBanners(shuffled);
        const doubleArray = [...shuffled, ...shuffled];
        setDisplayBanners(doubleArray);
        const slideInterval = setInterval(() => {
            setCurrentSlideIndex((prev) => (prev + 1) % shuffled.length);
        }, 2000);
        return () => {
            clearInterval(slideInterval);
        };
    }, [bannerData]);

    return (
        <Card className="border-gray-200">
            <CardHeader className="bg-white border-b border-gray-200">
                <CardTitle className="text-gray-800 text-xl">광고 베너</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
                <div className="relative h-40 overflow-hidden">
                    <div
                        className="flex transition-transform duration-500 ease-in-out h-full"
                        style={{
                            transform: `translateX(-${currentSlideIndex * 320}px)`,
                            width: `${displayBanners.length * 320}px`,
                        }}
                    >
                        {displayBanners.map((banner, index) => (
                            <div
                                key={`${banner.id}-${Math.floor(index / shuffledBanners.length)}`}
                                className="flex-shrink-0 h-full"
                                style={{ width: '320px' }}
                            >
                                <div className="flex items-center h-full bg-white border-r border-gray-100">
                                    <div className="w-24 h-24 flex-shrink-0 ml-4">
                                        <div className="w-full h-full bg-gray-200 rounded-lg" />
                                    </div>
                                    <div className="flex-1 px-4">
                                        <div className="text-sm text-green-600 mb-1">{banner.title}</div>
                                        <div className="text-lg text-gray-900 leading-tight">{banner.subtitle}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
