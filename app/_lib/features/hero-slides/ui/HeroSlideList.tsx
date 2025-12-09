'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Edit, Trash2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeroSlide } from '@/app/_lib/shared/type/database.types';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

interface HeroSlideListProps {
    slides: HeroSlide[];
    isLoading: boolean;
    onDelete: (slide: HeroSlide) => void;
}

type FilterStatus = 'all' | 'active' | 'inactive';

export default function HeroSlideList({ slides, isLoading, onDelete }: HeroSlideListProps) {
    const router = useRouter();
    const { slug } = useSlug();
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

    const filteredSlides = useMemo(() => {
        return slides.filter((slide) => {
            if (filterStatus === 'active') return slide.is_active;
            if (filterStatus === 'inactive') return !slide.is_active;
            return true;
        });
    }, [slides, filterStatus]);

    const stats = useMemo(() => {
        return {
            total: slides.length,
            active: slides.filter((s) => s.is_active).length,
            inactive: slides.filter((s) => !s.is_active).length,
        };
    }, [slides]);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-[#4E8C6D] border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500">슬라이드를 불러오는 중...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-[#4E8C6D]/10 to-[#4E8C6D]/5 border-[#4E8C6D]/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">전체 슬라이드</p>
                                <p className="text-3xl font-bold text-[#4E8C6D]">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-[#4E8C6D]/20 rounded-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-[#4E8C6D]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">활성 슬라이드</p>
                                <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center">
                                <Eye className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">비활성 슬라이드</p>
                                <p className="text-3xl font-bold text-gray-600">{stats.inactive}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 필터 & 등록 버튼 */}
            <Card>
                <CardHeader className="border-b bg-gray-50/50 py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-semibold">슬라이드 목록</CardTitle>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Select
                                value={filterStatus}
                                onValueChange={(value: FilterStatus) => setFilterStatus(value)}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="상태 필터" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체</SelectItem>
                                    <SelectItem value="active">활성</SelectItem>
                                    <SelectItem value="inactive">비활성</SelectItem>
                                </SelectContent>
                            </Select>
                            <Link href={`/${slug}/admin/slides/new`}>
                                <Button className="bg-[#4E8C6D] hover:bg-[#3d7359] gap-2">
                                    <Plus className="w-4 h-4" />
                                    슬라이드 등록
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredSlides.length === 0 ? (
                        <div className="py-16 text-center">
                            <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 mb-4">
                                {filterStatus === 'all'
                                    ? '등록된 슬라이드가 없습니다.'
                                    : filterStatus === 'active'
                                    ? '활성화된 슬라이드가 없습니다.'
                                    : '비활성화된 슬라이드가 없습니다.'}
                            </p>
                            {filterStatus === 'all' && (
                                <Link href={`/${slug}/admin/slides/new`}>
                                    <Button variant="outline" className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        첫 슬라이드 등록하기
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredSlides.map((slide) => (
                                <div
                                    key={slide.id}
                                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                                >
                                    {/* 썸네일 */}
                                    <div className="flex-shrink-0">
                                        <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 border relative">
                                            <Image
                                                src={slide.image_url}
                                                alt="슬라이드 이미지"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>

                                    {/* 정보 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    slide.is_active
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {slide.is_active ? '활성' : '비활성'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                순서: {slide.display_order}
                                            </span>
                                        </div>
                                        {slide.link_url ? (
                                            <a
                                                href={slide.link_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate"
                                            >
                                                {slide.link_url}
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-400">링크 없음</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            등록일:{' '}
                                            {slide.created_at
                                                ? new Date(slide.created_at).toLocaleDateString('ko-KR')
                                                : '-'}
                                        </p>
                                    </div>

                                    {/* 액션 버튼 */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                router.push(`/${slug}/admin/slides/${slide.id}`)
                                            }
                                            title="상세보기"
                                        >
                                            <Eye className="w-4 h-4 text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                router.push(`/${slug}/admin/slides/${slide.id}/edit`)
                                            }
                                            title="수정"
                                        >
                                            <Edit className="w-4 h-4 text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(slide)}
                                            title="삭제"
                                            className="hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

