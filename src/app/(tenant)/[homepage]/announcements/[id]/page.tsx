'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import BannerAd from '@/widgets/common/BannerAd';
import {
    FileText,
    ArrowLeft,
    Calendar,
    User,
    Eye,
    Send,
    AlertCircle,
    Edit,
    Save,
    X,
    Pin,
    Star,
    AlertTriangle,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import RichTextEditor from '@/components/community/RichTextEditor';
import { useAnnouncementStore } from '@/shared/store/announcementStore';
import type { AnnouncementUpdateData } from '@/entities/announcement/model/types';

export default function TenantAnnouncementDetailPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;
    const id = params?.id as string;

    // Store 사용
    const {
        currentAnnouncement: announcement,
        subcategories,
        loading,
        error,
        fetchAnnouncementDetail,
        fetchMetadata,
        updateAnnouncement,
        resetState,
    } = useAnnouncementStore();

    // 수정 모드 관련 상태
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<Partial<AnnouncementUpdateData>>({});
    const [isSaving, setIsSaving] = useState(false);

    // 데이터 로드
    useEffect(() => {
        if (homepage && id) {
            resetState();
            Promise.all([fetchAnnouncementDetail(homepage, id), fetchMetadata(homepage)]).catch((error) => {
                console.error('데이터 로딩 실패:', error);
            });
        }

        return () => {
            resetState();
        };
    }, [homepage, id, fetchAnnouncementDetail, fetchMetadata, resetState]);

    // 수정 모드 변경 시 editData 초기화
    useEffect(() => {
        if (isEditMode && announcement) {
            setEditData({
                title: announcement.title,
                content: announcement.content || '',
                subcategory_id: announcement.subcategory_id,
                popup: announcement.popup,
                priority: announcement.priority,
                is_urgent: announcement.isUrgent,
                is_pinned: announcement.isPinned,
                published_at: announcement.publishedAt,
                expires_at: announcement.expiresAt,
            });
        }
    }, [isEditMode, announcement]);

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
        return subcategory?.name || '일반공지';
    };

    // 수정 모드 시작
    const handleEditStart = () => {
        if (announcement) {
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
        if (!announcement || isSaving || !homepage) return;

        try {
            setIsSaving(true);

            const result = await updateAnnouncement(homepage, announcement.id, editData);

            if (result.success) {
                setIsEditMode(false);
                setEditData({});
                alert('공지사항이 성공적으로 수정되었습니다.');
                // 수정 후 데이터 다시 로드
                await fetchAnnouncementDetail(homepage, announcement.id);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('공지사항 수정 실패:', error);
            alert('수정 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // 수정 데이터 변경 핸들러
    const handleEditDataChange = (field: keyof AnnouncementUpdateData, value: any) => {
        setEditData((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

    // 로딩 상태
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">공지사항을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 에러 상태
    if (error || !announcement) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">공지사항을 불러올 수 없습니다</h2>
                    <p className="text-gray-600 mb-4">{error || '공지사항을 찾을 수 없습니다.'}</p>
                    <Button onClick={() => router.push('../announcements')} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        목록으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    const popupOptions = [
        { value: 'false', label: '일반 공지' },
        { value: 'true', label: '팝업 공지' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 페이지 헤더 */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('../announcements')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>목록으로</span>
                        </Button>
                        <div className="border-l border-gray-300 h-6"></div>
                        <div className="flex items-center space-x-3">
                            <FileText className="h-6 w-6" />
                            <div>
                                <h1 className="text-2xl lg:text-3xl text-gray-900">
                                    {isEditMode ? '공지사항 수정' : '공지사항 상세보기'}
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    {isEditMode
                                        ? '공지사항 내용을 수정하실 수 있습니다'
                                        : '공지사항 내용을 확인하실 수 있습니다'}
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
                                    <span>{isEditMode ? '공지사항 수정' : '공지사항 정보'}</span>
                                    {isEditMode ? (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleEditSave}
                                                disabled={isSaving}
                                                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
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
                                            value={isEditMode ? editData.title || '' : announcement.title}
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
                                                    ? editData.subcategory_id || announcement.subcategory_id
                                                    : announcement.subcategory_id
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

                                    {/* 공지 유형 */}
                                    <div>
                                        <Label>공지 유형</Label>
                                        <Select
                                            value={String(
                                                isEditMode ? editData.popup ?? announcement.popup : announcement.popup
                                            )}
                                            disabled={!isEditMode}
                                            onValueChange={(value) => handleEditDataChange('popup', value === 'true')}
                                        >
                                            <SelectTrigger
                                                className={`mt-2 ${
                                                    isEditMode
                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                        : 'bg-gray-50 border-gray-200 text-gray-900'
                                                }`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {popupOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>우선순위</Label>
                                        <Select
                                            value={String(
                                                isEditMode
                                                    ? editData.priority ?? announcement.priority
                                                    : announcement.priority
                                            )}
                                            disabled={!isEditMode}
                                            onValueChange={(value) => handleEditDataChange('priority', parseInt(value))}
                                        >
                                            <SelectTrigger
                                                className={`mt-2 ${
                                                    isEditMode
                                                        ? 'bg-white border-gray-300 text-gray-900'
                                                        : 'bg-gray-50 border-gray-200 text-gray-900'
                                                }`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">일반 (0)</SelectItem>
                                                <SelectItem value="1">중요 (1)</SelectItem>
                                                <SelectItem value="2">매우 중요 (2)</SelectItem>
                                                <SelectItem value="3">최우선 (3)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>게시 시작일</Label>
                                        <Input
                                            type="datetime-local"
                                            value={
                                                isEditMode
                                                    ? editData.published_at ?? announcement.publishedAt ?? ''
                                                    : announcement.publishedAt ?? ''
                                            }
                                            readOnly={!isEditMode}
                                            onChange={(e) =>
                                                handleEditDataChange('published_at', e.target.value || null)
                                            }
                                            className={`mt-2 ${
                                                isEditMode
                                                    ? 'bg-white border-gray-300 text-gray-900'
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                            }`}
                                        />
                                    </div>

                                    <div>
                                        <Label>게시 종료일</Label>
                                        <Input
                                            type="datetime-local"
                                            value={
                                                isEditMode
                                                    ? editData.expires_at ?? announcement.expiresAt ?? ''
                                                    : announcement.expiresAt ?? ''
                                            }
                                            readOnly={!isEditMode}
                                            onChange={(e) => handleEditDataChange('expires_at', e.target.value || null)}
                                            className={`mt-2 ${
                                                isEditMode
                                                    ? 'bg-white border-gray-300 text-gray-900'
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* 특별 옵션 상태 표시 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {isEditMode ? (
                                        <>
                                            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                                <div className="flex items-center space-x-3">
                                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                                    <div>
                                                        <Label className="text-base text-yellow-800">
                                                            긴급 공지사항
                                                        </Label>
                                                        <p className="text-sm text-yellow-600">
                                                            긴급 공지사항으로 설정하면 목록에서 강조 표시됩니다
                                                        </p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={editData.is_urgent ?? announcement.isUrgent}
                                                    onCheckedChange={(c: boolean) =>
                                                        handleEditDataChange('is_urgent', c)
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="flex items-center space-x-3">
                                                    <Pin className="h-5 w-5 text-blue-600" />
                                                    <div>
                                                        <Label className="text-base text-blue-800">상단 고정</Label>
                                                        <p className="text-sm text-blue-600">
                                                            목록 상단에 항상 고정되어 표시됩니다
                                                        </p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={editData.is_pinned ?? announcement.isPinned}
                                                    onCheckedChange={(c: boolean) =>
                                                        handleEditDataChange('is_pinned', c)
                                                    }
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {announcement.isUrgent && (
                                                <div className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                                                    <Badge variant="destructive" className="bg-yellow-600">
                                                        긴급 공지
                                                    </Badge>
                                                </div>
                                            )}
                                            {announcement.isPinned && (
                                                <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <Pin className="h-5 w-5 text-blue-600 mr-2" />
                                                    <Badge variant="secondary" className="bg-blue-600 text-white">
                                                        상단 고정
                                                    </Badge>
                                                </div>
                                            )}
                                            {announcement.priority > 0 && (
                                                <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                                    <Star className="h-5 w-5 text-green-600 mr-2" />
                                                    <Badge
                                                        variant="outline"
                                                        className="border-green-600 text-green-600"
                                                    >
                                                        우선순위 {announcement.priority}
                                                    </Badge>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* 작성자 및 날짜 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label>작성자</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <span>{announcement.author_name || '관리자'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>작성일</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <span>{formatDate(announcement.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>조회수</Label>
                                        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Eye className="h-4 w-4 text-gray-500" />
                                                <span>{announcement.views?.toLocaleString() || 0}회</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 알림톡 발송 상태 */}
                                {announcement.alrimtalkSent && (
                                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center space-x-3">
                                            <AlertCircle className="h-5 w-5 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium text-green-800">알림톡 발송됨</p>
                                                <p className="text-sm text-green-600">
                                                    이 공지사항은 조합원들에게 알림톡으로 발송되었습니다.
                                                </p>
                                            </div>
                                        </div>
                                        <Send className="h-5 w-5 text-green-600" />
                                    </div>
                                )}

                                {/* 내용 */}
                                <div>
                                    <Label>내용</Label>
                                    <div className="mt-2">
                                        <RichTextEditor
                                            content={
                                                isEditMode
                                                    ? editData.content ?? announcement.content ?? '111'
                                                    : announcement.content ?? '111'
                                            }
                                            onChange={(content) => handleEditDataChange('content', content)}
                                            placeholder="공지사항 내용을 입력하세요..."
                                            readonly={!isEditMode}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 액션 버튼 */}
                        {!isEditMode && (
                            <div className="flex justify-between gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('../announcements')}
                                    className="flex items-center space-x-2"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>목록으로 돌아가기</span>
                                </Button>
                            </div>
                        )}

                        {/* 수정 모드일 때 안내 메시지 */}
                        {isEditMode && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle className="h-5 w-5 text-blue-600" />
                                    <p className="text-sm text-blue-800">
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
