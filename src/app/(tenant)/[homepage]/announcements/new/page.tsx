'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import TiptapEditor from '@/components/community/TiptapEditor';
import TempFileUpload, { type TempFile } from '@/components/common/TempFileUpload';
import BannerAd from '@/widgets/common/BannerAd';
import { FileText, Save, Send, Loader2, AlertTriangle, Pin } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useAnnouncementStore } from '@/shared/store/announcementStore';
import type { AnnouncementCreateData } from '@/entities/announcement/model/types';

export default function TenantAnnouncementNewPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;

    // Store 사용
    const { subcategories, loading, error, fetchMetadata, createAnnouncement, resetState } = useAnnouncementStore();

    // 임시 게시물 ID 생성 (첨부파일용)
    const tempPostId = useMemo(() => {
        // UUID v4 형식의 임시 ID 생성
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }, []);

    const [form, setForm] = useState<AnnouncementCreateData & { sendNotification: boolean }>({
        title: '',
        subcategory_id: '',
        popup: false,
        priority: 0,
        is_urgent: false,
        is_pinned: false,
        published_at: null,
        expires_at: null,
        sendNotification: false,
        content: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tempFiles, setTempFiles] = useState<TempFile[]>([]);

    // 컴포넌트 마운트 시 메타데이터 로드
    useEffect(() => {
        if (homepage) {
            resetState(); // 이전 상태 초기화
            fetchMetadata(homepage).catch((error) => {
                console.error('메타데이터 로딩 실패:', error);
            });
        }

        // 컴포넌트 언마운트 시 상태 초기화
        return () => {
            resetState();
        };
    }, [homepage, fetchMetadata, resetState]);

    const handleChange = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

    const validate = () => {
        const trimmedTitle = form.title.trim();
        if (!trimmedTitle) {
            alert('제목을 입력해주세요.');
            return false;
        }
        if (trimmedTitle.length < 2) {
            alert('제목은 최소 2글자 이상 입력해주세요.');
            return false;
        }
        if (trimmedTitle.length > 100) {
            alert('제목은 100글자를 초과할 수 없습니다.');
            return false;
        }
        if (!form.subcategory_id) {
            alert('카테고리를 선택해주세요.');
            return false;
        }
        if (!form.content || form.content === '<p></p>' || form.content.trim() === '') {
            alert('내용을 입력해주세요.');
            return false;
        }
        if (form.content.length > 10000) {
            alert('내용은 10,000글자를 초과할 수 없습니다.');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;

        try {
            setIsSubmitting(true);

            const result = await createAnnouncement(homepage, form);

            if (result.success && result.id) {
                // 게시글 저장 성공 시 첨부파일 업로드
                if (tempFiles.length > 0) {
                    try {
                        for (const tempFile of tempFiles) {
                            const formData = new FormData();
                            formData.append('slug', homepage);
                            formData.append('target_table', 'announcements');
                            formData.append('target_id', result.id);
                            formData.append('file', tempFile.file);

                            const uploadResponse = await fetch('/api/attachments', {
                                method: 'POST',
                                body: formData,
                            });

                            if (!uploadResponse.ok) {
                                console.error(`파일 업로드 실패: ${tempFile.name}`);
                            }
                        }
                    } catch (fileError) {
                        console.error('첨부파일 업로드 중 오류:', fileError);
                        // 파일 업로드 실패해도 게시글은 이미 생성되었으므로 계속 진행
                    }
                }

                alert(result.message);
                // 리스트 페이지 데이터 새로고침을 위한 이동
                const timestamp = Date.now();
                router.push(`../announcements?refresh=${timestamp}`);
                // 페이지 전체 새로고침으로 확실한 데이터 업데이트 보장
                router.refresh();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('공지사항 등록 실패:', error);
            alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const popupOptions = [
        { value: 'false', label: '일반 공지' },
        { value: 'true', label: '팝업 공지' },
    ];

    // 에러 상태 표시
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Button onClick={() => router.push('../announcements')} variant="outline">
                        목록으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-3">
                        <FileText className="h-6 w-6" />
                        <div>
                            <h1 className="text-2xl lg:text-3xl text-gray-900">공지사항 작성</h1>
                            <p className="text-gray-600 mt-1">조합원들에게 전달할 공지사항을 작성해 주세요</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>공지사항 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">제목 *</Label>
                                        <Input
                                            id="title"
                                            value={form.title}
                                            onChange={(e) => handleChange('title', e.target.value)}
                                            placeholder="공지사항 제목을 입력하세요"
                                            className="mt-2"
                                        />
                                    </div>

                                    <div>
                                        <Label>카테고리 *</Label>
                                        <Select
                                            value={form.subcategory_id}
                                            onValueChange={(v) => handleChange('subcategory_id', v)}
                                            disabled={loading}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue
                                                    placeholder={
                                                        loading ? '카테고리 로딩 중...' : '카테고리를 선택하세요'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subcategories.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>공지 유형</Label>
                                        <Select
                                            value={String(form.popup)}
                                            onValueChange={(v) => handleChange('popup', v === 'true')}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="공지 유형을 선택하세요" />
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
                                            value={String(form.priority)}
                                            onValueChange={(v) => handleChange('priority', parseInt(v))}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="우선순위를 선택하세요" />
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
                                            value={form.published_at || ''}
                                            onChange={(e) => handleChange('published_at', e.target.value || null)}
                                            className="mt-2"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">설정하지 않으면 즉시 게시됩니다</p>
                                    </div>

                                    <div>
                                        <Label>게시 종료일</Label>
                                        <Input
                                            type="datetime-local"
                                            value={form.expires_at || ''}
                                            onChange={(e) => handleChange('expires_at', e.target.value || null)}
                                            className="mt-2"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">설정하지 않으면 계속 게시됩니다</p>
                                    </div>
                                </div>

                                {/* 특별 옵션들 */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="flex items-center space-x-3">
                                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                            <div>
                                                <Label className="text-base text-yellow-800">긴급 공지사항</Label>
                                                <p className="text-sm text-yellow-600">
                                                    긴급 공지사항으로 설정하면 목록에서 강조 표시됩니다
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={form.is_urgent}
                                            onCheckedChange={(c: boolean) => handleChange('is_urgent', c)}
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
                                            checked={form.is_pinned}
                                            onCheckedChange={(c: boolean) => handleChange('is_pinned', c)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <Label className="text-base">알림톡 발송</Label>
                                        <p className="text-sm text-gray-600 mt-1">
                                            공지사항 등록 시 조합원들에게 알림톡을 발송합니다
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={form.sendNotification}
                                            onCheckedChange={(c: boolean) => handleChange('sendNotification', c)}
                                        />
                                        <Send className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>

                                <div>
                                    <Label>첨부파일</Label>
                                    <div className="mt-2">
                                        <TempFileUpload
                                            onFilesChange={setTempFiles}
                                            disabled={isSubmitting}
                                            maxFiles={10}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>내용 *</Label>
                                    <div className="mt-2">
                                        <TiptapEditor
                                            content={form.content}
                                            onChange={(content) => handleChange('content', content)}
                                            placeholder="공지사항 내용을 작성해 주세요..."
                                            slug={homepage}
                                            targetTable="announcements"
                                            targetId={tempPostId}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting || loading}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isSubmitting || loading}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        등록 중...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        저장하기
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>
                </div>
            </div>
        </div>
    );
}
