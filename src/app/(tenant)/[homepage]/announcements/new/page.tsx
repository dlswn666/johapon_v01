'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import RichTextEditor from '@/features/rich-text-editor/RichTextEditor';
import BannerAd from '@/widgets/common/BannerAd';
import { FileText, Save, Send, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Subcategory {
    id: string;
    name: string;
}

export default function TenantAnnouncementNewPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;

    const [form, setForm] = useState({
        title: '',
        subcategory_id: '',
        popup: false,
        sendNotification: false,
        content: '',
    });

    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 서브카테고리 목록 가져오기
    useEffect(() => {
        const fetchSubcategories = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/tenant/${homepage}/meta`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // 공지사항 서브카테고리만 필터링
                        const noticeSubcategories =
                            data.data?.subcategories?.filter((sub: any) => sub.category_key === 'notice') || [];
                        setSubcategories(noticeSubcategories);
                    } else {
                        throw new Error(data.message || '데이터 로딩 실패');
                    }
                } else {
                    throw new Error('API 요청 실패');
                }
            } catch (error) {
                console.error('서브카테고리 로딩 실패:', error);
                // Supabase에서 직접 가져오기 시도
                try {
                    // 기본 전역 카테고리에서 공지사항 서브카테고리 가져오기
                    setSubcategories([
                        { id: 'e2ead72f-d169-431a-bbb3-7948e8713c33', name: '긴급공지' },
                        { id: 'b2603582-a52c-4984-9a5d-2bd3fce755d0', name: '일반공지' },
                        { id: 'afec53c2-3b2e-43b8-b03d-6f0d63cc2fda', name: '안내사항' },
                    ]);
                } catch (fallbackError) {
                    console.error('기본 카테고리 설정 실패:', fallbackError);
                    setSubcategories([]);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (homepage) {
            fetchSubcategories();
        }
    }, [homepage]);

    const handleChange = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

    const validate = () => {
        if (!form.title.trim()) return alert('제목을 입력해주세요.'), false;
        if (!form.subcategory_id) return alert('카테고리를 선택해주세요.'), false;
        if (!form.content || form.content === '<p></p>') return alert('내용을 입력해주세요.'), false;
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;

        try {
            setIsSubmitting(true);

            const response = await fetch(`/api/tenant/${homepage}/notices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer temp-token', // 임시 토큰
                },
                body: JSON.stringify({
                    subcategory_id: form.subcategory_id,
                    title: form.title,
                    content: form.content,
                    popup: form.popup,
                    sendNotification: form.sendNotification,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                alert('공지사항이 성공적으로 등록되었습니다.');
                router.push('../announcements');
            } else {
                const error = await response.json();
                alert(`등록에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
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
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue
                                                    placeholder={
                                                        isLoading ? '카테고리 로딩 중...' : '카테고리를 선택하세요'
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
                                    <Label>내용 *</Label>
                                    <div className="mt-2">
                                        <RichTextEditor
                                            value={form.content}
                                            onChange={(html) => handleChange('content', html)}
                                            placeholder="공지사항 내용을 작성해 주세요..."
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isSubmitting}
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
