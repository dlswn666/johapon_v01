'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import BannerAd from '@/widgets/common/BannerAd';
import { FileText, ArrowLeft, Calendar, User, Eye, Send, AlertCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Subcategory {
    id: string;
    name: string;
}

interface AnnouncementDetail {
    id: string;
    title: string;
    content: string;
    subcategory_id: string;
    subcategory_name?: string;
    popup: boolean;
    created_at: string;
    updated_at: string;
    views?: number;
    author_name?: string;
    sendNotification?: boolean;
}

export default function TenantAnnouncementDetailPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;
    const announcementId = params?.id as string;

    const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 공지사항 데이터 및 서브카테고리 목록 가져오기
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // 공지사항 상세 정보와 메타 정보를 병렬로 가져오기
                const [announcementResponse, metaResponse] = await Promise.all([
                    fetch(`/api/tenant/${homepage}/notices/${announcementId}`),
                    fetch(`/api/tenant/${homepage}/meta`),
                ]);

                // 공지사항 데이터 처리
                if (announcementResponse.ok) {
                    const announcementData = await announcementResponse.json();
                    if (announcementData.success) {
                        setAnnouncement(announcementData.data);
                    } else {
                        throw new Error(announcementData.message || '공지사항을 찾을 수 없습니다.');
                    }
                } else {
                    throw new Error('공지사항을 불러오는데 실패했습니다.');
                }

                // 서브카테고리 데이터 처리
                if (metaResponse.ok) {
                    const metaData = await metaResponse.json();
                    if (metaData.success) {
                        const noticeSubcategories =
                            metaData.data?.subcategories?.filter((sub: any) => sub.category_key === 'notice') || [];
                        setSubcategories(noticeSubcategories);
                    }
                } else {
                    // 메타 데이터 실패 시 기본값 설정
                    setSubcategories([
                        { id: 'e2ead72f-d169-431a-bbb3-7948e8713c33', name: '긴급공지' },
                        { id: 'b2603582-a52c-4984-9a5d-2bd3fce755d0', name: '일반공지' },
                        { id: 'afec53c2-3b2e-43b8-b03d-6f0d63cc2fda', name: '안내사항' },
                    ]);
                }
            } catch (error) {
                console.error('데이터 로딩 실패:', error);
                setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        if (homepage && announcementId) {
            fetchData();
        }
    }, [homepage, announcementId]);

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

    // 로딩 상태
    if (isLoading) {
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
                                <h1 className="text-2xl lg:text-3xl text-gray-900">공지사항 상세보기</h1>
                                <p className="text-gray-600 mt-1">공지사항 내용을 확인하실 수 있습니다</p>
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
                                <CardTitle>공지사항 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* 기본 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 제목 */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">제목</Label>
                                        <Input
                                            id="title"
                                            value={announcement.title}
                                            readOnly
                                            className="mt-2 bg-gray-50 border-gray-200 text-gray-900"
                                        />
                                    </div>

                                    {/* 카테고리 */}
                                    <div>
                                        <Label>카테고리</Label>
                                        <Select value={announcement.subcategory_id} disabled>
                                            <SelectTrigger className="mt-2 bg-gray-50 border-gray-200 text-gray-900">
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
                                        <Select value={String(announcement.popup)} disabled>
                                            <SelectTrigger className="mt-2 bg-gray-50 border-gray-200 text-gray-900">
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
                                {announcement.sendNotification && (
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

                                {/* 내용 - 읽기 전용 리치 텍스트 뷰어 */}
                                <div>
                                    <Label>내용</Label>
                                    <div className="mt-2 border rounded-lg overflow-hidden">
                                        {/* 읽기 전용 내용 */}
                                        <div
                                            className="min-h-[400px] p-6 bg-white text-gray-800 leading-relaxed prose prose-slate max-w-none"
                                            style={{
                                                lineHeight: '1.7',
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html:
                                                    announcement.content ||
                                                    '<p class="text-gray-500">내용이 없습니다.</p>',
                                            }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 액션 버튼 */}
                        <div className="flex justify-between gap-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push('../announcements')}
                                className="flex items-center space-x-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>목록으로 돌아가기</span>
                            </Button>

                            {/* 관리자 권한이 있을 경우 수정/삭제 버튼 추가 가능 */}
                            {/* 
                            <div className="flex gap-2">
                                <Button variant="outline">
                                    수정하기
                                </Button>
                                <Button variant="destructive">
                                    삭제하기
                                </Button>
                            </div>
                            */}
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
