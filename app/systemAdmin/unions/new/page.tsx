'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Building2, Info, MapPin, Phone, Mail, Clock, ShieldCheck, Calendar, SquareStack } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/app/_lib/widgets/common/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { useDevelopmentStages } from '@/app/_lib/features/development-stages/api/useDevelopmentStages';
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

export default function NewUnionPage() {
    const router = useRouter();
    const createMutation = useCreateUnion();
    const { data: stages } = useDevelopmentStages();

    const [formData, setFormData] = useState<UnionFormData>({
        name: '',
        slug: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        business_hours: '',
        logo_url: '',
        
        member_count: '',
        area_size: '',
        district_name: '',
        establishment_date: '',
        approval_date: '',
        office_address: '',
        office_phone: '',
        registration_number: '',
        business_type: '재건축', // 기본값
        current_stage_id: '',
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

    const filteredStages = stages?.filter(s => s.business_type === formData.business_type) || [];

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-4 mb-6">
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
                    <h1 className="text-2xl font-bold text-white">새 조합 등록</h1>
                </div>
            </div>

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
                                        placeholder="조합명을 입력하세요"
                                        required
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                    />
                                </div>

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
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                    />
                                    <p className="text-xs text-slate-500">
                                        URL: example.com/{formData.slug || 'slug'}
                                    </p>
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
                                placeholder="조합 소개를 입력하세요"
                                rows={3}
                                className="bg-slate-700/50 border-slate-600 text-white"
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
                                >
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                                        <SelectValue placeholder="사업 유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        <SelectItem value="재건축">재건축</SelectItem>
                                        <SelectItem value="재개발">재개발</SelectItem>
                                        <SelectItem value="지역주택">지역주택</SelectItem>
                                        <SelectItem value="기타">기타</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">현재 개발 단계</Label>
                                <Select 
                                    value={formData.current_stage_id} 
                                    onValueChange={(val) => handleSelectChange('current_stage_id', val)}
                                >
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
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
                                    placeholder="예: 강남 1구역"
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    placeholder="0.00"
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    placeholder="0"
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="registration_number" className="text-slate-300">사업자 등록번호</Label>
                                <Input
                                    id="registration_number"
                                    name="registration_number"
                                    value={formData.registration_number}
                                    onChange={handleChange}
                                    placeholder="000-00-00000"
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    placeholder="조합 대표 주소를 입력하세요"
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="office_address" className="text-slate-300">사무실 상세 주소</Label>
                                <Input
                                    id="office_address"
                                    name="office_address"
                                    value={formData.office_address}
                                    onChange={handleChange}
                                    placeholder="사무실 상세 주소를 입력하세요"
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    placeholder="02-1234-5678"
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    placeholder="02-1234-5678"
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    placeholder="info@example.com"
                                    className="bg-slate-700/50 border-slate-600 text-white"
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
                                    placeholder="평일 09:00~18:00"
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 버튼 영역 */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
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
                        className="bg-blue-600 hover:bg-blue-700 h-11 px-8 rounded-lg shadow-lg"
                    >
                        조합 등록 완료
                    </ActionButton>
                </div>
            </form>
        </div>
    );
}

