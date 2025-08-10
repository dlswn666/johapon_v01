import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface CommunityPost {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string;
}

interface CommunityTabProps {
    communityPosts: CommunityPost[];
}

export default function CommunityTab({ communityPosts }: CommunityTabProps) {
    if (communityPosts.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>정보공유방 게시글이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 sm:grid sm:grid-cols-2">
            {/* Left Column - Featured Post */}
            <div className="flex-1 sm:col-span-1">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 h-full">
                    <h4 className="text-lg mb-3 text-purple-900">
                        {communityPosts[0].title}
                    </h4>
                    <p className="text-sm text-purple-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {communityPosts[0].content}
                    </p>
                    <div className="flex items-center justify-between text-sm text-purple-600">
                        <span>{communityPosts[0].author}</span>
                        <span>{communityPosts[0].date}</span>
                    </div>
                </div>
            </div>

            {/* Right Column - List */}
            <div className="flex-1 sm:col-span-1 flex flex-col h-full">
                <div className="flex justify-end mb-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                    >
                        + 더보기
                    </Button>
                </div>
                <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden flex-1">
                    {communityPosts.slice(1, 4).map((post, index) => (
                        <div
                            key={post.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                                index !== communityPosts.slice(1, 4).length - 1
                                    ? 'border-b border-gray-100'
                                    : ''
                            }`}
                        >
                            <div className="flex-1 pr-3">
                                <h5 className="text-sm text-gray-900 hover:text-purple-600 transition-colors cursor-pointer leading-tight">
                                    {post.title}
                                </h5>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <span>{post.author}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                                {post.date}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 