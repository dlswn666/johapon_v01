'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdStore } from '@/shared/store/adStore';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Search, Phone, Calendar } from 'lucide-react';
import Image from 'next/image';

interface AdBoardProps {
    className?: string;
}

export default function AdBoard({ className = '' }: AdBoardProps) {
    const params = useParams();
    const slug = params?.homepage as string;

    const {
        boardAds,
        boardTotal,
        boardHasMore,
        boardSearch,
        loading,
        error,
        setBoardSearch,
        fetchBoardAds,
        resetBoardState,
    } = useAdStore();

    const [searchInput, setSearchInput] = useState(boardSearch);

    useEffect(() => {
        if (slug) {
            resetBoardState();
            fetchBoardAds(slug, true);
        }
    }, [slug, resetBoardState, fetchBoardAds]);

    const handleSearch = () => {
        setBoardSearch(searchInput);
        fetchBoardAds(slug, true);
    };

    const handleLoadMore = () => {
        if (!loading && boardHasMore) {
            fetchBoardAds(slug, false);
        }
    };

    const handleAdClick = (ad: any) => {
        // 광고 상세 모달 또는 새 창으로 이동
        console.log('광고 클릭:', ad);
        // TODO: 광고 상세 모달 구현
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* 검색 바 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="광고 제목이나 업체명으로 검색..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    검색
                </Button>
            </div>

            {/* 검색 결과 정보 */}
            {boardSearch && (
                <div className="text-sm text-gray-600">
                    &apos;{boardSearch}&apos; 검색 결과: {boardTotal}건
                </div>
            )}

            {/* 광고 목록 */}
            {loading && boardAds.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, index) => (
                        <div key={index} className="animate-pulse">
                            <div className="bg-gray-200 rounded-lg aspect-video mb-3"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-8 text-red-500">광고를 불러올 수 없습니다: {error}</div>
            ) : boardAds.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    {boardSearch ? '검색 결과가 없습니다.' : '현재 게시된 광고가 없습니다.'}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {boardAds.map((ad) => (
                            <div
                                key={ad.id}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => handleAdClick(ad)}
                            >
                                {/* 광고 이미지 */}
                                <div className="relative aspect-video">
                                    <Image
                                        src={
                                            ad.thumbnail_url ||
                                            ad.detail_image_url ||
                                            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop'
                                        }
                                        alt={`${ad.partner_name} - ${ad.title}`}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    />
                                    {/* 게재 위치 배지 */}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        {ad.placements.map((placement) => (
                                            <span
                                                key={placement}
                                                className="px-2 py-1 text-xs font-medium bg-black/70 text-white rounded"
                                            >
                                                {placement === 'SIDE'
                                                    ? '사이드'
                                                    : placement === 'HOME'
                                                    ? '홈'
                                                    : '게시판'}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* 광고 정보 */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{ad.title}</h3>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{ad.partner_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3 h-3" />
                                            <span>{ad.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 더보기 버튼 */}
                    {boardHasMore && (
                        <div className="text-center">
                            <Button variant="outline" onClick={handleLoadMore} disabled={loading} className="min-w-32">
                                {loading ? '로딩 중...' : '더보기'}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
