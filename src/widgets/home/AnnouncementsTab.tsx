'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Bell, Calendar, ArrowRight } from 'lucide-react';
import { useAnnouncementStore } from '@/shared/store/announcementStore';
import type { AnnouncementItem } from '@/entities/announcement/model/types';

interface AnnouncementsTabProps {
    // props는 제거하고 내부에서 데이터를 가져오도록 변경
}

export default function AnnouncementsTab({}: AnnouncementsTabProps) {
    const params = useParams();
    const router = useRouter();
    const slug = params.homepage as string;

    // useAnnouncementStore를 사용하여 최신 4개 공지사항 가져오기
    const { announcements, loading, error, fetchAnnouncements, resetState } = useAnnouncementStore();

    useEffect(() => {
        if (slug) {
            // 페이지 크기를 4로 설정하여 최신 4개만 가져오기
            const currentState = useAnnouncementStore.getState();
            currentState.pageSize = 4;
            fetchAnnouncements(slug, true).catch(console.error);
        }

        return () => {
            resetState();
        };
    }, [slug, fetchAnnouncements, resetState]);

    // 더보기 버튼 클릭 핸들러
    const handleViewMore = () => {
        router.push(`/${slug}/announcements`);
    };

    // 개별 공지사항 클릭 핸들러
    const handleAnnouncementClick = (announcementId: string) => {
        router.push(`/${slug}/announcements/${announcementId}`);
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 animate-pulse" />
                <p>공지사항을 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-red-300" />
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!announcements || announcements.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>등록된 공지사항이 없습니다</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 sm:grid sm:grid-cols-2">
            <div className="flex-1 sm:col-span-1">
                <div
                    className="bg-blue-50 border border-blue-200 rounded-lg p-6 h-full cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleAnnouncementClick(announcements[0].id)}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-lg text-blue-900 hover:text-blue-700 transition-colors">
                            {announcements[0].title}
                        </h4>
                        {announcements[0].isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                                긴급
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-blue-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {announcements[0].content}
                    </p>
                    <div className="flex items-center justify-between text-sm text-blue-600">
                        <span>{announcements[0].author}</span>
                        <span>{announcements[0].date}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 sm:col-span-1 flex flex-col h-full">
                <div className="flex justify-end mb-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        onClick={handleViewMore}
                    >
                        + 더보기
                    </Button>
                </div>
                <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden flex-1">
                    {announcements.slice(1, 4).map((announcement, index) => (
                        <div
                            key={announcement.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                                index !== announcements.slice(1, 4).length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                            onClick={() => handleAnnouncementClick(announcement.id)}
                        >
                            <div className="flex-1 pr-3">
                                <div className="flex items-center gap-2">
                                    <h5 className="text-sm text-gray-900 hover:text-blue-600 transition-colors leading-tight">
                                        {announcement.title}
                                    </h5>
                                    {announcement.isUrgent && (
                                        <Badge variant="destructive" className="text-xs">
                                            긴급
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <span>{announcement.author}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">{announcement.date}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
