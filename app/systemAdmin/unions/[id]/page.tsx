'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, X, Loader2, Building2, Edit, Save, Users, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnion, useUpdateUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { supabase } from '@/app/_lib/shared/supabase/client';

interface UnionFormData {
    name: string;
    slug: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    business_hours: string;
    logo_url: string;
    is_active: boolean;
}

export default function UnionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const unionId = params.id as string;

    const { data: union, isLoading } = useUnion(unionId);
    const updateMutation = useUpdateUnion();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<UnionFormData>({
        name: '',
        slug: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        business_hours: '',
        logo_url: '',
        is_active: true,
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (union) {
            setFormData({
                name: union.name || '',
                slug: union.slug || '',
                description: union.description || '',
                address: union.address || '',
                phone: union.phone || '',
                email: union.email || '',
                business_hours: union.business_hours || '',
                logo_url: union.logo_url || '',
                is_active: union.is_active ?? true,
            });
            if (union.logo_url) {
                setLogoPreview(union.logo_url);
            }
        }
    }, [union]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
        if (!logoFile) return formData.logo_url || null;

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

            await updateMutation.mutateAsync({
                id: unionId,
                updates: {
                    name: formData.name,
                    description: formData.description || null,
                    address: formData.address || null,
                    phone: formData.phone || null,
                    email: formData.email || null,
                    business_hours: formData.business_hours || null,
                    logo_url: logoUrl || null,
                    is_active: formData.is_active,
                },
            });

            toast.success('조합 정보가 수정되었습니다.');
            setIsEditing(false);
            setLogoFile(null);
        } catch (error) {
            console.error('Update union error:', error);
            toast.error('조합 수정에 실패했습니다.');
        }
    };

    const handleCancel = () => {
        if (union) {
            setFormData({
                name: union.name || '',
                slug: union.slug || '',
                description: union.description || '',
                address: union.address || '',
                phone: union.phone || '',
                email: union.email || '',
                business_hours: union.business_hours || '',
                logo_url: union.logo_url || '',
                is_active: union.is_active ?? true,
            });
            if (union.logo_url) {
                setLogoPreview(union.logo_url);
            } else {
                setLogoPreview(null);
            }
        }
        setLogoFile(null);
        setIsEditing(false);
    };

    const isSubmitting = updateMutation.isPending || isUploading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!union) {
        return (
            <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-lg text-slate-400 mb-4">조합을 찾을 수 없습니다</p>
                <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700">
                    뒤로 가기
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl">
                <CardHeader className="border-b border-slate-700 bg-slate-800/30">
                    <div className="flex items-center justify-between">
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
                                <div>
                                    <CardTitle className="text-xl font-semibold text-white">
                                        {isEditing ? '조합 수정' : '조합 상세'}
                                    </CardTitle>
                                    <p className="text-sm text-slate-400">/{union.slug}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/systemAdmin/unions/${unionId}/admins`} className="cursor-pointer">
                                <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                    <Users className="w-4 h-4 mr-2" />
                                    관리자 관리
                                </Button>
                            </Link>
                            <a href={`/${union.slug}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                <Button variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    사이트 보기
                                </Button>
                            </a>
                            {!isEditing && (
                                <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                                    <Edit className="w-4 h-4 mr-2" />
                                    수정
                                </Button>
                            )}
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
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveLogo}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10 cursor-pointer"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center bg-slate-700/50">
                                        <Upload className="w-8 h-8 text-slate-500" />
                                    </div>
                                )}
                                {isEditing && (
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
                                )}
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
                                disabled={!isEditing}
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-70"
                            />
                        </div>

                        {/* Slug (읽기 전용) */}
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-slate-300">
                                Slug (URL 경로)
                            </Label>
                            <Input
                                id="slug"
                                name="slug"
                                value={formData.slug}
                                disabled
                                className="bg-slate-700/50 border-slate-600 text-slate-400"
                            />
                            <p className="text-xs text-slate-500">Slug는 변경할 수 없습니다.</p>
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
                                disabled={!isEditing}
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-70"
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
                                disabled={!isEditing}
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-70"
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
                                    disabled={!isEditing}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-70"
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
                                    disabled={!isEditing}
                                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-70"
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
                                disabled={!isEditing}
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-70"
                            />
                        </div>

                        {/* 활성화 상태 */}
                        <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                            <div>
                                <Label className="text-base font-medium text-white">조합 활성화</Label>
                                <p className="text-sm text-slate-400">
                                    비활성화하면 해당 조합 홈페이지에 접근할 수 없습니다
                                </p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                                disabled={!isEditing}
                            />
                        </div>

                        {/* 버튼 영역 */}
                        {isEditing && (
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                                >
                                    취소
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    저장
                                </Button>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

