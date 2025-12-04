'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, Loader2 } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useHeroSlides } from '@/app/_lib/features/hero-slides/api/useHeroSlidesHook';
import { HeroSlider } from '@/app/_lib/widgets/hero-slider';
import { UnionInfoFooter } from '@/app/_lib/widgets/union-info-footer';

export default function UnionHomePage() {
    const router = useRouter();
    const { union, isLoading: isUnionLoading } = useSlug();
    const { data: heroSlides, isLoading: isSlidesLoading } = useHeroSlides(union?.id);

    if (isUnionLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-lg text-gray-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!union) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">조합 정보를 찾을 수 없습니다</p>
                    <p className="text-gray-500">URL을 확인해주세요</p>
                </div>
            </div>
        );
    }

    const features = [
        {
            icon: FileText,
            title: '공지사항',
            description: '조합의 주요 공지사항을 확인하세요',
            href: `/${union.slug}/notice`,
            bgColor: 'bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700',
            iconBg: 'bg-white/20',
        },
        {
            icon: Bell,
            title: '알림톡 관리',
            description: '조합원 알림톡 발송 내역을 관리하세요',
            href: `/${union.slug}/dashboard`,
            bgColor: 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
            iconBg: 'bg-white/20',
        },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Hero Section - 슬라이드 */}
            <section className="relative">
                {isSlidesLoading ? (
                    <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gray-200 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <HeroSlider slides={heroSlides || []} autoPlayInterval={4000} />
                )}
                
                {/* 오버레이 조합명 (슬라이드 위에 표시) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
                        {union.name}
                    </h1>
                    <p className="mt-2 text-lg md:text-xl text-white/90 drop-shadow">
                        재개발 조합 홈페이지
                    </p>
                </div>
            </section>

            {/* Quick Links Section */}
            <section className="py-16 px-4">
                <div className="container mx-auto max-w-5xl">
                    {/* Welcome Badge */}
                    <div className="text-center mb-12">
                        <div className="inline-block px-6 py-3 rounded-full bg-blue-50 border border-blue-200">
                            <span className="text-base font-medium text-blue-700">
                                {union.name} 홈페이지에 오신 것을 환영합니다
                            </span>
                        </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => router.push(feature.href)}
                                    className={`${feature.bgColor} rounded-2xl p-8 text-left shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] cursor-pointer group`}
                                >
                                    <div className="flex flex-col gap-4">
                                        {/* Icon */}
                                        <div className={`${feature.iconBg} p-4 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="w-10 h-10 text-white" strokeWidth={2} />
                                        </div>

                                        {/* Text */}
                                        <div className="space-y-2">
                                            <h3 className="text-2xl lg:text-3xl font-bold text-white">
                                                {feature.title}
                                            </h3>
                                            <p className="text-white/80 text-sm lg:text-base">
                                                {feature.description}
                                            </p>
                                        </div>

                                        {/* Arrow indicator */}
                                        <div className="mt-2 text-white/60 group-hover:text-white group-hover:translate-x-2 transition-all duration-300">
                                            <span className="text-sm font-medium">바로가기 →</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Spacer */}
            <div className="flex-grow" />

            {/* Footer - 조합 정보 */}
            <UnionInfoFooter union={union} />
        </div>
    );
}
