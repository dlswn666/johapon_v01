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
                <HelpCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Q&A를 불러올 수 없습니다</p>
                <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
        );
    }

    if (!qnaList || qnaList.length === 0) {
        return (
            <div className="text-center p-6">
                <HelpCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">등록된 Q&A가 없습니다</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {qnaList.slice(0, 4).map((qna: QnAItem, index: number) => (
                <div
                    key={qna.id}
                    className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => router.push(`/${slug}/qna/${qna.id}`)}
                >
                    <div className="flex-shrink-0 mt-1">
                        {qna.isAnswered ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                            <Clock className="h-4 w-4 text-orange-500" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{qna.title}</h4>
                            {qna.isSecret && (
                                <Badge variant="secondary" className="text-xs">
                                    비밀
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{qna.date}</span>
                            <span>•</span>
                            <span>조회 {qna.views}</span>
                            <span>•</span>
                            {qna.isAnswered ? (
                                <span className="text-green-600">답변완료</span>
                            ) : (
                                <span className="text-orange-600">답변대기</span>
                            )}
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
            ))}

            <div className="pt-3 border-t">
                <Button variant="outline" className="w-full" onClick={() => router.push(`/${slug}/qna`)}>
                    모든 Q&A 보기
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
