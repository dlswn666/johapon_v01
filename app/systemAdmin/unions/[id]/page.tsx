'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, X, Loader2, Building2, Edit, Save, Users, ExternalLink, MessageSquare, Key, AlertTriangle, Megaphone, Info, MapPin, Phone, Mail, Clock, ShieldCheck, Calendar, SquareStack } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/app/_lib/widgets/common/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useUnion, useUpdateUnion, useRegisterUnionSenderKey, useUpdateUnionAlimtalkSettings } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { useDevelopmentStages } from '@/app/_lib/features/development-stages/api/useDevelopmentStages';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { AdDashboard } from '@/app/_lib/features/advertisement/ui/AdDashboard';

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
    
    // 신규 추가 필드
    member_count: string;
    area_size: string;
    district_name: string;
    establishment_date: string;
    approval_date: string;
    office_address: string;
    office_phone: string;
    registration_number: string;
    business_type: string;
    current_stage_id: string;
}

export default function UnionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const unionId = params.id as string;

    const { data: union, isLoading } = useUnion(unionId);
    const updateMutation = useUpdateUnion();
    const { data: stages } = useDevelopmentStages();

    const [activeView, setActiveView] = useState<'INFO' | 'ADS'>('INFO');
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
        
        member_count: '',
        area_size: '',
        district_name: '',
        establishment_date: '',
        approval_date: '',
        office_address: '',
        office_phone: '',
        registration_number: '',
        business_type: '재건축',
        current_stage_id: '',
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
                
                member_count: union.member_count?.toString() || '',
                area_size: union.area_size?.toString() || '',
                district_name: union.district_name || '',
                establishment_date: union.establishment_date || '',
                approval_date: union.approval_date || '',
                office_address: union.office_address || '',
                office_phone: union.office_phone || '',
                registration_number: union.registration_number || '',
                business_type: union.business_type || '재건축',
                current_stage_id: union.current_stage_id || '',
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

    const handleSelectChange = (name: string, value: string) => {
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
                    description: formData.description || undefined,
                    address: formData.address || undefined,
                    phone: formData.phone || undefined,
                    email: formData.email || undefined,
                    business_hours: formData.business_hours || undefined,
                    logo_url: logoUrl || undefined,
                    is_active: formData.is_active,
                    kakao_channel_id: formData.kakao_channel_id || undefined,
                    
                    member_count: formData.member_count ? parseInt(formData.member_count) : undefined,
                    area_size: formData.area_size ? parseFloat(formData.area_size) : undefined,
                    district_name: formData.district_name || undefined,
                    establishment_date: formData.establishment_date || undefined,
                    approval_date: formData.approval_date || undefined,
                    office_address: formData.office_address || undefined,
                    office_phone: formData.office_phone || undefined,
                    registration_number: formData.registration_number || undefined,
                    business_type: formData.business_type || undefined,
                    current_stage_id: formData.current_stage_id || undefined,
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
                
                member_count: union.member_count?.toString() || '',
                area_size: union.area_size?.toString() || '',
                district_name: union.district_name || '',
                establishment_date: union.establishment_date || '',
                approval_date: union.approval_date || '',
                office_address: union.office_address || '',
                office_phone: union.office_phone || '',
                registration_number: union.registration_number || '',
                business_type: union.business_type || '재건축',
                current_stage_id: union.current_stage_id || '',
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

    const filteredStages = stages?.filter(s => s.business_type === formData.business_type) || [];

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-6">
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
                            <h1 className="text-2xl font-bold text-white">
                                {activeView === 'ADS' ? '광고 관리' : isEditing ? '조합 정보 수정' : '조합 상세 정보'}
                            </h1>
                            <p className="text-sm text-slate-400">/{union.slug}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isEditing && activeView === 'INFO' && (
                        <>
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
                            <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                                <Edit className="w-4 h-4 mr-2" />
                                수정
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={() => {
                            setActiveView(activeView === 'INFO' ? 'ADS' : 'INFO');
                            setIsEditing(false);
                        }}
                        className={activeView === 'ADS' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                    >
                        <Megaphone className="w-4 h-4 mr-2" />
                        {activeView === 'INFO' ? '광고 관리' : '조합 정보'}
                    </Button>
                </div>
            </div>

            {activeView === 'INFO' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. 기본 정보 */}
                    <Card className="bg-slate-800/50 border-slate-700 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-slate-700 bg-slate-800/30 flex flex-row items-center gap-2">
                            <Info className="w-5 h-5 text-blue-400" />
                            <CardTitle className="text-lg font-semibold text-white">기본 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
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
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-slate-300">
                                            조합명 <span className="text-red-400">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="조합명을 입력하세요"
                                            required
                                            className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                        />
                                    </div>

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
                                        <p className="text-xs text-slate-500">Slug는 수정할 수 없습니다.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-slate-300">조합 소개</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    placeholder="조합 소개를 입력하세요"
                                    rows={3}
                                    className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. 사업 상세 정보 */}
                    <Card className="bg-slate-800/50 border-slate-700 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-slate-700 bg-slate-800/30 flex flex-row items-center gap-2">
                            <SquareStack className="w-5 h-5 text-purple-400" />
                            <CardTitle className="text-lg font-semibold text-white">사업 상세 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">사업 유형</Label>
                                    <Select 
                                        value={formData.business_type} 
                                        onValueChange={(val) => {
                                            setFormData(prev => ({ ...prev, business_type: val, current_stage_id: '' }));
                                        }}
                                        disabled={!isEditing}
                                    >
                                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70">
                                            <SelectValue placeholder="사업 유형 선택" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                            <SelectItem value="재개발">재개발</SelectItem>
                                            <SelectItem value="재건축">재건축</SelectItem>
                                            <SelectItem value="지역주택">지역주택</SelectItem>
                                            <SelectItem value="가로주택정비">가로주택정비</SelectItem>
                                            <SelectItem value="소규모재건축">소규모재건축</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">현재 개발 단계</Label>
                                    <Select 
                                        value={formData.current_stage_id} 
                                        onValueChange={(val) => handleSelectChange('current_stage_id', val)}
                                        disabled={!isEditing}
                                    >
                                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70">
                                            <SelectValue placeholder="단계 선택" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                            {filteredStages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.stage_name}
                                                </SelectItem>
                                            ))}
                                            {filteredStages.length === 0 && (
                                                <div className="p-2 text-sm text-slate-500">등록된 단계가 없습니다.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="district_name" className="text-slate-300">사업 지구명</Label>
                                    <Input
                                        id="district_name"
                                        name="district_name"
                                        value={formData.district_name}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="예: 강남 1구역"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="area_size" className="text-slate-300">구역 면적 (㎡)</Label>
                                    <Input
                                        id="area_size"
                                        name="area_size"
                                        type="number"
                                        step="0.01"
                                        value={formData.area_size}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="0.00"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="member_count" className="text-slate-300">조합원 수</Label>
                                    <Input
                                        id="member_count"
                                        name="member_count"
                                        type="number"
                                        value={formData.member_count}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="0"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="registration_number" className="text-slate-300">사업자 등록번호</Label>
                                    <Input
                                        id="registration_number"
                                        name="registration_number"
                                        value={formData.registration_number}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="000-00-00000"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. 인허가 및 날짜 정보 */}
                    <Card className="bg-slate-800/50 border-slate-700 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-slate-700 bg-slate-800/30 flex flex-row items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <CardTitle className="text-lg font-semibold text-white">인허가 등록 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="establishment_date" className="text-slate-300 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" /> 설립 인가일
                                    </Label>
                                    <Input
                                        id="establishment_date"
                                        name="establishment_date"
                                        type="date"
                                        value={formData.establishment_date}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="approval_date" className="text-slate-300 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" /> 승인 통보일
                                    </Label>
                                    <Input
                                        id="approval_date"
                                        name="approval_date"
                                        type="date"
                                        value={formData.approval_date}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. 연락처 및 위치 정보 */}
                    <Card className="bg-slate-800/50 border-slate-700 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-slate-700 bg-slate-800/30 flex flex-row items-center gap-2">
                            <MapPin className="w-5 h-5 text-orange-400" />
                            <CardTitle className="text-lg font-semibold text-white">연락처 및 사무실 정보</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-slate-300">조합 주소 (대표)</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="조합 대표 주소를 입력하세요"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="office_address" className="text-slate-300">사무실 상세 주소</Label>
                                    <Input
                                        id="office_address"
                                        name="office_address"
                                        value={formData.office_address}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="사무실 상세 주소를 입력하세요"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-slate-300 flex items-center gap-1">
                                        <Phone className="w-4 h-4" /> 대표 전화번호
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="02-1234-5678"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="office_phone" className="text-slate-300 flex items-center gap-1">
                                        <Phone className="w-4 h-4" /> 사무실 전화번호
                                    </Label>
                                    <Input
                                        id="office_phone"
                                        name="office_phone"
                                        value={formData.office_phone}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="02-1234-5678"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300 flex items-center gap-1">
                                        <Mail className="w-4 h-4" /> 이메일 주소
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="info@example.com"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="business_hours" className="text-slate-300 flex items-center gap-1">
                                        <Clock className="w-4 h-4" /> 운영 시간
                                    </Label>
                                    <Input
                                        id="business_hours"
                                        name="business_hours"
                                        value={formData.business_hours}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        placeholder="평일 09:00~18:00"
                                        className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. 알림톡 및 시스템 설정 */}
                    <Card className="bg-slate-800/50 border-slate-700 shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-slate-700 bg-slate-800/30 flex flex-row items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-yellow-500" />
                            <CardTitle className="text-lg font-semibold text-white">알림톡 및 시스템 설정</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="kakao_channel_id" className="text-slate-300">카카오 채널 ID</Label>
                                        <Input
                                            id="kakao_channel_id"
                                            name="kakao_channel_id"
                                            value={formData.kakao_channel_id}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="@채널명"
                                            className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <Key className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Sender Key</p>
                                                <p className="text-xs">
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
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-700">
                                        <div>
                                            <Label className="text-base font-medium text-white">조합 활성화</Label>
                                            <p className="text-xs text-slate-400 mt-1">접근 제한 설정</p>
                                        </div>
                                        <Switch
                                            checked={formData.is_active}
                                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    {!union?.vault_sender_key_id && (
                                        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-yellow-200">
                                                Sender Key가 없으면 조합온 기본 채널로 발송됩니다.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 버튼 영역 */}
                    {isEditing && (
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                            >
                                취소
                            </Button>
                            <ActionButton
                                type="submit"
                                isLoading={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 h-11 px-8 rounded-lg shadow-lg"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                변경 사항 저장
                            </ActionButton>
                        </div>
                    )}
                </form>
            ) : (
                <AdDashboard _unionId={unionId} />
            )}

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
                        </div>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-yellow-200">
                                ⚠️ Sender Key는 암호화되어 저장되며, 이후 보안상 조회할 수 없습니다.
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
                        <ActionButton
                            onClick={handleRegisterSenderKey}
                            isLoading={registerSenderKeyMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Key className="w-4 h-4 mr-2" />
                            등록
                        </ActionButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
