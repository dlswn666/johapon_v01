'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { HelpCircle, Calendar, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useQnAStore } from '@/shared/store/qnaStore';
import type { QnAItem } from '@/entities/qna/model/types';

interface QnATabProps {
    // props는 제거하고 내부에서 데이터를 가져오도록 변경
}

export default function QnATab({}: QnATabProps) {
    const params = useParams();
    const router = useRouter();
    const slug = params.homepage as string;

    // useQnAStore를 사용하여 최신 4개 Q&A 가져오기
    const { qnaList, loading, error, fetchQnAList, resetState } = useQnAStore();

    useEffect(() => {
        if (slug) {
            // 페이지 크기를 4로 설정하여 최신 4개만 가져오기
            const currentState = useQnAStore.getState();
            currentState.pageSize = 4;
            fetchQnAList(slug, true).catch(console.error);
        }

        return () => {
            resetState();
        };
    }, [slug, fetchQnAList, resetState]);

    // 더보기 버튼 클릭 핸들러
    const handleViewMore = () => {
        router.push(`/${slug}/qna`);
    };

    // 개별 Q&A 클릭 핸들러
    const handleQnAClick = (qnaId: string) => {
        router.push(`/${slug}/qna/${qnaId}`);
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 text-gray-300 animate-pulse" />
                <p>Q&A를 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 text-red-300" />
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!qnaList || qnaList.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>등록된 Q&A가 없습니다</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 sm:grid sm:grid-cols-2">
            <div className="flex-1 sm:col-span-1">
                <div
                    className="bg-orange-50 border border-orange-200 rounded-lg p-6 h-full cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => handleQnAClick(qnaList[0].id)}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-lg text-orange-900 hover:text-orange-700 transition-colors">
                            {qnaList[0].title}
                        </h4>
                        {qnaList[0].isSecret && (
                            <Badge variant="secondary" className="text-xs">
                                비밀
                            </Badge>
                        )}
                        {qnaList[0].isAnswered ? (
                            <Badge variant="default" className="bg-green-600 text-xs">
                                답변완료
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-orange-600 text-white text-xs">
                                답변대기
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-orange-700 mb-4 leading-relaxed line-clamp-3 overflow-hidden">
                        {qnaList[0].content}
                    </p>
                    <div className="flex items-center justify-between text-sm text-orange-600">
                        <span>{qnaList[0].author}</span>
                        <span>{qnaList[0].date}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 sm:col-span-1 flex flex-col h-full">
                <div className="flex justify-end mb-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        onClick={handleViewMore}
                    >
                        + 더보기
                    </Button>
                </div>
                <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden flex-1">
                    {qnaList.slice(1, 4).map((qna, index) => (
                        <div
                            key={qna.id}
                            className={`flex items-center justify-between p-3 hover:bg-blue-50 transition-colors cursor-pointer ${
                                index !== qnaList.slice(1, 4).length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                            onClick={() => handleQnAClick(qna.id)}
                        >
                            <div className="flex-1 pr-3">
                                <div className="flex items-center gap-2">
                                    <h5 className="text-sm text-gray-900 hover:text-orange-600 transition-colors leading-tight">
                                        {qna.title}
                                    </h5>
                                    {qna.isSecret && (
                                        <Badge variant="secondary" className="text-xs">
                                            비밀
                                        </Badge>
                                    )}
                                    {qna.isAnswered ? (
                                        <Badge variant="default" className="bg-green-600 text-xs">
                                            답변완료
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-orange-600 text-white text-xs">
                                            답변대기
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <span>{qna.author}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">{qna.date}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
