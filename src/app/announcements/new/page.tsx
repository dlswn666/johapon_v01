'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import RichTextEditor from '@/components/common/RichTextEditor';
import BannerAd from '@/components/common/BannerAd';
import { FileText, Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Priority = 'high' | 'normal' | 'low';

export default function AnnouncementNewPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        title: '',
        category: '',
        priority: 'normal' as Priority,
        sendNotification: false,
        content: '',
    });

    const handleChange = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

    const validate = () => {
        if (!form.title.trim()) return alert('제목을 입력해주세요.'), false;
        if (!form.category) return alert('카테고리를 선택해주세요.'), false;
        if (!form.content || form.content === '<p></p>') return alert('내용을 입력해주세요.'), false;
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        // TODO: API 연동 (Supabase/Edge Functions)
        alert('임시 저장되었습니다. (데모)');
        router.push('/announcements');
    };

    const categories = [
        { value: '중요공지', label: '중요공지' },
        { value: '일반공지', label: '일반공지' },
        { value: '안내사항', label: '안내사항' },
    ];

    const priorities = [
        { value: 'high', label: '높음' },
        { value: 'normal', label: '보통' },
        { value: 'low', label: '낮음' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
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

            {/* Main Content */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left - Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>

                    {/* Center */}
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
                                            value={form.category}
                                            onValueChange={(v) => handleChange('category', v)}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="카테고리를 선택하세요" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((c) => (
                                                    <SelectItem key={c.value} value={c.value}>
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>우선순위</Label>
                                        <Select
                                            value={form.priority}
                                            onValueChange={(v) => handleChange('priority', v)}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {priorities.map((p) => (
                                                    <SelectItem key={p.value} value={p.value}>
                                                        {p.label}
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
                            <Button variant="outline" onClick={() => router.push('/announcements')}>
                                취소
                            </Button>
                            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                                <Save className="h-4 w-4 mr-2" /> 저장하기
                            </Button>
                        </div>
                    </div>

                    {/* Right - Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>
                </div>
            </div>
        </div>
    );
}
