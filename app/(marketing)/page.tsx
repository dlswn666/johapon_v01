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
    Palette,
    Smartphone,
    DollarSign,
    HandCoins,
    PiggyBank,
    Megaphone,
    ChevronDown,
    ArrowRight,
    FileDown,
    LockKeyhole,
    BellRing,
    Coins,
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
    const [openFaq, setOpenFaq] = useState<number | null>(null);

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

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const faqItems = [
        {
            question: '어르신들도 쉽게 사용할 수 있나요?',
            answer: '네, 큰 글씨와 명확한 버튼, 간단한 구조로 설계하여 어르신들도 쉽게 사용하실 수 있습니다. 또한 카카오톡 연동을 통해 익숙한 방식으로 알림을 받으실 수 있습니다.',
        },
        {
            question: '도입 비용은 얼마인가요?',
            answer: '협력사 광고를 통해 운영비를 충당하기 때문에 조합원들에게 추가 비용 부담이 없습니다. 자세한 내용은 상담을 통해 안내드립니다.',
        },
        {
            question: '도입 절차는 어떻게 되나요?',
            answer: '상담 신청 → 조합 현황 파악 → 맞춤 홈페이지 구축 → 테스트 운영 → 정식 오픈 순서로 진행됩니다. 전체 과정은 약 2-4주 정도 소요됩니다.',
        },
    ];

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
                            우리 조합의 홈페이지,
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
                            조합 운영을 위한
                            <br />
                            스마트한 기능들
                        </h2>
                        <p
                            className="text-gray-600 font-medium"
                            style={{ fontSize: 'var(--text-marketing-section-subtitle)' }}
                        >
                            실제로 필요한 기능만 모았습니다
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {/* Feature 1 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8">
                            <div className="flex gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        카카오톡 연동
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        조합원들이 자주 사용하는 카카오톡으로 공지사항을 즉시 전달할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8">
                            <div className="flex gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Bell className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        공지사항 전체 발송
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        중요한 소식을 등록 한 번으로 모든 조합원에게 전달됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8">
                            <div className="flex gap-3 md:gap-4">
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

                        {/* Feature 4 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8">
                            <div className="flex gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
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
                                        큰 글씨, 명확한 버튼, 간단한 구조로 누구나 쉽게 사용할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 5 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8">
                            <div className="flex gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Palette className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        조합 맞춤형 테마
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        우리 조합만의 색상과 로고를 적용하여 브랜드 아이덴티티를 구축합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 6 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8">
                            <div className="flex gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3
                                        className="font-bold text-[#2d2d2d] mb-1 md:mb-2"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-title)',
                                            lineHeight: 'var(--leading-marketing-card-title)',
                                        }}
                                    >
                                        모바일 최적화
                                    </h3>
                                    <p
                                        className="text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-card-body)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        PC는 물론 스마트폰에서도 편리하게 이용할 수 있는 반응형 디자인입니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Revenue Section */}
            <section className="bg-white py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Badge & Title */}
                    <div className="text-center mb-10 md:mb-16">
                        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-[#4e8c6d]/10 rounded-full mb-4 md:mb-6">
                            <DollarSign className="w-4 h-4 text-[#4e8c6d]" />
                            <span
                                className="text-[#4e8c6d] font-bold"
                                style={{ fontSize: 'var(--text-marketing-card-body)' }}
                            >
                                추가 비용 부담 없이
                            </span>
                        </div>
                        <h2
                            className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                            style={{
                                fontSize: 'var(--text-marketing-section-title)',
                                lineHeight: 'var(--leading-marketing-section-title)',
                            }}
                        >
                            운영비 걱정 없이
                            <br />
                            조합을 운영하세요
                        </h2>
                        <p
                            className="text-gray-600 font-medium"
                            style={{ fontSize: 'var(--text-marketing-section-subtitle)' }}
                        >
                            협력사 광고를 통해 운영비를 확보할 수 있습니다
                        </p>
                    </div>

                    {/* Revenue Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
                        {/* Card 1 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 text-center">
                            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                                <HandCoins className="w-7 h-7 md:w-8 md:h-8 text-[#4e8c6d]" />
                            </div>
                            <h3
                                className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                협력사 광고 수익
                            </h3>
                            <p
                                className="text-gray-600"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                부동산, 이사업체 등 관련 업체의 광고를 게재하여 수익을 창출합니다
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 text-center">
                            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 bg-[#5fa37c]/10 rounded-full flex items-center justify-center">
                                <DollarSign className="w-7 h-7 md:w-8 md:h-8 text-[#4e8c6d]" />
                            </div>
                            <h3
                                className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                운영비 지원
                            </h3>
                            <p
                                className="text-gray-600"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                발생한 수익으로 홈페이지 운영비와 유지보수 비용을 충당합니다
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-5 md:p-8 text-center">
                            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                                <PiggyBank className="w-7 h-7 md:w-8 md:h-8 text-[#4e8c6d]" />
                            </div>
                            <h3
                                className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                                style={{
                                    fontSize: 'var(--text-marketing-card-title)',
                                    lineHeight: 'var(--leading-marketing-card-title)',
                                }}
                            >
                                조합원 부담 최소화
                            </h3>
                            <p
                                className="text-gray-600"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                조합원들에게 추가 비용을 부담시키지 않고 안정적인 운영이 가능합니다
                            </p>
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="bg-white border-2 border-[#4e8c6d]/20 rounded-2xl p-5 md:p-12 mx-auto max-w-4xl">
                        <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8">
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-[#4e8c6d]/10 rounded-xl flex items-center justify-center shrink-0">
                                <Megaphone className="w-12 h-12 md:w-16 md:h-16 text-[#4e8c6d]" />
                            </div>
                            <div className="text-center md:text-left">
                                <h3
                                    className="font-bold text-[#2d2d2d] mb-3 md:mb-4"
                                    style={{
                                        fontSize: 'var(--text-marketing-card-title)',
                                        lineHeight: 'var(--leading-marketing-card-title)',
                                    }}
                                >
                                    광고를 통한 운영 지원
                                </h3>
                                <p
                                    className="text-gray-600"
                                    style={{
                                        fontSize: 'var(--text-marketing-card-body)',
                                        lineHeight: 'var(--leading-marketing-card-body)',
                                    }}
                                >
                                    조합원들에게 유용한 정보를 제공하는 협력사 광고를 통해
                                    <br className="hidden md:block" />
                                    홈페이지 운영에 필요한 비용을 확보하고, 지속 가능한 서비스를 제공합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="bg-white py-12 md:py-20 px-4 md:px-6">
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
            </section>

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
                        <button
                            onClick={() => router.push('/features')}
                            className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 border-2 border-white/70 text-white rounded-lg font-bold hover:bg-white/10 transition-colors cursor-pointer"
                            style={{ fontSize: 'var(--text-marketing-button)' }}
                        >
                            <FileDown className="w-4 h-4" />
                            서비스 소개서 보기
                        </button>
                    </div>

                    <div className="border-t border-white/20 pt-6 md:pt-8">
                        <p className="text-white/80" style={{ fontSize: 'var(--text-marketing-card-body)' }}>
                            💬 빠른 상담을 원하시나요? <span className="text-white font-bold">1588-XXXX</span> 또는{' '}
                            <span className="text-white font-bold">contact@example.com</span>으로 연락주세요
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
