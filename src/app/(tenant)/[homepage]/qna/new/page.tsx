'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import TiptapEditor from '@/components/community/TiptapEditor';
import TempFileUpload, { type TempFile } from '@/components/common/TempFileUpload';
import SideBannerAds from '@/widgets/common/SideBannerAds';
import { HelpCircle, Save, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useQnAStore } from '@/shared/store/qnaStore';
import type { QnACreateData } from '@/entities/qna/model/types';

export default function TenantQnANewPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;

    // Store 사용
    const { subcategories, loading, error, fetchMetadata, createQnA, resetState } = useQnAStore();

    const [form, setForm] = useState<QnACreateData>({
        title: '',
        subcategory_id: '',
        content: '',
        is_secret: false,
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

            const result = await createQnA(homepage, form);

            if (result.success && result.id) {
                // 게시글 저장 성공 시 첨부파일 업로드
                if (tempFiles.length > 0) {
                    try {
                        for (const tempFile of tempFiles) {
                            const formData = new FormData();
                            formData.append('slug', homepage);
                            formData.append('target_table', 'qna');
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
                router.push(`../qna?refresh=${timestamp}`);
                // 페이지 전체 새로고침으로 확실한 데이터 업데이트 보장
                router.refresh();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Q&A 등록 실패:', error);
            alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 에러 상태 표시
    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Button onClick={() => router.push('../qna')} variant="outline">
                        목록으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-3">
                        <HelpCircle className="h-6 w-6" />
                        <div>
                            <h1 className="text-2xl lg:text-3xl text-gray-900">Q&A 작성</h1>
                            <p className="text-gray-600 mt-1">궁금한 점이나 문의사항을 남겨주세요</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <SideBannerAds sticky />
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Q&A 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">제목 *</Label>
                                        <Input
                                            id="title"
                                            value={form.title}
                                            onChange={(e) => handleChange('title', e.target.value)}
                                            placeholder="질문 제목을 입력하세요"
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
                                </div>

                                {/* 비밀글 옵션 */}
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
                                        checked={form.is_secret}
                                        onCheckedChange={(c: boolean) => handleChange('is_secret', c)}
                                    />
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
                                            placeholder="질문 내용을 상세히 작성해 주세요..."
                                        />
                                    </div>
                                </div>

                                {/* 작성 안내 */}
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-start space-x-2">
                                        <HelpCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-green-800 mb-2">Q&A 작성 안내</p>
                                            <ul className="text-sm text-green-700 space-y-1">
                                                <li>• 구체적이고 명확한 질문을 작성해 주세요</li>
                                                <li>• 관리자가 답변을 작성하면 알림을 받을 수 있습니다</li>
                                                <li>• 비밀글로 설정하면 개인정보 관련 질문도 안전합니다</li>
                                                <li>• 답변이 완료되면 Q&A 목록에서 확인하실 수 있습니다</li>
                                            </ul>
                                        </div>
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
                                className="bg-blue-600 hover:bg-blue-700 text-white"
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
                        <SideBannerAds sticky />
                    </div>
                </div>
            </div>
        </div>
    );
}
