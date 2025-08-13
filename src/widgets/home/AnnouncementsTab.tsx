'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Bell } from 'lucide-react';
import type { AnnouncementItem } from '@/entities/announcement/model/types';

interface AnnouncementsTabProps {
    // props는 제거하고 내부에서 데이터를 가져오도록 변경
}

export default function AnnouncementsTab({}: AnnouncementsTabProps) {
    const params = useParams();
    const router = useRouter();
    const slug = params.homepage as string;

    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 최신 4개 공지사항 가져오기
    useEffect(() => {
        const fetchAnnouncements = async () => {
            if (!slug) return;

            try {
                setLoading(true);
                const queryParams = new URLSearchParams({
                    page: '1',
                    page_size: '4',
                    category_key: 'notice', // 공지사항 카테고리
                });

                const response = await fetch(`/api/tenant/${slug}/notices?${queryParams}`);

                if (!response.ok) {
                    throw new Error(`API 호출 실패: ${response.status}`);
                }

                const data = await response.json();

                if (data.success && data.items) {
                    // 데이터베이스 데이터를 AnnouncementItem 형태로 변환
                    const transformedAnnouncements: AnnouncementItem[] = data.items.map((post: any) => {
                        // content가 JSON 형식인지 확인하고 파싱
                        let contentText = post.content;
                        try {
                            const parsed = JSON.parse(post.content);
                            if (Array.isArray(parsed)) {
                                // Quill.js 델타 형식인 경우 텍스트만 추출
                                contentText = parsed
                                    .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                                    .join('')
                                    .trim();
                            }
                        } catch {
                            // JSON이 아닌 경우 그대로 사용
                            contentText = post.content;
                        }

                        // HTML 태그 제거하고 길이 제한
                        contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

                        return {
                            id: post.id,
                            title: post.title,
                            content: contentText,
                            author: post.created_by || '관리자',
                            date: new Date(post.created_at).toISOString().split('T')[0], // YYYY-MM-DD 형식
                            category: post.category_name || '일반공지',
                            views: 0, // 현재 DB에 조회수 필드가 없으므로 기본값
                            isPinned: post.popup, // popup을 고정 표시로 사용
                        };
                    });

                    setAnnouncements(transformedAnnouncements);
                } else {
                    setAnnouncements([]);
                }
            } catch (err) {
                console.error('공지사항 가져오기 실패:', err);
                setError(err instanceof Error ? err.message : '공지사항을 가져오는데 실패했습니다.');
                setAnnouncements([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, [slug]);

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

    if (announcements.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>공지사항이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 sm:grid sm:grid-cols-2">
            <div className="flex-1 sm:col-span-1">
                <div
                    className="bg-green-50 border border-green-200 rounded-lg p-6 h-full cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => handleAnnouncementClick(announcements[0].id)}
                >
                    <h4 className="text-lg mb-3 text-green-900 hover:text-green-700 transition-colors">
                        {announcements[0].title}
                    </h4>
                    <p className="text-sm text-green-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {announcements[0].content}
                    </p>
                    <div className="flex items-center justify-between text-sm text-green-600">
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
                        className="text-green-600 border-green-600 hover:bg-green-50"
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
                                <h5 className="text-sm text-gray-900 hover:text-green-600 transition-colors leading-tight">
                                    {announcement.title}
                                </h5>
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
