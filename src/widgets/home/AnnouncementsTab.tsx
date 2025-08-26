'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
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

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="flex items-start space-x-3 p-4 bg-gray-100 rounded-lg">
                            <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-6">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">공지사항을 불러올 수 없습니다</p>
                <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
        );
    }

    if (!announcements || announcements.length === 0) {
        return (
            <div className="text-center p-6">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">등록된 공지사항이 없습니다</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {announcements.slice(0, 4).map((announcement: AnnouncementItem, index: number) => (
                <div
                    key={announcement.id}
                    className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => router.push(`/${slug}/announcements/${announcement.id}`)}
                >
                    <div className="flex-shrink-0 mt-1">
                        {announcement.isUrgent ? (
                            <Bell className="h-4 w-4 text-red-500" />
                        ) : (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">{announcement.title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{announcement.date}</span>
                            <span>•</span>
                            <span>조회 {announcement.views}</span>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
            ))}

            <div className="pt-3 border-t">
                <Button variant="outline" className="w-full" onClick={() => router.push(`/${slug}/announcements`)}>
                    모든 공지사항 보기
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
