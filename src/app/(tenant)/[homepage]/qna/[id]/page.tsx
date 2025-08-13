'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import BannerAd from '@/widgets/common/BannerAd';
import { ArrowLeft, FileText, Calendar, User, Eye, AlertCircle, HelpCircle, Reply } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import type { QnADbItem } from '@/entities/qna/model/types';

export default function TenantQnADetailPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;
    const qnaId = params?.id as string;

    const [qna, setQna] = useState<QnADbItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const categories = [
        { value: '일반문의', label: '일반문의' },
        { value: '임시거주지', label: '임시거주지' },
        { value: '조합비', label: '조합비' },
        { value: '설계변경', label: '설계변경' },
        { value: '분양가격', label: '분양가격' },
    ];

    // Q&A 데이터 가져오기
    useEffect(() => {
        const fetchQnA = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(`/api/tenant/${homepage}/qna/${qnaId}`);

                if (response.ok) {
                    const data = await response.json();
                    if (data.success !== false) {
                        setQna(data);
                    } else {
                        throw new Error(data.message || 'Q&A를 찾을 수 없습니다.');
                    }
                } else {
                    throw new Error('Q&A를 불러오는데 실패했습니다.');
                }
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
                setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        if (homepage && qnaId) {
            fetchQnA();
        }
    }, [homepage, qnaId]);

    // 날짜 포맷팅
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
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

    // 로딩 상태
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Q&A를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 에러 상태
    if (error || !qna) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Q&A를 불러올 수 없습니다</h2>
                    <p className="text-gray-600 mb-4">{error || 'Q&A를 찾을 수 없습니다.'}</p>
                    <Button onClick={() => router.push('../qna')} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        목록으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 페이지 헤더 */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('../qna')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>목록으로</span>
                        </Button>
                        <div className="border-l border-gray-300 h-6"></div>
                        <div className="flex items-center space-x-3">
                            <HelpCircle className="h-6 w-6" />
                            <div>
                                <h1 className="text-2xl lg:text-3xl text-gray-900">Q&A 상세보기</h1>
                                <p className="text-gray-600 mt-1">질문과 답변을 확인하실 수 있습니다</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* 왼쪽 사이드바 - 배너 */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>

                    {/* 중앙 콘텐츠 */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <HelpCircle className="h-5 w-5" />
                                        <span>질문 정보</span>
                                    </div>
                                    <Badge className={getStatusColor(qna.status)}>{getStatusText(qna.status)}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* 기본 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 제목 */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">질문 제목</Label>
                                        <Input
                                            id="title"
                                            value={qna.title}
                                            readOnly
                                            className="mt-2 bg-gray-50 border-gray-200 text-gray-900"
                                        />
                                    </div>

                                    {/* 카테고리 */}
                                    <div>
                                        <Label>카테고리</Label>
                                        <Select value="일반문의" disabled>
                                            <SelectTrigger className="mt-2 bg-gray-50 border-gray-200 text-gray-900">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.value} value={category.value}>
                                                        {category.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* 작성자 */}
                                    <div>
                                        <Label>작성자</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <span>{qna.author_id || '조합원'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 작성일 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>작성일</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <span>{formatDate(qna.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>조회수</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Eye className="h-4 w-4 text-gray-500" />
                                                <span>0회</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 질문 내용 */}
                                <div>
                                    <Label>질문 내용</Label>
                                    <div className="mt-2 border rounded-lg overflow-hidden">
                                        <div
                                            className="min-h-[200px] p-6 bg-white text-gray-800 leading-relaxed prose prose-slate max-w-none"
                                            style={{
                                                lineHeight: '1.7',
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: qna.content || '<p class="text-gray-500">내용이 없습니다.</p>',
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 답변 */}
                                {qna.answer ? (
                                    <div>
                                        <Label className="flex items-center space-x-2">
                                            <Reply className="h-4 w-4 text-green-600" />
                                            <span>답변</span>
                                        </Label>
                                        <div className="mt-2 border rounded-lg overflow-hidden border-green-200">
                                            <div className="bg-green-50 p-4 border-b border-green-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <User className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm font-medium text-green-800">
                                                            관리자
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-green-600">
                                                        {qna.answered_at && formatDate(qna.answered_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className="min-h-[150px] p-6 bg-white text-gray-800 leading-relaxed prose prose-slate max-w-none"
                                                style={{
                                                    lineHeight: '1.7',
                                                }}
                                                dangerouslySetInnerHTML={{
                                                    __html:
                                                        qna.answer || '<p class="text-gray-500">답변이 없습니다.</p>',
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                        <div className="flex items-center space-x-2">
                                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                                            <div>
                                                <p className="text-sm font-medium text-yellow-800">답변 대기 중</p>
                                                <p className="text-sm text-yellow-600">
                                                    아직 답변이 등록되지 않았습니다. 빠른 시일 내에 답변드리겠습니다.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 액션 버튼 */}
                        <div className="flex justify-between gap-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push('../qna')}
                                className="flex items-center space-x-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>목록으로 돌아가기</span>
                            </Button>
                        </div>
                    </div>

                    {/* 오른쪽 사이드바 - 배너 */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>
                </div>
            </div>
        </div>
    );
}

