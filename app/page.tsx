'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText } from 'lucide-react';

export default function Home() {
    const router = useRouter();

    const features = [
        {
            icon: FileText,
            title: '공지사항',
            href: '/notice',
            bgColor: 'bg-sky-400 hover:bg-sky-500',
            iconBg: 'bg-sky-500',
        },
        {
            icon: Bell,
            title: '알림톡 관리',
            href: '/dashboard',
            bgColor: 'bg-emerald-400 hover:bg-emerald-500',
            iconBg: 'bg-emerald-500',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-5xl mx-auto text-center space-y-12">
                    {/* Welcome Badge */}
                    <div className="inline-block px-6 py-3 rounded-lg bg-white border-2 border-blue-600 shadow-sm">
                        <span className="text-base font-semibold text-gray-800">
                            조합온 홈페이지에 오신것을 환영합니다
                        </span>
                    </div>

                    {/* Main Heading */}
                    <div className="space-y-6">
                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900">
                            미아 2구역
                        </h1>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-blue-700">
                            재개발 조합 홈페이지
                        </h2>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid md:grid-cols-2 gap-8 pt-12">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => router.push(feature.href)}
                                    className={`${feature.bgColor} rounded-2xl p-10 text-left shadow-xl border-4 border-white transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer`}
                                >
                                    {/* Content */}
                                    <div className="flex flex-col items-center gap-6">
                                        {/* Icon */}
                                        <div className={`${feature.iconBg} p-6 rounded-2xl shadow-lg`}>
                                            <Icon className="w-16 h-16 text-white" strokeWidth={2.5} />
                                        </div>

                                        {/* Text */}
                                        <h3 className="text-4xl font-bold text-white text-center">
                                            {feature.title}
                                        </h3>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
