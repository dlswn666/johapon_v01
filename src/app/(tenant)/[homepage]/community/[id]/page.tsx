'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import BannerAd from '@/widgets/common/BannerAd';
import { Users, ArrowLeft, Calendar, User, Eye, Heart, MessageSquare, Edit, Save, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/community/RichTextEditor';
import { useCommunityDetail, type CommunityDetail, type CommunityUpdateData } from '@/shared/hooks/useCommunityDetail';

export default function TenantCommunityDetailPage() {
    const router = useRouter();

    // 훅에서 데이터와 기능들 가져오기
    const {
        community,
        subcategories,
        loading: isLoading,
        error,
        updateCommunity,
        updating: isSaving,
        refresh,
    } = useCommunityDetail();

    // 수정 모드 관련 상태
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<Partial<CommunityDetail>>({});

    // 수정 모드 변경 시 editData 초기화
    useEffect(() => {
        if (isEditMode && community) {
            setEditData({
                title: community.title,
                content: community.content || '',
                subcategory_id: community.subcategory_id,
            });
        }
    }, [isEditMode, community]);

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
    const getCategoryName = (subcategoryId?: string) => {
        if (!subcategoryId) return '일반토론';
        const subcategory = subcategories.find((sub) => sub.id === subcategoryId);
        return subcategory?.name || '일반토론';
    };

    // 수정 모드 시작
    const handleEditStart = () => {
        if (community) {
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
        if (!community || isSaving) return;

        const updateData: CommunityUpdateData = {
            title: editData.title,
            content: editData.content,
            subcategory_id: editData.subcategory_id,
        };

        const success = await updateCommunity(updateData);

        if (success) {
            setIsEditMode(false);
            setEditData({});
            alert('게시글이 성공적으로 수정되었습니다.');
        }
    };

    // 수정 데이터 변경 핸들러
    const handleEditDataChange = (field: keyof CommunityDetail, value: any) => {
        setEditData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // 좋아요 토글 (임시)
    const handleLikeToggle = () => {
        alert('좋아요 기능은 추후 구현 예정입니다.');
    };

    // 로딩 상태
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">게시글을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 에러 상태
    if (error || !community) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">게시글을 불러올 수 없습니다</h2>
                    <p className="text-gray-600 mb-4">{error || '게시글을 찾을 수 없습니다.'}</p>
                    <Button onClick={() => router.push('../community')} variant="outline">
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
                            onClick={() => router.push('../community')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>목록으로</span>
                        </Button>
                        <div className="border-l border-gray-300 h-6"></div>
                        <div className="flex items-center space-x-3">
                            <Users className="h-6 w-6" />
                            <div>
                                <h1 className="text-2xl lg:text-3xl text-gray-900">
                                    {isEditMode ? '게시글 수정' : '정보공유방 상세보기'}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    {isEditMode
                                        ? '게시글 내용을 수정하실 수 있습니다'
                                        : '게시글 내용을 확인하고 소통하실 수 있습니다'}
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
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>

                    {/* 중앙 콘텐츠 */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{isEditMode ? '게시글 수정' : '게시글 정보'}</span>
                                    {isEditMode ? (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleEditSave}
                                                disabled={isSaving}
                                                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
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
                                                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
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
                                {/* 기본 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 제목 */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">제목</Label>
                                        <Input
                                            id="title"
                                            value={isEditMode ? editData.title || '' : community.title}
                                            readOnly={!isEditMode}
                                            onChange={(e) => handleEditDataChange('title', e.target.value)}
                                            className={`mt-2 ${
                                                isEditMode
                                                    ? 'bg-white border-gray-300 text-gray-900'
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
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
                                                    ? editData.subcategory_id || community.subcategory_id
                                                    : community.subcategory_id
                                            }
                                            disabled={!isEditMode}
                                            onValueChange={(value) => handleEditDataChange('subcategory_id', value)}
                                        >
                                            <SelectTrigger
                                                className={`mt-2 ${
                                                    isEditMode
                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                        : 'bg-gray-50 border-gray-200 text-gray-900'
                                                }`}
                                            >
                                                <SelectValue placeholder={getCategoryName(community.subcategory_id)} />
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

                                    {/* 공개 상태 (임시) */}
                                    <div>
                                        <Label>공개 상태</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Users className="h-4 w-4 text-gray-500" />
                                                <span>전체 공개</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 작성자 및 날짜 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <Label>작성자</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <span>{community.author_name || '익명'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>작성일</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <span>{formatDate(community.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>조회수</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Eye className="h-4 w-4 text-gray-500" />
                                                <span>{community.views?.toLocaleString() || 0}회</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>댓글수</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <MessageSquare className="h-4 w-4 text-gray-500" />
                                                <span>{community.comments?.toLocaleString() || 0}개</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 게시글 내용 */}
                                <div>
                                    <Label>게시글 내용</Label>
                                    <div className="mt-2">
                                        <RichTextEditor
                                            content={
                                                isEditMode
                                                    ? editData.content ?? community.content ?? ''
                                                    : community.content ?? ''
                                            }
                                            onChange={(content) => handleEditDataChange('content', content)}
                                            placeholder="게시글 내용을 입력하세요..."
                                            readonly={!isEditMode}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 좋아요 및 공유 액션 */}
                        {!isEditMode && (
                            <Card>
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <Button
                                                variant="outline"
                                                onClick={handleLikeToggle}
                                                className={`flex items-center space-x-2 ${
                                                    community.isLiked ? 'text-red-600 border-red-200' : 'text-gray-600'
                                                }`}
                                            >
                                                <Heart
                                                    className={`h-4 w-4 ${community.isLiked ? 'fill-current' : ''}`}
                                                />
                                                <span>좋아요 {community.likes?.toLocaleString() || 0}</span>
                                            </Button>
                                            <Button variant="outline" className="flex items-center space-x-2">
                                                <MessageSquare className="h-4 w-4" />
                                                <span>댓글 {community.comments?.toLocaleString() || 0}</span>
                                            </Button>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            조회수 {community.views?.toLocaleString() || 0}회
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* 댓글 섹션 (임시) */}
                        {!isEditMode && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>댓글</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8 text-gray-500">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>댓글 기능은 추후 구현 예정입니다.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* 액션 버튼 */}
                        {!isEditMode && (
                            <div className="flex justify-between gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('../community')}
                                    className="flex items-center space-x-2"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>목록으로 돌아가기</span>
                                </Button>
                            </div>
                        )}

                        {/* 수정 모드일 때는 안내 메시지 표시 */}
                        {isEditMode && (
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle className="h-5 w-5 text-purple-600" />
                                    <p className="text-sm text-purple-800">
                                        수정이 완료되면 <strong>저장하기</strong> 버튼을 클릭하세요. 변경사항을
                                        취소하려면 <strong>취소</strong> 버튼을 클릭하세요.
                                    </p>
                                </div>
                            </div>
                        )}
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
