import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

interface Announcement {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string;
}

interface AnnouncementsTabProps {
    announcements: Announcement[];
}

export default function AnnouncementsTab({ announcements }: AnnouncementsTabProps) {
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
            {/* Left Column - Featured Post */}
            <div className="flex-1 sm:col-span-1">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 h-full">
                    <h4 className="text-lg mb-3 text-green-900">{announcements[0].title}</h4>
                    <p className="text-sm text-green-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {announcements[0].content}
                    </p>
                    <div className="flex items-center justify-between text-sm text-green-600">
                        <span>{announcements[0].author}</span>
                        <span>{announcements[0].date}</span>
                    </div>
                </div>
            </div>

            {/* Right Column - List */}
            <div className="flex-1 sm:col-span-1 flex flex-col h-full">
                <div className="flex justify-end mb-3">
                    <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                        + 더보기
                    </Button>
                </div>
                <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden flex-1">
                    {announcements.slice(1, 4).map((announcement, index) => (
                        <div
                            key={announcement.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                                index !== announcements.slice(1, 4).length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                        >
                            <div className="flex-1 pr-3">
                                <h5 className="text-sm text-gray-900 hover:text-green-600 transition-colors cursor-pointer leading-tight">
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
