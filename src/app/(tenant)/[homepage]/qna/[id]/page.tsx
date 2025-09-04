'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import SideBannerAds from '@/widgets/common/SideBannerAds';
import {
    HelpCircle,
    ArrowLeft,
    Calendar,
    User,
    Eye,
    MessageCircle,
    AlertCircle,
    Edit,
    Save,
    X,
    Lock,
    CheckCircle,
    Clock,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import TiptapEditor from '@/components/community/TiptapEditor';
import { useQnAStore } from '@/shared/store/qnaStore';
import type { QnAUpdateData, QnAAnswerData } from '@/entities/qna/model/types';

export default function TenantQnADetailPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;
    const id = params?.id as string;

    // Store 사용
    const {
        currentQnA: qna,
        subcategories,
        loading,
        error,
        fetchQnADetail,
        fetchMetadata,
        updateQnA,
        answerQnA,
        resetState,
    } = useQnAStore();

    // 수정 모드 관련 상태
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<Partial<QnAUpdateData>>({});
    const [isSaving, setIsSaving] = useState(false);

    // 답변 모드 관련 상태
    const [isAnswerMode, setIsAnswerMode] = useState(false);
    const [answerData, setAnswerData] = useState<QnAAnswerData>({ answer_content: '' });
    const [isAnswering, setIsAnswering] = useState(false);

    // 데이터 로드
    useEffect(() => {
        if (homepage && id) {
            resetState();
            Promise.all([fetchQnADetail(homepage, id), fetchMetadata(homepage)]).catch((error) => {
                console.error('데이터 로딩 실패:', error);
            });
        }

        return () => {
            resetState();
        };
    }, [homepage, id, fetchQnADetail, fetchMetadata, resetState]);

    // 수정 모드 변경 시 editData 초기화
    useEffect(() => {
        if (isEditMode && qna) {
            setEditData({
                title: qna?.title,
                content: qna?.content || '',
                subcategory_id: qna?.subcategory_id,
                is_secret: qna?.isSecret,
            });
        }
    }, [isEditMode, qna]);

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

    // 카테고리 이름 찾기
    const getCategoryName = (subcategoryId: string) => {
        const subcategory = subcategories.find((sub) => sub.id === subcategoryId);
        return subcategory?.name || 'Q&A';
    };

    // 수정 모드 시작
    const handleEditStart = () => {
        if (qna) {
            setIsEditMode(true);
        }
    };

    // 수정 취소
    const handleEditCancel = () => {
        setIsEditMode(false);
        setEditData({});
    };

    // 수정 저장
    const handleEditSave = async () => {
        if (!qna || isSaving || !homepage) return;

        try {
            setIsSaving(true);

            const result = await updateQnA(homepage, qna?.id, editData);

            if (result.success) {
                setIsEditMode(false);
                setEditData({});
                alert('Q&A가 성공적으로 수정되었습니다.');
                // 수정 후 데이터 다시 로드
                await fetchQnADetail(homepage, qna?.id);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Q&A 수정 실패:', error);
            alert('수정 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // 답변 모드 시작
    const handleAnswerStart = () => {
        setIsAnswerMode(true);
        setAnswerData({ answer_content: qna?.answerContent || '' });
    };

    // 답변 취소
    const handleAnswerCancel = () => {
        setIsAnswerMode(false);
        setAnswerData({ answer_content: '' });
    };

    // 답변 저장
    const handleAnswerSave = async () => {
        if (!qna || isAnswering || !homepage || !answerData.answer_content.trim()) return;

        try {
            setIsAnswering(true);

            const result = await answerQnA(homepage, qna?.id, answerData);

            if (result.success) {
                setIsAnswerMode(false);
                setAnswerData({ answer_content: '' });
                alert('답변이 성공적으로 등록되었습니다.');
                // 답변 후 데이터 다시 로드
                await fetchQnADetail(homepage, qna?.id);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('답변 등록 실패:', error);
            alert('답변 등록 중 오류가 발생했습니다.');
        } finally {
            setIsAnswering(false);
        }
    };

    // 수정 데이터 변경 핸들러
    const handleEditDataChange = (field: keyof QnAUpdateData, value: any) => {
        setEditData((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

    // 로딩 상태: 초기 렌더에서 데이터가 없을 때도 로딩 UI 표시하여 깜빡임 방지
    if (loading || (!qna && !error)) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Q&A를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
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
                                <h1 className="text-2xl lg:text-3xl text-gray-900">
                                    {isEditMode ? 'Q&A 수정' : 'Q&A 상세보기'}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    {isEditMode ? 'Q&A 내용을 수정하실 수 있습니다' : 'Q&A 내용을 확인하실 수 있습니다'}
                                </p>
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
                        <SideBannerAds sticky />
                    </div>

                    {/* 중앙 콘텐츠 */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{isEditMode ? 'Q&A 수정' : 'Q&A 정보'}</span>
                                    {isEditMode ? (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleEditSave}
                                                disabled={isSaving}
                                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                                                size="sm"
                                            >
                                                <Save className="h-4 w-4" />
                                                <span>{isSaving ? '저장 중...' : '저장하기'}</span>
                                            </Button>
                                            <Button
                                                onClick={handleEditCancel}
                                                disabled={isSaving}
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center space-x-2"
                                            >
                                                <X className="h-4 w-4" />
                                                <span>취소</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleEditStart}
                                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                                                size="sm"
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span>수정하기</span>
                                            </Button>
                                        </div>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* 상태 배지 */}
                                <div className="flex items-center gap-2">
                                    {qna?.isSecret && (
                                        <Badge variant="secondary">
                                            <Lock className="h-3 w-3 mr-1" />
                                            비밀글
                                        </Badge>
                                    )}

                                    {qna?.isAnswered ? (
                                        <Badge variant="default" className="bg-green-600">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            답변완료
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-orange-600 text-white">
                                            <Clock className="h-3 w-3 mr-1" />
                                            답변대기
                                        </Badge>
                                    )}

                                    <Badge variant="outline">{getCategoryName(qna?.subcategory_id || '')}</Badge>
                                </div>

                                {/* 기본 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 제목 */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">제목</Label>
                                        <Input
                                            id="title"
                                            value={isEditMode ? editData.title || '' : qna?.title}
                                            readOnly={!isEditMode}
                                            onChange={(e) => handleEditDataChange('title', e.target.value)}
                                            className={`mt-2 ${
                                                isEditMode
                                                    ? 'bg-white border-gray-300 text-gray-900'
                                                    : 'bg-white border-gray-200 text-gray-900'
                                            }`}
                                            placeholder={isEditMode ? '제목을 입력하세요' : ''}
                                        />
                                    </div>

                                    {/* 카테고리 */}
                                    <div>
                                        <Label>카테고리</Label>
                                        <Select
                                            value={
                                                isEditMode
                                                    ? editData.subcategory_id || qna?.subcategory_id
                                                    : qna?.subcategory_id || ''
                                            }
                                            disabled={!isEditMode}
                                            onValueChange={(value) => handleEditDataChange('subcategory_id', value)}
                                        >
                                            <SelectTrigger
                                                className={`mt-2 ${
                                                    isEditMode
                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                        : 'bg-white border-gray-200 text-gray-900'
                                                }`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subcategories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* 비밀글 여부 */}
                                    {isEditMode ? (
                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="flex items-center space-x-3">
                                                <Lock className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <Label className="text-base text-blue-800">비밀글로 작성</Label>
                                                    <p className="text-sm text-blue-600">
                                                        비밀글로 설정하면 작성자와 관리자만 볼 수 있습니다
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={editData.is_secret ?? qna?.isSecret}
                                                onCheckedChange={(c: boolean) => handleEditDataChange('is_secret', c)}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                {/* 작성자 및 날짜 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label>작성자</Label>
                                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <span>{qna?.author_name || qna?.author}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>작성일</Label>
                                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <span>{qna?.created_at ? formatDate(qna.created_at) : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>조회수</Label>
                                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Eye className="h-4 w-4 text-gray-500" />
                                                <span>{qna?.views?.toLocaleString() || 0}회</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 내용 */}
                                <div>
                                    <Label>내용</Label>
                                    <div className="mt-2">
                                        <TiptapEditor
                                            content={
                                                isEditMode ? editData.content ?? qna?.content ?? '' : qna?.content ?? ''
                                            }
                                            onChange={(content) => handleEditDataChange('content', content)}
                                            placeholder="Q&A 내용을 입력하세요..."
                                            readonly={!isEditMode}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 답변 섹션 */}
                        {qna?.isAnswered || isAnswerMode ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <MessageCircle className="h-5 w-5" />
                                            <span>관리자 답변</span>
                                        </div>
                                        {!isAnswerMode && (
                                            <Button
                                                onClick={handleAnswerStart}
                                                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                                                size="sm"
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span>답변 수정</span>
                                            </Button>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isAnswerMode ? (
                                        <div className="space-y-4">
                                            <TiptapEditor
                                                content={answerData.answer_content}
                                                onChange={(content) => setAnswerData({ answer_content: content })}
                                                placeholder="답변 내용을 입력하세요..."
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    onClick={handleAnswerCancel}
                                                    variant="outline"
                                                    disabled={isAnswering}
                                                >
                                                    취소
                                                </Button>
                                                <Button
                                                    onClick={handleAnswerSave}
                                                    disabled={isAnswering || !answerData.answer_content.trim()}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {isAnswering ? '등록 중...' : '답변 등록'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <TiptapEditor
                                                content={qna?.answerContent || ''}
                                                onChange={() => {}}
                                                readonly={true}
                                            />
                                            {qna?.answeredAt && (
                                                <div className="mt-4 text-sm text-gray-500">
                                                    답변일: {qna?.answeredAt ? formatDate(qna.answeredAt) : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-center py-8">
                                        <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">답변 대기 중</h3>
                                        <p className="text-gray-600 mb-4">
                                            관리자가 확인 후 빠른 시일 내에 답변을 드리겠습니다.
                                        </p>
                                        <Button onClick={handleAnswerStart} className="bg-green-600 hover:bg-green-700">
                                            <MessageCircle className="h-4 w-4 mr-2" />
                                            답변 작성하기
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* 액션 버튼 */}
                        {!isEditMode && !isAnswerMode && (
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
                        )}
                    </div>

                    {/* 오른쪽 사이드바 - 배너 */}
                    <div className="lg:col-span-1 space-y-6">
                        <SideBannerAds sticky />
                    </div>
                </div>
            </div>
        </div>
    );
}
