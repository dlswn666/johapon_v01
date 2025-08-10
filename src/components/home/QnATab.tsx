import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

interface QnA {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string;
    status: 'answered' | 'pending';
}

interface QnATabProps {
    qnaList: QnA[];
}

export default function QnATab({ qnaList }: QnATabProps) {
    if (qnaList.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Q&A가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 sm:grid sm:grid-cols-2">
            {/* Left Column - Featured Post */}
            <div className="flex-1 sm:col-span-1">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 h-full">
                    <h4 className="text-lg mb-3 text-blue-900">
                        {qnaList[0].title}
                    </h4>
                    <p className="text-sm text-blue-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {qnaList[0].content}
                    </p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-blue-600">
                            <span>{qnaList[0].author}</span>
                            <span className="mx-2">•</span>
                            <span>{qnaList[0].date}</span>
                        </div>
                        <Badge
                            variant={
                                qnaList[0].status === 'answered'
                                    ? 'default'
                                    : 'secondary'
                            }
                        >
                            {qnaList[0].status === 'answered'
                                ? '답변완료'
                                : '답변대기'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Right Column - List */}
            <div className="flex-1 sm:col-span-1 flex flex-col h-full">
                <div className="flex justify-end mb-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                        + 더보기
                    </Button>
                </div>
                <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden flex-1">
                    {qnaList.slice(1, 4).map((qna, index) => (
                        <div
                            key={qna.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                                index !== qnaList.slice(1, 4).length - 1
                                    ? 'border-b border-gray-100'
                                    : ''
                            }`}
                        >
                            <div className="flex-1 pr-3">
                                <h5 className="text-sm text-gray-900 hover:text-blue-600 transition-colors cursor-pointer leading-tight">
                                    {qna.title}
                                </h5>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <span>{qna.author}</span>
                                    <Badge
                                        variant={
                                            qna.status === 'answered'
                                                ? 'default'
                                                : 'secondary'
                                        }
                                        className="text-xs ml-2"
                                    >
                                        {qna.status === 'answered'
                                            ? '답변완료'
                                            : '답변대기'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                                {qna.date}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 