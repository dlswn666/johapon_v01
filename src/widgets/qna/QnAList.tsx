'use client';

import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Eye, MessageCircle, Lock, CheckCircle, Clock, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { QnAItem } from '@/entities/qna/model/types';

interface QnAListProps {
    qnaList: QnAItem[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    observerRef: (node: HTMLElement | null) => void;
}

export default function QnAList({ qnaList, loading, error, hasMore, observerRef }: QnAListProps) {
    const params = useParams();
    const homepage = params?.homepage as string;

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return '오늘';
        } else if (diffDays === 2) {
            return '어제';
        } else if (diffDays <= 7) {
            return `${diffDays - 1}일 전`;
        } else {
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
    };

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center py-8">
                        <p className="text-red-600 mb-2">오류가 발생했습니다</p>
                        <p className="text-gray-600 text-sm">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {qnaList.length === 0 && !loading ? (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center py-12">
                            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 등록된 Q&A가 없습니다</h3>
                            <p className="text-gray-600 mb-4">
                                궁금한 점이나 문의사항이 있으시면 언제든지 질문을 남겨주세요.
                            </p>
                            <Link
                                href={`/${homepage}/qna/new`}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />첫 질문 작성하기
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {qnaList.map((qna, index) => (
                        <Card key={qna.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {qna.isSecret && (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Lock className="h-3 w-3 mr-1" />
                                                    비밀글
                                                </Badge>
                                            )}

                                            {qna.isAnswered ? (
                                                <Badge variant="default" className="bg-green-600 text-xs">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    답변완료
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-orange-600 text-white text-xs">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    답변대기
                                                </Badge>
                                            )}

                                            <Badge variant="outline" className="text-xs">
                                                {qna.category}
                                            </Badge>
                                        </div>

                                        <Link href={`/${homepage}/qna/${qna.id}`} className="block group">
                                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                                                {qna.title}
                                            </h3>
                                            <p className="text-gray-600 text-sm line-clamp-2 mb-3">{qna.content}</p>
                                        </Link>

                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-1">
                                                    <User className="h-4 w-4" />
                                                    <span>{qna.author}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{formatDate(qna.date)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-1">
                                                    <Eye className="h-4 w-4" />
                                                    <span>{qna.views.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* 무한 스크롤 로딩 트리거 */}
                    {hasMore && (
                        <div ref={observerRef} className="h-20 flex items-center justify-center">
                            {loading && (
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <span>더 많은 Q&A를 불러오는 중...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 로딩 중이지만 첫 페이지가 아닌 경우 */}
                    {loading && qnaList.length === 0 && (
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Q&A를 불러오는 중...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 더 이상 불러올 데이터가 없는 경우 */}
                    {!hasMore && qnaList.length > 0 && (
                        <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">모든 Q&A를 확인했습니다.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
