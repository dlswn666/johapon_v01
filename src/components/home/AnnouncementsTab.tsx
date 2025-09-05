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
                <div
                    className="rounded-lg p-6 h-full"
                    style={{ backgroundColor: 'var(--bg-soft)', border: '1px solid var(--color-border)' }}
                >
                    <h4 className="mb-3" style={{ fontSize: 'var(--fs-h2)', color: 'var(--color-text)' }}>
                        {announcements[0].title}
                    </h4>
                    <p
                        className="mb-4 leading-relaxed line-clamp-3 overflow-hidden"
                        style={{ fontSize: 'var(--fs-body)', color: 'var(--color-text)' }}
                    >
                        {announcements[0].content}
                    </p>
                    <div
                        className="flex items-center justify-between"
                        style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text)' }}
                    >
                        <span>{announcements[0].author}</span>
                        <span>{announcements[0].date}</span>
                    </div>
                </div>
            </div>

            {/* Right Column - List */}
            <div className="flex-1 sm:col-span-1 flex flex-col h-full">
                <div className="flex justify-end mb-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-[color:var(--bg-soft)]"
                        style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                    >
                        + 더보기
                    </Button>
                </div>
                <div
                    className="space-y-0 rounded-lg overflow-hidden flex-1"
                    style={{ border: '1px solid var(--color-border)' }}
                >
                    {announcements.slice(1, 4).map((announcement, index) => (
                        <div
                            key={announcement.id}
                            className={`flex items-center justify-between p-3 transition-colors hover:bg-[color:var(--bg-soft)] ${
                                index !== announcements.slice(1, 4).length - 1 ? 'border-b' : ''
                            }`}
                            style={{ borderColor: 'var(--color-border)' }}
                        >
                            <div className="flex-1 pr-3">
                                <h5
                                    className="transition-colors cursor-pointer leading-tight"
                                    style={{ fontSize: 'var(--fs-small)', color: 'var(--color-text)' }}
                                >
                                    {announcement.title}
                                </h5>
                                <div
                                    className="flex items-center mt-1"
                                    style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}
                                >
                                    <span>{announcement.author}</span>
                                </div>
                            </div>
                            <div
                                className="whitespace-nowrap"
                                style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}
                            >
                                {announcement.date}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
