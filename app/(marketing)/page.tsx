'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Database } from '@/app/_lib/shared/type/database.types';
import {
    MessageSquare,
    Bell,
    Clock,
    Users,
    Smartphone,
    DollarSign,
    HandCoins,
    PiggyBank,
    Megaphone,
    ArrowRight,
    LockKeyhole,
    BellRing,
    Coins,
    EyeOff,
    Eye,
    ShieldCheck,
    UserCheck,
    MessageCircle,
    FileKey,
    Search,
    XCircle,
    Smile,
    LayoutTemplate,
    ArrowDown,
} from 'lucide-react';

type Union = Database['public']['Tables']['unions']['Row'];

// 히어로 배경 이미지 URL (Figma에서 제공)
const heroBackgroundImage =
    'https://images.unsplash.com/photo-1692528489009-26e108f3ecb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGFydG1lbnQlMjBjb21wbGV4JTIwYWVyaWFsJTIwdmlld3xlbnwxfHx8fDE3NjQ4NDkwMTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

export default function MarketingPage() {
    const router = useRouter();
    const [unions, setUnions] = useState<Union[]>([]);
    const [selectedSlug, setSelectedSlug] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUnions = async () => {
            try {
                const { data, error } = await supabase.from('unions').select('*').order('name');

                if (error) throw error;

                setUnions(data || []);
                if (data && data.length > 0) {
                    setSelectedSlug(data[0].slug);
                }
            } catch (error) {
                console.error('Error fetching unions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUnions();
    }, []);

    const handleNavigate = () => {
        if (selectedSlug) {
            router.push(`/${selectedSlug}`);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative h-[500px] md:h-[600px] overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <Image src={heroBackgroundImage} alt="Hero Background" fill className="object-cover" priority />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 md:px-6 pt-12 md:pt-16 w-full">
                    <div className="text-center space-y-4 md:space-y-6 max-w-6xl w-full px-4 md:px-6 mx-auto">
                        <h1
                            className="font-bold text-white"
                            style={{
                                fontSize: 'var(--text-marketing-hero)',
                                lineHeight: 'var(--leading-marketing-hero)',
                            }}
                        >
                            우리 조합의 홈페이지 개설,
                            <br />
                            이제는 더 쉽고 스마트하게
                        </h1>
                        <p
                            className="text-white/90 font-medium"
                            style={{
                                fontSize: 'var(--text-marketing-subtitle)',
                                lineHeight: 'var(--leading-marketing-subtitle)',
                            }}
                        >
                            조합원 소통, 공지 전달, 광고 수익까지 한 번에 해결
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-4">
                            <button
                                onClick={() => router.push('/contact')}
                                className="px-6 md:px-8 py-3 bg-[#4e8c6d] text-white rounded-lg font-bold hover:bg-[#3d7a5c] transition-colors cursor-pointer"
                                style={{ fontSize: 'var(--text-marketing-button)' }}
                            >
                                도입 문의하기
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="bg-gray-50 py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    {/* 헤더 영역 */}
                    <div className="text-center mb-10 md:mb-16">
                        <h2
                            className="font-bold text-gray-900 mb-3 md:mb-4 leading-tight"
                            style={{
                                fontSize: 'var(--text-marketing-section-title)',
                                lineHeight: 'var(--leading-marketing-section-title)',
                            }}
                        >
                            아직도 카페와 단톡방으로
                            <br className="md:hidden" /> 조합을 운영하시나요?
                        </h2>
                        <p
                            className="text-gray-600 font-medium"
                            style={{ fontSize: 'var(--text-marketing-section-subtitle)' }}
                        >
                            기존 방식의 한계를 넘어, 조합온이 확실한 해결책을 드립니다.
                        </p>
                    </div>

                    {/* 카드 그리드 영역 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-0 md:px-4">
                        {/* 카드 1: 보안 */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col items-center text-center group">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:bg-green-100 transition-colors">
                                <LockKeyhole className="w-7 h-7 md:w-8 md:h-8 text-green-600" />
                            </div>
                            <h3
                                className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                불안한 정보 보안 해결
                            </h3>
                            <p
                                className="text-gray-600 leading-relaxed text-sm break-keep"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                포털 검색으로 노출되는 카페와 휘발성 강한 단톡방은 위험합니다.{' '}
                                <span className="font-semibold text-green-700">외부인 차단 보안 시스템</span>으로 조합의
                                민감한 정보를 안전하게 보호하세요.
                            </p>
                        </div>

                        {/* 카드 2: 접근성/참여 */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col items-center text-center group">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:bg-green-100 transition-colors">
                                <BellRing className="w-7 h-7 md:w-8 md:h-8 text-green-600" />
                            </div>
                            <h3
                                className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                확실한 정보 전달, 참여 유도
                            </h3>
                            <p
                                className="text-gray-600 leading-relaxed text-sm break-keep"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                IT가 어려운 어르신도, 무관심한 젊은 층도 문제없습니다.{' '}
                                <span className="font-semibold text-green-700">카카오 알림톡</span>으로 소식을 전달하고,
                                동의서 미제출자에게 참여를 적극 유도합니다.
                            </p>
                        </div>

                        {/* 카드 3: 수익구조 */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col items-center text-center group">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:bg-green-100 transition-colors">
                                <Coins className="w-7 h-7 md:w-8 md:h-8 text-green-600" />
                            </div>
                            <h3
                                className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                운영 수익 창출
                            </h3>
                            <p
                                className="text-gray-600 leading-relaxed text-sm break-keep"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                예산 부족으로 업체에 휘둘리지 마세요. 조합온의{' '}
                                <span className="font-semibold text-green-700">자체 광고 시스템</span>은 조합 운영에
                                실질적인 도움이 되는 건전한 수익을 만들어 드립니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-white py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10 md:mb-16">
                        <h2
                            className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                            style={{
                                fontSize: 'var(--text-marketing-section-title)',
                                lineHeight: 'var(--leading-marketing-section-title)',
                            }}
                        >
                            안전한 보안, 쉬운 소통
                            <br />
                            든든한 수익 구조까지
                        </h2>
                        <p
                            className="text-gray-600 font-medium"
                            style={{ fontSize: 'var(--text-marketing-section-subtitle)' }}
                        >
                            조합 운영에 꼭 필요한 핵심 기능을 담았습니다.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {/* Feature 1 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 h-full">
                            <div className="flex gap-3 md:gap-4 h-full">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <LockKeyhole className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        검증된 조합 전용 공간
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        실명 인증과 명부 대조를 통해 외부인 접속을 원천 차단하여
                                        <br /> 소중한 정보를 안전하게 <br className="hidden md:block" />
                                        지킵니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 h-full">
                            <div className="flex gap-3 md:gap-4 h-full">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <EyeOff className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        검색 노출 원천 차단
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        인터넷 검색으로 훤히 보이던
                                        <br className="hidden md:block" /> 카페 글은 이제 그만!
                                        <br />
                                        조합 소식은 오직 우리 조합원에게만 안전하게 공유됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 h-full">
                            <div className="flex gap-3 md:gap-4 h-full">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <BellRing className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        카카오 알림톡 연동
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        회원 가입만 하면 전국민이 쓰는 카카오톡으로 <br />
                                        공지사항이 즉시 전달됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 h-full">
                            <div className="flex gap-3 md:gap-4 h-full">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Eye className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        어르신을 위한 UI
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        복잡한 기능은 덜어내고
                                        <br />
                                        명확한 UI로 쉽게 사용할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 5 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 h-full">
                            <div className="flex gap-3 md:gap-4 h-full">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        타임라인 재개발 현황
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        사업 진행 상황을 시간 순서대로 한눈에 볼 수 있어 투명한 정보 공유가 가능합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 6 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 h-full">
                            <div className="flex gap-3 md:gap-4 h-full">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Coins className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        자체 광고 수익 시스템
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        우리 조합 홈페이지 내 <br className="hidden md:block" /> 광고 배너를 통해
                                        <br /> 조합의 수익 모델을 제공합니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* =========================================
                SECURITY SECTION (보안)
                컨셉: 방어막 (The Firewall)
                구조: 좌측(공격차단 도식) + 우측(설명 리스트)
            ========================================= */}
            <section className="bg-white py-16 md:py-24 px-4 md:px-6 border-b border-gray-100">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        {/* 보안 도식화 (Diagram) */}
                        <div className="w-full lg:w-1/2 flex justify-center">
                            <div className="relative w-full max-w-md aspect-[4/3] bg-gray-50 rounded-2xl border border-gray-200 p-6 flex items-center justify-between overflow-hidden shadow-inner">
                                {/* 배경 그리드 패턴 */}
                                <div
                                    className="absolute inset-0 opacity-[0.05]"
                                    style={{
                                        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                                        backgroundSize: '20px 20px',
                                    }}
                                ></div>

                                {/* 왼쪽: 외부 접속 시도 (차단됨) */}
                                <div className="flex flex-col gap-4 z-10 opacity-60">
                                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-red-100">
                                        <Search className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500">Naver Bot</span>
                                        <XCircle className="w-4 h-4 text-red-500 ml-1" />
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-red-100">
                                        <Search className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500">Google Bot</span>
                                        <XCircle className="w-4 h-4 text-red-500 ml-1" />
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-red-100">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500">외부인</span>
                                        <XCircle className="w-4 h-4 text-red-500 ml-1" />
                                    </div>
                                </div>

                                {/* 중앙: 방화벽 (Shield) */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-px bg-gradient-to-b from-transparent via-red-400 to-transparent z-0"></div>
                                <div className="z-20 bg-white p-3 rounded-full border-2 border-red-100 shadow-lg relative">
                                    <LockKeyhole className="w-6 h-6 text-[#ef4444]" />
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                </div>

                                {/* 오른쪽: 내부 안전 지대 */}
                                <div className="flex flex-col gap-3 z-10">
                                    <div className="w-24 h-24 bg-[#4e8c6d]/10 rounded-full flex flex-col items-center justify-center border-2 border-[#4e8c6d] shadow-lg animate-pulse">
                                        <ShieldCheck className="w-8 h-8 text-[#4e8c6d] mb-1" />
                                        <span className="text-[10px] font-bold text-[#4e8c6d]">Safe Zone</span>
                                    </div>
                                    <div className="bg-[#4e8c6d] text-white text-xs px-3 py-1 rounded-full text-center shadow-md">
                                        인증된 조합원
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 보안 텍스트 설명 */}
                        <div className="w-full lg:w-1/2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4e8c6d]/10 rounded-full mb-4">
                                <ShieldCheck className="w-4 h-4 text-[#4e8c6d]" />
                                <span className="text-[#4e8c6d] font-bold text-sm">철통 보안 시스템</span>
                            </div>
                            <h2
                                className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-section-title)',
                                    lineHeight: 'var(--leading-marketing-section-title)',
                                }}
                            >
                                외부인은 절대 볼 수 없는
                                <br />
                                <span className="text-[#4e8c6d]">프라이빗 조합 공간</span>
                            </h2>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <EyeOff className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3
                                            className="font-bold text-gray-800"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-title)',
                                                lineHeight: 'var(--leading-marketing-card-title)',
                                            }}
                                        >
                                            검색 노출 원천 차단
                                        </h3>
                                        <p
                                            className="text-gray-600 mt-1"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-body)',
                                                lineHeight: 'var(--leading-marketing-card-body)',
                                            }}
                                        >
                                            네이버, 구글 등 검색 엔진의 접근을 기술적으로 막아
                                            <br className="hidden md:block" />
                                            조합 내부 정보가 외부로 유출되는 것을 방지합니다.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <UserCheck className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3
                                            className="font-bold text-gray-800"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-title)',
                                                lineHeight: 'var(--leading-marketing-card-title)',
                                            }}
                                        >
                                            100% 실명 조합원 인증
                                        </h3>
                                        <p
                                            className="text-gray-600 mt-1"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-body)',
                                                lineHeight: 'var(--leading-marketing-card-body)',
                                            }}
                                        >
                                            가입 시 조합원 명부와 대조하여 실명 인증을 거친
                                            <br className="hidden md:block" />
                                            실제 소유주만 활동할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <FileKey className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3
                                            className="font-bold text-gray-800"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-title)',
                                                lineHeight: 'var(--leading-marketing-card-title)',
                                            }}
                                        >
                                            등급별 권한 관리
                                        </h3>
                                        <p
                                            className="text-gray-600 mt-1"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-body)',
                                                lineHeight: 'var(--leading-marketing-card-body)',
                                            }}
                                        >
                                            조합원, 대의원, 임원 등 직책에 따라
                                            <br className="hidden md:block" />
                                            정보 열람 권한을 체계적으로 구분합니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* =========================================
                COMMUNICATION SECTION (소통)
                컨셉: 연결의 다리 (The Bridge)
                구조: 중앙 집중형 도식 + 하단 3단 설명
            ========================================= */}
            <section className="bg-gray-50 py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-6xl mx-auto text-center">
                    {/* 소통 헤더 */}
                    <div className="mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4e8c6d]/10 rounded-full mb-4">
                            <MessageCircle className="w-4 h-4 text-[#4e8c6d]" />
                            <span className="text-[#4e8c6d] font-bold text-sm">누구나 쉬운 소통</span>
                        </div>
                        <h2
                            className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                            style={{
                                fontSize: 'var(--text-marketing-section-title)',
                                lineHeight: 'var(--leading-marketing-section-title)',
                            }}
                        >
                            어르신도 문제없는
                            <br />
                            <span className="text-[#4e8c6d]">가장 쉬운 디지털 소통</span>
                        </h2>
                        <p
                            className="text-gray-600 font-medium max-w-2xl mx-auto"
                            style={{ fontSize: 'var(--text-marketing-section-subtitle)' }}
                        >
                            복잡한 앱 사용법을 배울 필요 없이, <br className="md:hidden" />
                            전국민이 쓰는 익숙한 방식 그대로 연결됩니다.
                        </p>
                    </div>

                    {/* 소통 도식화 (중앙 배치) */}
                    <div className="relative w-full max-w-3xl mx-auto mb-16 h-64 md:h-80 bg-white rounded-3xl border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                        {/* 연결 선 */}
                        <div className="absolute w-[80%] h-[2px] bg-gray-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

                        {/* 왼쪽: 어르신 */}
                        <div className="absolute left-6 md:left-12 flex flex-col items-center group">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-[#4e8c6d]/10 transition-colors">
                                <span className="text-3xl md:text-4xl">👴</span>
                            </div>
                            <span className="text-sm font-bold text-gray-500">어르신</span>
                        </div>

                        {/* 오른쪽: 젊은 층 */}
                        <div className="absolute right-6 md:right-12 flex flex-col items-center group">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-[#4e8c6d]/10 transition-colors">
                                <span className="text-3xl md:text-4xl">🧑‍💻</span>
                            </div>
                            <span className="text-sm font-bold text-gray-500">젊은 세대</span>
                        </div>

                        {/* 중앙: 카카오톡/스마트폰 */}
                        <div className="relative z-10 flex flex-col items-center animate-bounce">
                            <div className="relative bg-gray-800 rounded-[2rem] p-2 border-4 border-gray-200 shadow-xl">
                                <div className="w-24 h-40 md:w-32 md:h-48 bg-white rounded-[1.5rem] flex flex-col items-center justify-center relative overflow-hidden">
                                    {/* 화면 내용 */}
                                    <div className="w-full h-8 bg-[#FEE500] absolute top-0"></div>
                                    <div className="flex flex-col gap-2 w-full px-3 mt-4">
                                        <div className="bg-gray-100 rounded-lg p-2 text-[10px] text-gray-400 w-3/4">
                                            공지사항입니다...
                                        </div>
                                        <div className="bg-[#FEE500] rounded-lg p-2 text-[10px] self-end w-3/4">
                                            확인했습니다!
                                        </div>
                                    </div>
                                    {/* 카카오 아이콘 */}
                                    <div className="absolute bottom-4 w-10 h-10 bg-[#FEE500] rounded-xl flex items-center justify-center shadow-sm">
                                        <MessageCircle className="w-6 h-6 text-[#3C1E1E] fill-current" />
                                    </div>
                                </div>
                            </div>
                            {/* 뱃지 */}
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100">
                                <BellRing className="w-6 h-6 text-[#FEE500] fill-current" />
                            </div>
                        </div>
                    </div>

                    {/* 소통 기능 카드 (Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 bg-[#FEE500]/20 rounded-lg flex items-center justify-center mb-3">
                                <MessageCircle className="w-5 h-5 text-[#3C1E1E]" />
                            </div>
                            <h3
                                className="font-bold text-gray-800 mb-2"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                카카오 알림톡 연동
                            </h3>
                            <p
                                className="text-gray-600"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                별도 앱 설치 없이, 전국민이 쓰는 카카오톡으로 공지사항이 즉시 전달됩니다.
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center mb-3">
                                <Smile className="w-5 h-5 text-[#4e8c6d]" />
                            </div>
                            <h3
                                className="font-bold text-gray-800 mb-2"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                어르신 전용 큰 글씨
                            </h3>
                            <p
                                className="text-gray-600"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                작은 글씨가 힘든 어르신을 위해 글자 크기를 키우고 메뉴를 단순화했습니다.
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                                <Smartphone className="w-5 h-5 text-blue-500" />
                            </div>
                            <h3
                                className="font-bold text-gray-800 mb-2"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                100% 모바일 최적화
                            </h3>
                            <p
                                className="text-gray-600"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                PC, 태블릿, 스마트폰 어디서든 깨지지 않는 최적화된 화면을 제공합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* =========================================
                REVENUE SECTION (수익)
                컨셉: 수익 파이프라인 (The Pipeline)
                구조: 세로형 흐름도 (Top-Down) + 우측 설명
            ========================================= */}
            <section className="bg-white py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
                        {/* 수익 텍스트 설명 */}
                        <div className="w-full lg:w-1/2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4e8c6d]/10 rounded-full mb-4">
                                <DollarSign className="w-4 h-4 text-[#4e8c6d]" />
                                <span className="text-[#4e8c6d] font-bold text-sm">운영비 걱정 없는 조합</span>
                            </div>
                            <h2
                                className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-section-title)',
                                    lineHeight: 'var(--leading-marketing-section-title)',
                                }}
                            >
                                추가 비용 부담 없이
                                <br />
                                <span className="text-[#4e8c6d]">스스로 돈 버는 홈페이지</span>
                            </h2>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <LayoutTemplate className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3
                                            className="font-bold text-gray-800"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-title)',
                                                lineHeight: 'var(--leading-marketing-card-title)',
                                            }}
                                        >
                                            협력사 광고 수익
                                        </h3>
                                        <p
                                            className="text-gray-600 mt-1"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-body)',
                                                lineHeight: 'var(--leading-marketing-card-body)',
                                            }}
                                        >
                                            부동산, 이사업체 등 조합원에게 필요한
                                            <br className="hidden md:block" />
                                            관련 업체의 광고를 게재하여 수익을 창출합니다.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <HandCoins className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3
                                            className="font-bold text-gray-800"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-title)',
                                                lineHeight: 'var(--leading-marketing-card-title)',
                                            }}
                                        >
                                            운영비 자동 충당
                                        </h3>
                                        <p
                                            className="text-gray-600 mt-1"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-body)',
                                                lineHeight: 'var(--leading-marketing-card-body)',
                                            }}
                                        >
                                            발생한 광고 수익으로 매달 발생하는
                                            <br className="hidden md:block" />
                                            홈페이지 서버비와 유지보수 비용을 해결합니다.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <PiggyBank className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <h3
                                            className="font-bold text-gray-800"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-title)',
                                                lineHeight: 'var(--leading-marketing-card-title)',
                                            }}
                                        >
                                            조합원 부담 Zero
                                        </h3>
                                        <p
                                            className="text-gray-600 mt-1"
                                            style={{
                                                fontSize: 'var(--text-marketing-card-body)',
                                                lineHeight: 'var(--leading-marketing-card-body)',
                                            }}
                                        >
                                            결과적으로 조합원은 추가 비용 부담 없이
                                            <br className="hidden md:block" />
                                            안정적이고 질 높은 서비스를 이용할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 수익 도식화 (Pipeline Diagram) */}
                        <div className="w-full lg:w-1/2 flex justify-center">
                            <div className="relative w-full max-w-sm bg-white rounded-2xl p-0 md:p-4 flex flex-col items-center">
                                {/* 1단계: 홈페이지 (광고판) */}
                                <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm relative z-10">
                                    <div className="flex gap-1.5 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                    </div>
                                    <div className="h-2 w-1/2 bg-gray-200 rounded mb-3"></div>
                                    <div className="h-2 w-3/4 bg-gray-200 rounded mb-4"></div>
                                    {/* AD Banner */}
                                    <div className="h-12 w-full bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center gap-2 animate-pulse">
                                        <Megaphone className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs font-bold text-blue-500">협력사 AD 배너</span>
                                    </div>
                                </div>

                                {/* 화살표 (Flow) */}
                                <div className="h-16 w-0.5 bg-gray-200 relative my-2">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border border-gray-100">
                                        <ArrowDown className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>

                                {/* 2단계: 수익 창출 */}
                                <div className="relative">
                                    {/* 동전 애니메이션 */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce">
                                        <span className="text-2xl font-bold text-yellow-400">₩</span>
                                    </div>

                                    {/* 저금통/금고 */}
                                    <div className="w-32 h-32 bg-[#4e8c6d] rounded-full flex items-center justify-center shadow-xl border-4 border-[#3d7056] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
                                        <PiggyBank className="w-14 h-14 text-white relative z-10" />
                                        {/* 반짝이 */}
                                        <div className="absolute top-4 right-6 w-2 h-2 bg-white rounded-full opacity-50"></div>
                                    </div>
                                </div>

                                {/* 결과 뱃지 */}
                                <div className="mt-6 bg-white border border-[#4e8c6d] text-[#4e8c6d] px-4 py-2 rounded-full font-bold shadow-sm text-sm">
                                    운영비 0원 달성
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            {/* <section className="bg-white py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10 md:mb-16">
                        <h2
                            className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                            style={{
                                fontSize: 'var(--text-marketing-section-title)',
                                lineHeight: 'var(--leading-marketing-section-title)',
                            }}
                        >
                            자주 묻는 질문
                        </h2>
                        <p
                            className="text-gray-600 font-medium"
                            style={{ fontSize: 'var(--text-marketing-section-subtitle)' }}
                        >
                            궁금하신 내용을 확인해보세요
                        </p>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                        {faqItems.map((item, index) => (
                            <div key={index} className="bg-white border border-[#e6e6e6] rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full px-4 md:px-6 py-4 md:py-5 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <span
                                        className="font-bold text-[#2d2d2d] pr-2"
                                        style={{ fontSize: 'var(--text-marketing-faq-question)' }}
                                    >
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${
                                            openFaq === index ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {openFaq === index && (
                                    <div className="px-4 md:px-6 pb-4 md:pb-5">
                                        <p
                                            className="text-gray-600"
                                            style={{
                                                fontSize: 'var(--text-marketing-faq-answer)',
                                                lineHeight: 'var(--leading-marketing-card-body)',
                                            }}
                                        >
                                            {item.answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section> */}

            {/* CTA Section */}
            <section className="bg-gradient-to-b from-[#4e8c6d] to-[#5fa37c] py-16 md:py-24 px-4 md:px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2
                        className="font-bold text-white mb-4 md:mb-6"
                        style={{
                            fontSize: 'var(--text-marketing-section-title)',
                            lineHeight: 'var(--leading-marketing-section-title)',
                        }}
                    >
                        오늘부터 우리 조합의
                        <br />
                        홈페이지를 시작해보세요
                    </h2>
                    <p
                        className="text-white/90 mb-8 md:mb-10 font-medium"
                        style={{
                            fontSize: 'var(--text-marketing-subtitle)',
                            lineHeight: 'var(--leading-marketing-subtitle)',
                        }}
                    >
                        조합원들과의 더 나은 소통, 투명한 정보 공유,
                        <br />
                        그리고 편리한 조합 운영이 여러분을 기다립니다
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-10 md:mb-12">
                        <button
                            onClick={() => router.push('/contact')}
                            className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 bg-white text-[#4e8c6d] rounded-lg font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                            style={{ fontSize: 'var(--text-marketing-button)' }}
                        >
                            상담하기
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="border-t border-white/20 pt-6 md:pt-8">
                        <p className="text-white/80" style={{ fontSize: 'var(--text-marketing-card-body)' }}>
                            💬 빠른 상담을 원하시나요? <span className="text-white font-bold">1588-XXXX</span> 또는{' '}
                            <span className="text-white font-bold">injostar@naver.com</span>으로 연락주세요
                        </p>
                    </div>
                </div>
            </section>

            {/* 테스트용 조합 바로가기 (맨 아래 배치) */}
            <section className="bg-gray-50 py-10 md:py-12 px-4 md:px-6">
                <div className="max-w-md mx-auto p-5 md:p-8 border rounded-2xl bg-white shadow-sm">
                    <h3 className="font-bold mb-4" style={{ fontSize: 'var(--text-marketing-card-title)' }}>
                        테스트용 조합 바로가기
                    </h3>
                    <div className="space-y-4">
                        {isLoading ? (
                            <div
                                className="text-center py-4 text-gray-500"
                                style={{ fontSize: 'var(--text-marketing-card-body)' }}
                            >
                                목록을 불러오는 중...
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <select
                                        value={selectedSlug}
                                        onChange={(e) => setSelectedSlug(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-3 border-gray-300 focus:outline-none focus:ring-[#4e8c6d] focus:border-[#4e8c6d] rounded-md border"
                                        style={{ fontSize: 'var(--text-marketing-card-body)' }}
                                    >
                                        {unions.map((union) => (
                                            <option key={union.id} value={union.slug}>
                                                {union.name} (/{union.slug})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleNavigate}
                                    disabled={!selectedSlug}
                                    className="w-full bg-[#2d2d2d] text-white px-4 py-3 rounded-md hover:bg-[#3d3d3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
                                    style={{ fontSize: 'var(--text-marketing-button)' }}
                                >
                                    해당 조합 페이지로 이동
                                </button>
                            </>
                        )}
                    </div>
                    <p className="mt-4 text-xs text-gray-500 text-center">
                        * 개발 및 테스트 목적으로 제공되는 기능입니다.
                    </p>
                </div>
            </section>
        </div>
    );
}
