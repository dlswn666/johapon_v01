'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Calendar, Eye, Pin, User, AlertTriangle, Megaphone, Bell, CheckCircle } from 'lucide-react';
import InfiniteScrollContainer from '@/shared/components/InfiniteScrollContainer';
import type { AnnouncementItem } from '@/entities/announcement/model/types';
import { useParams, useRouter } from 'next/navigation';

interface AnnouncementsListProps {
    announcements: AnnouncementItem[];
    loading?: boolean;
    error?: string | null;
    hasMore?: boolean;
    observerRef?: (node: HTMLElement | null) => void;
}

export default function AnnouncementsList({
    announcements,
    loading = false,
    error = null,
    hasMore = false,
    observerRef,
}: AnnouncementsListProps) {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;

    const sortedAnnouncements = useMemo(() => {
        return [...announcements].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [announcements]);

    const handleAnnouncementClick = (announcementId: string) => {
        if (homepage) {
            router.push(`/${homepage}/announcements/${announcementId}`);
        }
    };

    // 로딩 상태
    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">공지사항을 불러오는 중...</p>
                </CardContent>
            </Card>
        );
    }

    // 에러 상태
    if (error) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="h-12 w-12 text-red-400 mx-auto mb-4">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg text-gray-900 mb-2">오류가 발생했습니다</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        다시 시도
                    </button>
                </CardContent>
            </Card>
        );
    }

    // 빈 상태
    if (sortedAnnouncements.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <svg
                        className="h-12 w-12 text-gray-300 mx-auto mb-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6 22v-3" />
                        <path d="M10 22v-3" />
                        <path d="M14 22v-3" />
                        <path d="M18 22v-3" />
                        <path d="M2 9h20" />
                        <path d="M20 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
                    </svg>
                    <h3 className="text-lg text-gray-900 mb-2">공지사항이 없습니다</h3>
                    <p className="text-gray-600 mb-4">{'검색 조건에 맞는 공지사항이 없습니다.'}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <InfiniteScrollContainer
            hasMore={hasMore}
            loading={loading}
            error={error}
            observerRef={observerRef || (() => {})}
            loadingMessage="더 많은 공지사항을 불러오는 중..."
            endMessage="모든 공지사항을 불러왔습니다."
            scrollHintMessage="스크롤하여 더 많은 공지사항 보기"
        >
            {sortedAnnouncements.map((announcement) => (
                <Card
                    key={announcement.id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${
                        announcement.isPinned ? 'ring-2 ring-green-200' : ''
                    }`}
                    onClick={() => handleAnnouncementClick(announcement.id)}
                >
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {/* 상태 아이콘들과 카테고리 */}
                                    <div className="flex items-center space-x-2 mb-2">
                                        {/* 긴급 공지 */}
                                        {announcement.isUrgent && (
                                            <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-600">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                긴급
                                            </Badge>
                                        )}
                                        
                                        {/* 상단 고정 */}
                                        {announcement.isPinned && (
                                            <Badge variant="default" className="text-xs px-2 py-1 bg-green-600">
                                                <Pin className="h-3 w-3 mr-1" />
                                                고정
                                            </Badge>
                                        )}
                                        
                                        {/* 팝업 공지 */}
                                        {announcement.popup && (
                                            <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-100 text-blue-800">
                                                <Megaphone className="h-3 w-3 mr-1" />
                                                팝업
                                            </Badge>
                                        )}
                                        
                                        {/* 알림톡 발송 */}
                                        {announcement.alrimtalkSent ? (
                                            <Badge variant="outline" className="text-xs px-2 py-1 border-orange-300 text-orange-700">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                알림발송
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs px-2 py-1 border-gray-300 text-gray-600">
                                                <Bell className="h-3 w-3 mr-1" />
                                                미발송
                                            </Badge>
                                        )}
                                        
                                        <Badge variant="secondary" className="text-gray-900 ml-auto">
                                            {announcement.category}
                                        </Badge>
                                    </div>
                                    
                                    {/* 제목과 날짜 */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className={`text-lg mb-0 flex-1 ${announcement.isUrgent ? 'text-red-700 font-semibold' : 'text-gray-900'}`}>
                                            {announcement.title}
                                        </h3>
                                        <div className="flex items-center text-sm text-gray-500 ml-4">
                                            <Calendar className="h-4 w-4 mr-1" />
                                            {announcement.date}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm text-gray-600 leading-relaxed">
                                <p>{announcement.content}</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center text-sm text-gray-500">
                                    <User className="h-4 w-4 mr-1" />
                                    {announcement.author}
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                    <Eye className="h-4 w-4 mr-1" />
                                    {announcement.views} 조회
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </InfiniteScrollContainer>
    );
}
