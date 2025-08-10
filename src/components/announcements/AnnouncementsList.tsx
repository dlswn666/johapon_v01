'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Eye, Pin, User } from 'lucide-react';

type AnnouncementPriority = 'high' | 'normal' | 'low';

export interface AnnouncementItem {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD
    category: '중요공지' | '일반공지' | '안내사항';
    priority: AnnouncementPriority;
    views: number;
    isPinned: boolean;
}

interface AnnouncementsListProps {
    announcements: AnnouncementItem[];
}

export default function AnnouncementsList({ announcements }: AnnouncementsListProps) {
    const getPriorityColor = (priority: AnnouncementPriority) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'normal':
                return 'bg-blue-100 text-blue-800';
            case 'low':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    };

    const getPriorityText = (priority: AnnouncementPriority) => {
        switch (priority) {
            case 'high':
                return '높음';
            case 'normal':
                return '보통';
            case 'low':
                return '낮음';
            default:
                return '보통';
        }
    };

    const sortedAnnouncements = useMemo(() => {
        return [...announcements].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [announcements]);

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
        <div className="space-y-4">
            {sortedAnnouncements.map((announcement) => (
                <Card
                    key={announcement.id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${
                        announcement.isPinned ? 'ring-2 ring-green-200' : ''
                    }`}
                >
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        {announcement.isPinned && <Pin className="h-4 w-4 text-red-600" />}
                                        <Badge variant="secondary" className="text-gray-900">
                                            {announcement.category}
                                        </Badge>
                                        <Badge className={getPriorityColor(announcement.priority)}>
                                            {getPriorityText(announcement.priority)}
                                        </Badge>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Calendar className="h-4 w-4 mr-1" />
                                            {announcement.date}
                                        </div>
                                    </div>
                                    <h3 className="text-lg text-gray-900 mb-2">{announcement.title}</h3>
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
        </div>
    );
}
