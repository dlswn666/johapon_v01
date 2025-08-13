'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { MessageSquare } from 'lucide-react';
import type { QnA } from '@/entities/qna/model/types';

interface QnATabProps {
    // props는 제거하고 내부에서 데이터를 가져오도록 변경
}

export default function QnATab({}: QnATabProps) {
    const params = useParams();
    const router = useRouter();
    const slug = params.homepage as string;

    const [qnaList, setQnaList] = useState<QnA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 최신 4개 Q&A 가져오기
    useEffect(() => {
        const fetchQnA = async () => {
            if (!slug) return;

            try {
                setLoading(true);
                const queryParams = new URLSearchParams({
                    page: '1',
                    page_size: '4',
                });

                const response = await fetch(`/api/tenant/${slug}/qna?${queryParams}`);

                if (!response.ok) {
                    throw new Error(`API 호출 실패: ${response.status}`);
                }

                const data = await response.json();

                if (data.success && data.items) {
                    // 데이터베이스 데이터를 QnA 형태로 변환
                    const transformedQnA: QnA[] = data.items.map((qna: any) => {
                        // content가 JSON 형식인지 확인하고 파싱
                        let contentText = qna.content;
                        try {
                            const parsed = JSON.parse(qna.content);
                            if (Array.isArray(parsed)) {
                                // Quill.js 델타 형식인 경우 텍스트만 추출
                                contentText = parsed
                                    .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                                    .join('')
                                    .trim();
                            }
                        } catch {
                            // JSON이 아닌 경우 그대로 사용
                            contentText = qna.content;
                        }

                        // HTML 태그 제거하고 길이 제한
                        contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

                        return {
                            id: parseInt(qna.id) || 0, // QnA 타입에서 id는 number
                            title: qna.title,
                            content: contentText,
                            author: qna.author_id || '익명',
                            date: new Date(qna.created_at).toISOString().split('T')[0], // YYYY-MM-DD 형식
                            status: qna.status === 'answered' ? 'answered' : 'pending',
                            answer: qna.answer || undefined,
                            answerDate: qna.answered_at
                                ? new Date(qna.answered_at).toISOString().split('T')[0]
                                : undefined,
                            author_id: qna.author_id,
                            created_at: qna.created_at,
                            answered_at: qna.answered_at,
                        };
                    });

                    setQnaList(transformedQnA);
                } else {
                    setQnaList([]);
                }
            } catch (err) {
                console.error('Q&A 가져오기 실패:', err);
                setError(err instanceof Error ? err.message : 'Q&A를 가져오는데 실패했습니다.');
                setQnaList([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQnA();
    }, [slug]);

    // 더보기 버튼 클릭 핸들러
    const handleViewMore = () => {
        router.push(`/${slug}/qna`);
    };

    // 개별 Q&A 클릭 핸들러
    const handleQnAClick = (qnaId: number) => {
        router.push(`/${slug}/qna/${qnaId}`);
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300 animate-pulse" />
                <p>Q&A를 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-gray-500 flex-1 flex flex-col justify-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-red-300" />
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

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
            <div className="flex-1 sm:col-span-1">
                <div
                    className="bg-blue-50 border border-blue-200 rounded-lg p-6 h-full cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handleQnAClick(qnaList[0].id)}
                >
                    <h4 className="text-lg mb-3 text-blue-900 hover:text-blue-700 transition-colors">
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
                        <Badge variant={qnaList[0].status === 'answered' ? 'default' : 'secondary'}>
                            {qnaList[0].status === 'answered' ? '답변완료' : '답변대기'}
                        </Badge>
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
                    {qnaList.slice(1, 4).map((qna, index) => (
                        <div
                            key={qna.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                                index !== qnaList.slice(1, 4).length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                            onClick={() => handleQnAClick(qna.id)}
                        >
                            <div className="flex-1 pr-3">
                                <h5 className="text-sm text-gray-900 hover:text-blue-600 transition-colors leading-tight">
                                    {qna.title}
                                </h5>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <span>{qna.author}</span>
                                    <Badge
                                        variant={qna.status === 'answered' ? 'default' : 'secondary'}
                                        className="text-xs ml-2"
                                    >
                                        {qna.status === 'answered' ? '답변완료' : '답변대기'}
                                    </Badge>
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
