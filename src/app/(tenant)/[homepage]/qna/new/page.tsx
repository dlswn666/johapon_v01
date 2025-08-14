'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import RichTextEditor from '@/features/rich-text-editor/RichTextEditor';
import BannerAd from '@/widgets/common/BannerAd';
import { ArrowLeft, Upload, Save, X, FileText, HelpCircle, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface AttachedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
}

export default function TenantQnANewPage() {
    const router = useRouter();
    const params = useParams();
    const homepage = params?.homepage as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        title: '',
        category: '일반문의',
        content: '',
    });

    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = [
        { value: '일반문의', label: '일반문의' },
        { value: '임시거주지', label: '임시거주지' },
        { value: '조합비', label: '조합비' },
        { value: '설계변경', label: '설계변경' },
        { value: '분양가격', label: '분양가격' },
    ];

    const handleChange = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            const fileData: AttachedFile = {
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file),
            };

            setAttachedFiles((prev) => [...prev, fileData]);
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (fileId: string) => {
        setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const validate = () => {
        const trimmedTitle = form.title.trim();
        if (!trimmedTitle) {
            alert('질문 제목을 입력해주세요.');
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
        if (!form.category) {
            alert('카테고리를 선택해주세요.');
            return false;
        }
        if (!form.content || form.content === '<p></p>' || form.content.trim() === '') {
            alert('질문 내용을 입력해주세요.');
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

            const response = await fetch(`/api/tenant/${homepage}/qna`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer temp-token', // 임시 토큰
                },
                body: JSON.stringify({
                    title: form.title,
                    content: form.content,
                    category: form.category,
                    attachments: attachedFiles,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                alert('질문이 성공적으로 등록되었습니다.');

                // 강제 새로고침을 위해 타임스탬프 파라미터 추가
                const timestamp = Date.now();
                router.push(`../qna?refresh=${timestamp}`);

                // 추가 보장을 위해 router.refresh() 호출
                router.refresh();
            } else {
                const error = await response.json();
                const errorMessage = error.error?.message || error.message || '알 수 없는 오류';
                alert(`등록에 실패했습니다: ${errorMessage}`);
            }
        } catch (error) {
            console.error('질문 등록 실패:', error);
            alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                <h1 className="text-2xl lg:text-3xl text-gray-900">질문 작성</h1>
                                <p className="text-gray-600 mt-1">
                                    궁금한 점을 질문해 주세요. 전문가가 신속하게 답변드리겠습니다.
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
                                <CardTitle className="flex items-center space-x-2">
                                    <HelpCircle className="h-5 w-5" />
                                    <span>질문 정보</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* 기본 정보 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 제목 */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">질문 제목 *</Label>
                                        <Input
                                            id="title"
                                            value={form.title}
                                            onChange={(e) => handleChange('title', e.target.value)}
                                            placeholder="질문 제목을 입력하세요"
                                            className="mt-2"
                                        />
                                    </div>

                                    {/* 카테고리 */}
                                    <div>
                                        <Label>카테고리 *</Label>
                                        <Select
                                            value={form.category}
                                            onValueChange={(value) => handleChange('category', value)}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="카테고리를 선택하세요" />
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

                                    {/* 작성자 정보 */}
                                    <div>
                                        <Label>작성자</Label>
                                        <Input value="조합원" readOnly className="mt-2 bg-gray-50" />
                                    </div>
                                </div>

                                {/* 파일 첨부 */}
                                <div>
                                    <Label>첨부파일</Label>
                                    <div className="mt-2 space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center space-x-2"
                                            >
                                                <Upload className="h-4 w-4" />
                                                <span>파일 선택</span>
                                            </Button>
                                            <span className="text-sm text-gray-500">
                                                PDF, Office 문서, 이미지 파일을 업로드할 수 있습니다
                                            </span>
                                        </div>

                                        {/* 첨부된 파일 목록 */}
                                        {attachedFiles.length > 0 && (
                                            <div className="space-y-2">
                                                {attachedFiles.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <FileText className="h-4 w-4 text-gray-500" />
                                                            <div>
                                                                <p className="text-sm text-gray-900">{file.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {formatFileSize(file.size)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeFile(file.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 질문 내용 */}
                                <div>
                                    <Label>질문 내용 *</Label>
                                    <div className="mt-2">
                                        <RichTextEditor
                                            value={form.content}
                                            onChange={(html) => handleChange('content', html)}
                                            placeholder="질문 내용을 자세히 작성해 주세요..."
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 액션 버튼 */}
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
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
                                        질문 등록
                                    </>
                                )}
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
