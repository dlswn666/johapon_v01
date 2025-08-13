'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ArrowLeft, Upload, Save, X, FileText, Users } from 'lucide-react';
import BannerAd from '@/widgets/common/BannerAd';
import RichTextEditor from '@/components/community/RichTextEditor';
import { communityCategories } from '@/lib/mockData';
import type { AttachedFile } from '@/entities/community/model/types';

export default function CommunityNewPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        content: '',
    });

    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

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

    const validateForm = () => {
        if (!formData.title.trim()) {
            alert('게시글 제목을 입력해 주세요.');
            return false;
        }
        if (!formData.category) {
            alert('카테고리를 선택해 주세요.');
            return false;
        }
        if (!formData.content.trim() || formData.content === '<br>' || formData.content === '<div><br></div>') {
            alert('게시글 내용을 입력해 주세요.');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const post = {
                id: Date.now(),
                ...formData,
                author: '조합원', // 실제로는 현재 사용자 정보
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                likes: 0,
                comments: 0,
                views: 0,
                isLiked: false,
                attachments: attachedFiles,
            };

            // 여기에서 실제 API 호출을 할 예정
            console.log('게시글 저장:', post);

            alert('게시글이 성공적으로 등록되었습니다.');
            router.push('/community');
        } catch (error) {
            console.error('Save error:', error);
            alert('게시글 등록 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleExit = () => {
        const hasContent = formData.title.trim() || formData.content.trim() || attachedFiles.length > 0;

        if (hasContent) {
            if (confirm('작성 중인 내용이 모두 사라집니다. 정말로 나가시겠습니까?')) {
                router.push('/community');
            }
        } else {
            router.push('/community');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" onClick={handleExit}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            뒤로가기
                        </Button>
                        <div>
                            <h1 className="text-2xl lg:text-3xl text-gray-900">게시글 작성</h1>
                            <p className="text-gray-600 mt-1">조합원들과 함께 정보를 나누고 소통해 주세요</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Sidebar - Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>

                    {/* Center Content */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="h-5 w-5" />
                                    <span>게시글 정보</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Title */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">게시글 제목 *</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => handleInputChange('title', e.target.value)}
                                            placeholder="게시글 제목을 입력하세요"
                                            className="mt-2"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <Label>카테고리 *</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(value) => handleInputChange('category', value)}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="카테고리를 선택하세요" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {communityCategories.map((category) => (
                                                    <SelectItem key={category} value={category}>
                                                        {category}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Author Info */}
                                    <div>
                                        <Label>작성자</Label>
                                        <Input
                                            value="조합원" // 실제로는 현재 사용자 정보
                                            readOnly
                                            className="mt-2 bg-gray-50"
                                        />
                                    </div>
                                </div>

                                {/* File Attachments */}
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

                                        {/* Attached Files List */}
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

                                {/* Content Editor */}
                                <div>
                                    <Label>게시글 내용 *</Label>
                                    <div className="mt-2">
                                        <RichTextEditor
                                            content={formData.content}
                                            onChange={(content) => handleInputChange('content', content)}
                                            placeholder="게시글 내용을 자세히 작성해 주세요..."
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 mt-8">
                            <Button variant="outline" onClick={handleExit}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {loading ? '등록 중...' : '게시글 등록'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Sidebar - Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd />
                    </div>
                </div>
            </div>
        </div>
    );
}
