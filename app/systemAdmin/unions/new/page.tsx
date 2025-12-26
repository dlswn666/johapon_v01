'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/app/_lib/widgets/common/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { supabase } from '@/app/_lib/shared/supabase/client';
import Image from 'next/image';

interface UnionFormData {
    name: string;
    slug: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    business_hours: string;
    logo_url: string;
}

export default function NewUnionPage() {
    const router = useRouter();
    const createMutation = useCreateUnion();

    const [formData, setFormData] = useState<UnionFormData>({
        name: '',
        slug: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        business_hours: '',
        logo_url: '',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // slug 자동 생성 (name 변경 시)
        if (name === 'name') {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9가-힣]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            setFormData((prev) => ({ ...prev, slug }));
        }
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setLogoFile(file);
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setFormData((prev) => ({ ...prev, logo_url: '' }));
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return null;

        setIsUploading(true);
        try {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `union-logos/${formData.slug}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('files').upload(fileName, logoFile);

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from('files').getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Logo upload error:', error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let logoUrl = formData.logo_url;
            if (logoFile) {
                logoUrl = (await uploadLogo()) || '';
            }

            const result = await createMutation.mutateAsync({
                name: formData.name,
                slug: formData.slug,
                description: formData.description || null,
                address: formData.address || null,
                phone: formData.phone || null,
                email: formData.email || null,
                business_hours: formData.business_hours || null,
                logo_url: logoUrl || null,
            });

            toast.success('조합이 등록되었습니다.');
            router.push(`/systemAdmin/unions/${result.id}`);
        } catch (error: unknown) {
            console.error('Create union error:', error);
            const pgError = error as { code?: string };
            if (pgError?.code === '23505') {
                toast.error('이미 존재하는 Slug입니다. 다른 값을 입력해주세요.');
            } else {
                toast.error('조합 등록에 실패했습니다.');
            }
        }
    };

    const isSubmitting = createMutation.isPending || isUploading;

    return (
        <div className="max-w-3xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl">
                <CardHeader className="border-b border-slate-700 bg-slate-800/30">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-400" />
                            </div>
                            <CardTitle className="text-xl font-semibold text-white">새 조합 등록</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 로고 업로드 */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">로고</Label>
                            <div className="flex items-center gap-4">
                                {logoPreview ? (
                                    <div className="relative w-24 h-24">
                                        <Image
                                            src={logoPreview}
                                            alt="로고 미리보기"
                                            fill
                                            className="rounded-xl object-cover border border-slate-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10 cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center bg-slate-700/50">
                                        <Upload className="w-8 h-8 text-slate-500" />
                                    </div>
                                )}
                                <div>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <Label
                                        htmlFor="logo-upload"
                                        className="cursor-pointer inline-flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-white transition-colors"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        이미지 선택
                                    </Label>
                                    <p className="text-xs text-slate-500 mt-1">권장: 200x200px, PNG/JPG</p>
                                </div>
                            </div>
                        </div>

                        {/* 조합명 */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-300">
                                조합명 <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="조합명을 입력하세요"
                                required
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {/* Slug */}
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-slate-300">
                                Slug (URL 경로) <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="slug"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                placeholder="예: my-union"
                                required
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                            <p className="text-xs text-slate-500">
                                URL에 사용됩니다: example.com/{formData.slug || 'slug'}
                            </p>
                        </div>

                        {/* 설명 */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-300">
                                조합 소개
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="조합 소개를 입력하세요"
                                rows={4}
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {/* 주소 */}
                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-slate-300">
                                주소
                            </Label>
                            <Input
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="조합 주소를 입력하세요"
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {/* 전화번호 & 이메일 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-slate-300">
                                    전화번호
                                </Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="02-1234-5678"
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">
                                    이메일
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="info@example.com"
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* 운영시간 */}
                        <div className="space-y-2">
                            <Label htmlFor="business_hours" className="text-slate-300">
                                운영시간
                            </Label>
                            <Input
                                id="business_hours"
                                name="business_hours"
                                value={formData.business_hours}
                                onChange={handleChange}
                                placeholder="평일 09:00~18:00, 주말 휴무"
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {/* 버튼 영역 */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                            >
                                취소
                            </Button>
                            <ActionButton
                                type="submit"
                                isLoading={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                등록
                            </ActionButton>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

