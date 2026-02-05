'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { 
    Bell, 
    FileText, 
    Calendar, 
    Users, 
    MessageSquare, 
    Building2,
    ArrowRight
} from 'lucide-react';

interface LandingContentGridProps {
    unionName: string;
    className?: string;
}

// 콘텐츠 카드 데이터
const topContentCards = [
    {
        id: 'notice',
        icon: Bell,
        title: '공지사항',
        description: '조합의 중요 소식을 확인하세요',
        color: '#2F7F5F',
    },
    {
        id: 'documents',
        icon: FileText,
        title: '자료실',
        description: '필요한 문서를 다운로드하세요',
        color: '#4F6D61',
    },
    {
        id: 'schedule',
        icon: Calendar,
        title: '일정',
        description: '주요 일정을 확인하세요',
        color: '#2F7F5F',
    },
];

const bottomContentCards = [
    {
        id: 'members',
        icon: Users,
        title: '조합원 현황',
        description: '조합원 정보를 확인하세요',
        count: '1,234명',
    },
    {
        id: 'community',
        icon: MessageSquare,
        title: '커뮤니티',
        description: '조합원들과 소통하세요',
        count: '156건',
    },
    {
        id: 'progress',
        icon: Building2,
        title: '사업 진행현황',
        description: '재개발 진행 상황을 확인하세요',
        progress: 65,
    },
];

/**
 * 조합 랜딩 페이지 콘텐츠 그리드
 * 피그마: ContentGrid (868:7469) - 1814×804px
 * 
 * 구조:
 * - LeftSidebarImage: 모바일 목업 (279×501px)
 * - MainContentArea: 중앙 콘텐츠 (1172×804px)
 *   - TopContentRow: 카드/타일 그리드
 *   - BottomContentRow: 정보 카드들
 * - RightSidebarImage: 모바일 목업 (279×498px)
 */
export function LandingContentGrid({ unionName, className }: LandingContentGridProps) {
    return (
        <section 
            className={cn(
                'w-full py-8 md:py-12 lg:py-16',
                'bg-[#F4F5F6]',
                className
            )}
        >
            <div className="max-w-[1814px] mx-auto px-4 md:px-6">
                <div 
                    className={cn(
                        'flex flex-col lg:flex-row',
                        'items-center lg:items-start',
                        'justify-center',
                        'gap-6 lg:gap-[42px]'
                    )}
                >
                    {/* Left Sidebar Image - 피그마: 1120:554 */}
                    <div className="hidden lg:block w-[279px] shrink-0">
                        <div 
                            className={cn(
                                'relative w-full h-[501px]',
                                'rounded-[11.5px]',
                                'overflow-hidden',
                                'shadow-2xl',
                                'transform -rotate-3 hover:rotate-0',
                                'transition-transform duration-300'
                            )}
                        >
                            <Image
                                src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&h=600&fit=crop"
                                alt="모바일 앱 목업"
                                fill
                                className="object-cover"
                            />
                            {/* 앱 UI 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="bg-white/90 backdrop-blur rounded-lg p-3">
                                    <p className="text-xs font-semibold text-[#2F7F5F]">{unionName}</p>
                                    <p className="text-[10px] text-gray-500">모바일 앱에서도 확인하세요</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area - 피그마: 868:7471 */}
                    <div 
                        className={cn(
                            'flex-1 w-full',
                            'max-w-[1172px]',
                            'flex flex-col gap-6 md:gap-[30px]'
                        )}
                    >
                        {/* Section Title */}
                        <div className="text-center mb-2">
                            <h2 className="text-2xl md:text-3xl font-bold text-[#333641]">
                                주요 서비스
                            </h2>
                            <p className="text-gray-500 mt-2">
                                {unionName}의 다양한 서비스를 이용해보세요
                            </p>
                        </div>

                        {/* Top Content Row - 피그마: 868:7472 */}
                        <div 
                            className={cn(
                                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                                'gap-4 md:gap-6'
                            )}
                        >
                            {topContentCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <button
                                        key={card.id}
                                        className={cn(
                                            'group',
                                            'bg-white rounded-xl',
                                            'p-5 md:p-6',
                                            'shadow-sm hover:shadow-md',
                                            'transition-all duration-200',
                                            'text-left',
                                            'border border-transparent hover:border-[#2F7F5F]/20'
                                        )}
                                    >
                                        <div 
                                            className={cn(
                                                'w-12 h-12 rounded-lg',
                                                'flex items-center justify-center',
                                                'mb-4',
                                                'transition-transform group-hover:scale-110'
                                            )}
                                            style={{ backgroundColor: `${card.color}15` }}
                                        >
                                            <Icon 
                                                className="w-6 h-6"
                                                style={{ color: card.color }}
                                            />
                                        </div>
                                        <h3 className="font-bold text-[#333641] text-lg mb-1">
                                            {card.title}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                            {card.description}
                                        </p>
                                        <div 
                                            className={cn(
                                                'mt-4 flex items-center gap-1',
                                                'text-[#2F7F5F] font-semibold text-sm',
                                                'opacity-0 group-hover:opacity-100',
                                                'transition-opacity'
                                            )}
                                        >
                                            자세히 보기
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Bottom Content Row - 피그마: 868:7546 */}
                        <div 
                            className={cn(
                                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                                'gap-4 md:gap-6'
                            )}
                        >
                            {bottomContentCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <div
                                        key={card.id}
                                        className={cn(
                                            'bg-white rounded-xl',
                                            'p-5 md:p-6',
                                            'shadow-sm',
                                            'border border-gray-100'
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div 
                                                className={cn(
                                                    'w-10 h-10 rounded-lg',
                                                    'bg-[#4F6D61]/10',
                                                    'flex items-center justify-center'
                                                )}
                                            >
                                                <Icon className="w-5 h-5 text-[#4F6D61]" />
                                            </div>
                                            {card.count && (
                                                <span className="text-2xl font-bold text-[#2F7F5F]">
                                                    {card.count}
                                                </span>
                                            )}
                                            {card.progress !== undefined && (
                                                <span className="text-2xl font-bold text-[#2F7F5F]">
                                                    {card.progress}%
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-[#333641] mb-1">
                                            {card.title}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                            {card.description}
                                        </p>
                                        {card.progress !== undefined && (
                                            <div className="mt-3">
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-[#2F7F5F] rounded-full transition-all"
                                                        style={{ width: `${card.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Sidebar Image - 피그마: 1120:553 */}
                    <div className="hidden lg:block w-[279px] shrink-0">
                        <div 
                            className={cn(
                                'relative w-full h-[498px]',
                                'rounded-[11.5px]',
                                'overflow-hidden',
                                'shadow-2xl',
                                'transform rotate-3 hover:rotate-0',
                                'transition-transform duration-300'
                            )}
                        >
                            <Image
                                src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=300&h=600&fit=crop"
                                alt="모바일 앱 목업"
                                fill
                                className="object-cover"
                            />
                            {/* 앱 UI 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="bg-white/90 backdrop-blur rounded-lg p-3">
                                    <p className="text-xs font-semibold text-[#2F7F5F]">실시간 알림</p>
                                    <p className="text-[10px] text-gray-500">중요한 소식을 놓치지 마세요</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default LandingContentGrid;
