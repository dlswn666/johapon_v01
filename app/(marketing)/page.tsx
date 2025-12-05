'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Database } from '@/app/_lib/shared/type/database.types';
import {
    Phone,
    FileText,
    Wallet,
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
            <section className="relative h-[600px] overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img src={heroBackgroundImage} alt="Hero Background" className="w-full h-full object-cover" />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 pt-16 w-full">
                    <div className="text-center space-y-6 max-w-6xl w-full px-6 mx-auto">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                            우리 조합의 홈페이지,
                            <br />
                            이제는 더 쉽고 스마트하게
                        </h1>
                        <p className="text-xl md:text-2xl text-white/90 font-medium">
                            조합원 소통, 공지 전달, 광고 수익까지 한 번에 해결
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <button
                                onClick={() => router.push('/contact')}
                                className="px-8 py-3 bg-[#4e8c6d] text-white rounded-lg text-lg font-bold hover:bg-[#3d7a5c] transition-colors cursor-pointer"
                            >
                                도입 문의하기
                            </button>
                            <button
                                onClick={() => router.push('/features')}
                                className="px-8 py-3 bg-white/10 text-white border border-white/30 rounded-lg text-lg font-bold hover:bg-white/20 transition-colors cursor-pointer"
                            >
                                홈페이지 예시 보기
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="bg-[#e6e6e6] py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2d2d2d] leading-tight mb-4">
                            지금도 전화로
                            <br />
                            조합 소식 전하시나요?
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-600 font-medium">이런 불편함을 겪고 계시지 않나요?</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                                <Phone className="w-8 h-8 text-[#4e8c6d]" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-[#2d2d2d] mb-4">전화로 일일이 연락</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                중요한 공지사항을 조합원 한 명 한 명에게 전화로 전달하느라 시간과 비용이 낭비됩니다.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                                <FileText className="w-8 h-8 text-[#4e8c6d]" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-[#2d2d2d] mb-4">복잡한 문서 관리</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                회의록, 계약서, 진행상황 등 중요한 문서들이 여기저기 흩어져 관리가 어렵습니다.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                                <Wallet className="w-8 h-8 text-[#4e8c6d]" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-[#2d2d2d] mb-4">부족한 운영비</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                조합 홈페이지 운영에 필요한 비용을 조합원들에게 추가로 부담시키기 어렵습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-white py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2d2d2d] leading-tight mb-4">
                            조합 운영을 위한
                            <br />
                            스마트한 기능들
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-600 font-medium">실제로 필요한 기능만 모았습니다</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-6 h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-[#2d2d2d] mb-2">
                                        카카오톡 연동
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed">
                                        조합원들이 자주 사용하는 카카오톡으로 공지사항을 즉시 전달할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Bell className="w-6 h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-[#2d2d2d] mb-2">
                                        공지사항 전체 발송
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed">
                                        중요한 소식을 클릭 한 번으로 모든 조합원에게 동시에 전달합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Clock className="w-6 h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-[#2d2d2d] mb-2">
                                        타임라인 재개발 현황
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed">
                                        사업 진행 상황을 시간 순서대로 한눈에 볼 수 있어 투명한 정보 공유가 가능합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Users className="w-6 h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-[#2d2d2d] mb-2">
                                        어르신을 위한 UI
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed">
                                        큰 글씨, 명확한 버튼, 간단한 구조로 누구나 쉽게 사용할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 5 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Palette className="w-6 h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-[#2d2d2d] mb-2">
                                        조합 맞춤형 테마
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed">
                                        우리 조합만의 색상과 로고를 적용하여 브랜드 아이덴티티를 구축합니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Feature 6 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-[#4e8c6d]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <Smartphone className="w-6 h-6 text-[#4e8c6d]" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-[#2d2d2d] mb-2">
                                        모바일 최적화
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed">
                                        PC는 물론 스마트폰에서도 편리하게 이용할 수 있는 반응형 디자인입니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Revenue Section */}
            <section className="bg-white py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Badge & Title */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#4e8c6d]/10 rounded-full mb-6">
                            <DollarSign className="w-4 h-4 text-[#4e8c6d]" />
                            <span className="text-[#4e8c6d] text-lg font-bold">추가 비용 부담 없이</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2d2d2d] leading-tight mb-4">
                            운영비 걱정 없이
                            <br />
                            조합을 운영하세요
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-600 font-medium">
                            협력사 광고를 통해 운영비를 확보할 수 있습니다
                        </p>
                    </div>

                    {/* Revenue Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        {/* Card 1 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                                <HandCoins className="w-8 h-8 text-[#4e8c6d]" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-[#2d2d2d] mb-4">협력사 광고 수익</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                부동산, 이사업체 등 관련 업체의 광고를 게재하여 수익을 창출합니다
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#5fa37c]/10 rounded-full flex items-center justify-center">
                                <DollarSign className="w-8 h-8 text-[#4e8c6d]" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-[#2d2d2d] mb-4">운영비 지원</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                발생한 수익으로 홈페이지 운영비와 유지보수 비용을 충당합니다
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white border border-[#e6e6e6] rounded-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-6 bg-[#4e8c6d]/10 rounded-full flex items-center justify-center">
                                <PiggyBank className="w-8 h-8 text-[#4e8c6d]" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-[#2d2d2d] mb-4">조합원 부담 최소화</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                조합원들에게 추가 비용을 부담시키지 않고 안정적인 운영이 가능합니다
                            </p>
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="bg-white border-2 border-[#4e8c6d]/20 rounded-2xl p-8 md:p-12 mx-auto max-w-4xl">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-32 h-32 bg-[#4e8c6d]/10 rounded-xl flex items-center justify-center shrink-0">
                                <Megaphone className="w-16 h-16 text-[#4e8c6d]" />
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-bold text-[#2d2d2d] mb-4">
                                    광고를 통한 운영 지원
                                </h3>
                                <p className="text-gray-600 text-xl leading-relaxed">
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
            <section className="bg-white py-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2d2d2d] mb-4">
                            자주 묻는 질문
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-600 font-medium">궁금하신 내용을 확인해보세요</p>
                    </div>

                    <div className="space-y-4">
                        {faqItems.map((item, index) => (
                            <div key={index} className="bg-white border border-[#e6e6e6] rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-xl font-bold text-[#2d2d2d]">{item.question}</span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-gray-500 transition-transform ${
                                            openFaq === index ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {openFaq === index && (
                                    <div className="px-6 pb-5">
                                        <p className="text-gray-600 text-lg leading-relaxed">{item.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-b from-[#4e8c6d] to-[#5fa37c] py-24 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                        오늘부터 우리 조합의
                        <br />
                        홈페이지를 시작해보세요
                    </h2>
                    <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed font-medium">
                        조합원들과의 더 나은 소통, 투명한 정보 공유,
                        <br />
                        그리고 편리한 조합 운영이 여러분을 기다립니다
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                        <button
                            onClick={() => router.push('/contact')}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-[#4e8c6d] rounded-lg text-lg font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            상담하기
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => router.push('/features')}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-white/70 text-white rounded-lg text-lg font-bold hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <FileDown className="w-4 h-4" />
                            서비스 소개서 보기
                        </button>
                    </div>

                    <div className="border-t border-white/20 pt-8">
                        <p className="text-white/80 text-lg">
                            💬 빠른 상담을 원하시나요? <span className="text-white font-bold">1588-XXXX</span> 또는{' '}
                            <span className="text-white font-bold">contact@example.com</span>으로 연락주세요
                        </p>
                    </div>
                </div>
            </section>

            {/* 테스트용 조합 바로가기 (맨 아래 배치) */}
            <section className="bg-gray-50 py-12 px-6">
                <div className="max-w-md mx-auto p-8 border rounded-2xl bg-white shadow-sm">
                    <h3 className="text-lg font-bold mb-4">테스트용 조합 바로가기</h3>
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="text-center py-4 text-gray-500">목록을 불러오는 중...</div>
                        ) : (
                            <>
                                <div className="relative">
                                    <select
                                        value={selectedSlug}
                                        onChange={(e) => setSelectedSlug(e.target.value)}
                                        className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-[#4e8c6d] focus:border-[#4e8c6d] sm:text-sm rounded-md border"
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
