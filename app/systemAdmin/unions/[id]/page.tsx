'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, X, Loader2, Building2, Edit, Save, Users, ExternalLink, MessageSquare, Key, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useUnion, useUpdateUnion, useRegisterUnionSenderKey, useUpdateUnionAlimtalkSettings } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
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
    kakao_channel_id: string;
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
        kakao_channel_id: '',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    // Sender Key 모달 상태
    const [isSenderKeyModalOpen, setIsSenderKeyModalOpen] = useState(false);
    const [newSenderKey, setNewSenderKey] = useState('');
    const registerSenderKeyMutation = useRegisterUnionSenderKey();
    const _updateAlimtalkSettingsMutation = useUpdateUnionAlimtalkSettings();

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
                kakao_channel_id: union.kakao_channel_id || '',
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
                    kakao_channel_id: formData.kakao_channel_id || null,
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
                kakao_channel_id: union.kakao_channel_id || '',
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

    // Sender Key 등록 핸들러
    const handleRegisterSenderKey = async () => {
        if (!newSenderKey.trim() || !formData.kakao_channel_id.trim()) {
            toast.error('채널 ID와 Sender Key를 모두 입력해주세요.');
            return;
        }

        try {
            await registerSenderKeyMutation.mutateAsync({
                unionId,
                senderKey: newSenderKey.trim(),
                channelName: formData.kakao_channel_id.trim(),
            });
            toast.success('Sender Key가 등록되었습니다.');
            setIsSenderKeyModalOpen(false);
            setNewSenderKey('');
        } catch (error) {
            console.error('Sender Key 등록 오류:', error);
            toast.error('Sender Key 등록에 실패했습니다.');
        }
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

                        {/* 알림톡 설정 */}
                        <div className="space-y-4 p-4 bg-slate-700/30 rounded-xl">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-yellow-500" />
                                <Label className="text-base font-medium text-white">알림톡 설정</Label>
                            </div>
                            
                            <div className="space-y-4">
                                {/* 카카오 채널 ID */}
                                <div className="space-y-2">
                                    <Label htmlFor="kakao_channel_id" className="text-slate-300">
                                        카카오 채널 ID
                                    </Label>
                                    <Input
                                        id="kakao_channel_id"
                                        name="kakao_channel_id"
                                        value={formData.kakao_channel_id}
                                        onChange={handleChange}
                                        placeholder="@채널명"
                                        disabled={!isEditing}
                                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:opacity-70"
                                    />
                                    <p className="text-xs text-slate-500">예: @조합온, @행복재건축조합</p>
                                </div>

                                {/* Sender Key 상태 */}
                                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="text-sm font-medium text-white">Sender Key</p>
                                            <p className="text-xs text-slate-400">
                                                {union?.vault_sender_key_id ? (
                                                    <span className="text-green-400">✓ 등록됨</span>
                                                ) : (
                                                    <span className="text-yellow-400">미등록 (조합온 채널 사용)</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsSenderKeyModalOpen(true)}
                                        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                                    >
                                        {union?.vault_sender_key_id ? '변경' : '등록'}
                                    </Button>
                                </div>

                                {!union?.vault_sender_key_id && (
                                    <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-yellow-200">
                                            Sender Key가 등록되지 않으면 조합온 기본 채널로 알림톡이 발송됩니다.
                                        </p>
                                    </div>
                                )}
                            </div>
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

            {/* Sender Key 등록 모달 */}
            <Dialog open={isSenderKeyModalOpen} onOpenChange={setIsSenderKeyModalOpen}>
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">Sender Key 등록</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">카카오 채널 ID</Label>
                            <Input
                                value={formData.kakao_channel_id}
                                onChange={(e) => setFormData((prev) => ({ ...prev, kakao_channel_id: e.target.value }))}
                                placeholder="@채널명"
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Sender Key</Label>
                            <Input
                                value={newSenderKey}
                                onChange={(e) => setNewSenderKey(e.target.value)}
                                placeholder="알리고에서 발급받은 Sender Key"
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                            />
                            <p className="text-xs text-slate-500">
                                알리고 콘솔에서 채널 연동 후 발급받은 40자 내외의 키를 입력하세요.
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-yellow-200">
                                ⚠️ Sender Key는 암호화되어 저장되며, 이후 조회할 수 없습니다.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsSenderKeyModalOpen(false);
                                setNewSenderKey('');
                            }}
                            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleRegisterSenderKey}
                            disabled={registerSenderKeyMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {registerSenderKeyMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Key className="w-4 h-4 mr-2" />
                            )}
                            등록
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

