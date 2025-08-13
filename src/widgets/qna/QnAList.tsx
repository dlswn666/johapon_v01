'use client';

import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import {
    MessageSquare,
    Plus,
    Calendar,
    User,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Reply,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QnAItem } from '@/entities/qna/model/types';

interface QnAListProps {
    qnas: QnAItem[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    observerRef: (node: HTMLElement | null) => void;
}

export default function QnAList({ qnas, loading, error, hasMore, observerRef }: QnAListProps) {
    const router = useRouter();
    const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);

    const toggleQuestion = (questionId: number) => {
        setExpandedQuestions((prev) =>
            prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'answered':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'answered':
                return '답변완료';
            case 'pending':
                return '답변대기';
            default:
                return '알 수 없음';
        }
    };

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    if (error) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="outline">
                        다시 시도
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!loading && qnas.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg text-gray-900 mb-2">질문이 없습니다</h3>
                    <p className="text-gray-600 mb-4">첫 번째 질문을 남겨보세요.</p>
                    <Button onClick={() => router.push('./qna/new')} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        질문하기
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {qnas.map((question) => (
                <Card key={question.id}>
                    <CardContent className="p-6">
                        <Collapsible
                            open={expandedQuestions.includes(question.id)}
                            onOpenChange={() => toggleQuestion(question.id)}
                        >
                            <CollapsibleTrigger className="w-full">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Badge variant="secondary">{question.category}</Badge>
                                            <Badge className={getStatusColor(question.status)}>
                                                {getStatusText(question.status)}
                                            </Badge>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Calendar className="h-4 w-4 mr-1" />
                                                {formatDate(question.date)}
                                            </div>
                                        </div>
                                        <h3 className="text-lg text-gray-900 mb-2">{question.title}</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <User className="h-4 w-4 mr-1" />
                                                {question.author}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <MessageSquare className="h-4 w-4 mr-1" />
                                                {question.views} 조회
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        {expandedQuestions.includes(question.id) ? (
                                            <ChevronUp className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="mt-4">
                                <div className="space-y-4">
                                    {/* Question Content */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <MessageSquare className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm text-blue-600">질문</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">{question.content}</p>
                                    </div>

                                    {/* Answer */}
                                    {question.answer ? (
                                        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <Reply className="h-4 w-4 text-green-600" />
                                                    <span className="text-sm text-green-600">답변</span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {question.answeredBy} ·{' '}
                                                    {question.answeredDate && formatDate(question.answeredDate)}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{question.answer}</p>
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                                            <div className="flex items-center space-x-2">
                                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                                <span className="text-sm text-yellow-600">
                                                    아직 답변이 등록되지 않았습니다. 빠른 시일 내에 답변드리겠습니다.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </CardContent>
                </Card>
            ))}

            {/* Loading indicator for infinite scroll */}
            {loading && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">질문을 불러오는 중...</p>
                    </CardContent>
                </Card>
            )}

            {/* Infinite scroll observer */}
            {hasMore && <div ref={observerRef} className="h-4" />}
        </div>
    );
}

