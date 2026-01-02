'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnionWithActive } from '../model/useUnionManagementStore';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useDevelopmentStages } from '@/app/_lib/features/development-stages/api/useDevelopmentStages';

export interface UnionFormData {
    name: string;
    slug: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    business_hours: string;
    logo_url: string;
    is_active: boolean;
    // 신규 확장 필드
    member_count: number;
    area_size: string | number;
    district_name: string;
    establishment_date: string;
    approval_date: string;
    office_address: string;
    office_phone: string;
    registration_number: string;
    business_type: string;
    current_stage_id: string | null;
}

interface UnionFormProps {
    mode: 'create' | 'edit' | 'view';
    initialData?: UnionWithActive | null;
    onSubmit?: (data: UnionFormData) => Promise<void>;
    isSubmitting?: boolean;
}

export default function UnionForm({ mode, initialData, onSubmit, isSubmitting = false }: UnionFormProps) {
    const router = useRouter();
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
        member_count: 0,
        area_size: '',
        district_name: '',
        establishment_date: '',
        approval_date: '',
        office_address: '',
        office_phone: '',
        registration_number: '',
        business_type: '',
        current_stage_id: null,
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // 진행 단계 데이터 로드
    const { data: stages } = useDevelopmentStages(formData.business_type);

    const isReadOnly = mode === 'view';
    const showActiveToggle = mode === 'edit';

    useEffect(() => {
        if (initialData) {
            setFormData((prev) => ({
                ...prev,
                name: initialData.name || '',
                slug: initialData.slug || '',
                description: initialData.description || '',
                address: initialData.address || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                business_hours: initialData.business_hours || '',
                logo_url: initialData.logo_url || '',
                is_active: initialData.is_active ?? true,
                // 확장 필드 반영 (타입 캐스팅 및 기본값 처리)
                member_count: initialData.member_count || 0,
                area_size: initialData.area_size || '',
                district_name: initialData.district_name || '',
                establishment_date: initialData.establishment_date || '',
                approval_date: initialData.approval_date || '',
                office_address: initialData.office_address || '',
                office_phone: initialData.office_phone || '',
                registration_number: initialData.registration_number || '',
                business_type: initialData.business_type || '',
                current_stage_id: initialData.current_stage_id || null,
            }));
            if (initialData.logo_url) {
                setLogoPreview(initialData.logo_url);
            }
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // slug 자동 생성 (create 모드에서 name 변경 시)
        if (mode === 'create' && name === 'name') {
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

        // 미리보기 생성
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
        if (isReadOnly || !onSubmit) return;

        try {
            let logoUrl = formData.logo_url;
            if (logoFile) {
                logoUrl = (await uploadLogo()) || '';
            }

            await onSubmit({ ...formData, logo_url: logoUrl });
        } catch (error) {
            console.error('Submit error:', error);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'create':
                return '조합 등록';
            case 'edit':
                return '조합 수정';
            case 'view':
                return '조합 상세';
        }
    };

    return (
        <Card className="shadow-lg max-w-3xl mx-auto">
            <CardHeader className="border-b bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-xl font-semibold">{getTitle()}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 로고 업로드 */}
                    <div className="space-y-2">
                        <Label>로고</Label>
                        <div className="flex items-center gap-4">
                            {logoPreview ? (
                                <div className="relative w-24 h-24">
                                    <Image
                                        src={logoPreview}
                                        alt="로고 미리보기"
                                        fill
                                        className="rounded-lg object-cover border"
                                    />
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                            {!isReadOnly && (
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
                                        className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        이미지 선택
                                    </Label>
                                    <p className="text-xs text-gray-500 mt-1">권장: 200x200px, PNG/JPG</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 조합명 */}
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            조합명 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="조합명을 입력하세요"
                            required
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* Slug */}
                    <div className="space-y-2">
                        <Label htmlFor="slug">
                            Slug (URL 경로) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="slug"
                            name="slug"
                            value={formData.slug}
                            onChange={handleChange}
                            placeholder="예: my-union"
                            required
                            disabled={isReadOnly || mode === 'edit'}
                        />
                        <p className="text-xs text-gray-500">URL에 사용됩니다: example.com/{formData.slug || 'slug'}</p>
                    </div>

                    {/* 설명 */}
                    <div className="space-y-2">
                        <Label htmlFor="description">조합 소개</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="조합 소개를 입력하세요"
                            rows={3}
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* 사업 상세 정보 섹션 */}
                    <div className="pt-4 pb-2 border-t">
                        <h3 className="text-lg font-semibold text-gray-900">사업 상세 정보</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="business_type">사업 유형</Label>
                            <select
                                id="business_type"
                                name="business_type"
                                value={formData.business_type}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isReadOnly}
                            >
                                <option value="">선택하세요</option>
                                <option value="재개발">재개발</option>
                                <option value="재건축">재건축</option>
                                <option value="지역주택">지역주택</option>
                                <option value="가로주택정비">가로주택정비</option>
                                <option value="소규모재건축">소규모재건축</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="district_name">구역명</Label>
                            <Input
                                id="district_name"
                                name="district_name"
                                value={formData.district_name}
                                onChange={handleChange}
                                placeholder="예: 미아 3구역"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="current_stage_id">현재 진행 단계</Label>
                            <select
                                id="current_stage_id"
                                name="current_stage_id"
                                value={formData.current_stage_id || ''}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isReadOnly || !formData.business_type}
                            >
                                <option value="">선택하세요</option>
                                {stages?.map((stage) => (
                                    <option key={stage.id} value={stage.id}>
                                        {stage.stage_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="member_count">조합원 수</Label>
                            <Input
                                id="member_count"
                                name="member_count"
                                type="number"
                                value={formData.member_count}
                                onChange={handleChange}
                                placeholder="0"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="establishment_date">조합 설립일</Label>
                            <Input
                                id="establishment_date"
                                name="establishment_date"
                                type="date"
                                value={formData.establishment_date}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="approval_date">사업 시행 인가일</Label>
                            <Input
                                id="approval_date"
                                name="approval_date"
                                type="date"
                                value={formData.approval_date}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* 사업소 정보 섹션 */}
                    <div className="pt-4 pb-2 border-t">
                        <h3 className="text-lg font-semibold text-gray-900">사업소 정보</h3>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="office_address">사무실 주소</Label>
                        <Input
                            id="office_address"
                            name="office_address"
                            value={formData.office_address}
                            onChange={handleChange}
                            placeholder="사무실 상세 주소를 입력하세요"
                            disabled={isReadOnly}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="office_phone">사무실 전화번호</Label>
                            <Input
                                id="office_phone"
                                name="office_phone"
                                value={formData.office_phone}
                                onChange={handleChange}
                                placeholder="02-123-4567"
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="registration_number">사업자 등록번호</Label>
                            <Input
                                id="registration_number"
                                name="registration_number"
                                value={formData.registration_number}
                                onChange={handleChange}
                                placeholder="000-00-00000"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* 기본 정보 (기존 필드) */}
                    <div className="pt-4 pb-2 border-t">
                        <h3 className="text-lg font-semibold text-gray-900">기본 연락처 정보</h3>
                    </div>

                    {/* 주소 */}
                    <div className="space-y-2">
                        <Label htmlFor="address">주소</Label>
                        <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="조합 주소를 입력하세요"
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* 전화번호 & 이메일 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">전화번호</Label>
                            <Input
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="02-1234-5678"
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="info@example.com"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* 운영시간 */}
                    <div className="space-y-2">
                        <Label htmlFor="business_hours">운영시간</Label>
                        <Input
                            id="business_hours"
                            name="business_hours"
                            value={formData.business_hours}
                            onChange={handleChange}
                            placeholder="평일 09:00~18:00, 주말 휴무"
                            disabled={isReadOnly}
                        />
                    </div>

                    {/* 활성화 상태 (수정 모드에서만 표시) */}
                    {showActiveToggle && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <Label htmlFor="is_active" className="text-base font-medium">
                                    조합 활성화
                                </Label>
                                <p className="text-sm text-gray-500">
                                    비활성화하면 해당 조합 홈페이지에 접근할 수 없습니다
                                </p>
                            </div>
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                            />
                        </div>
                    )}

                    {/* 활성화 상태 표시 (view 모드에서) */}
                    {mode === 'view' && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <Label className="text-base font-medium">활성화 상태</Label>
                            </div>
                            <div
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    formData.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {formData.is_active ? '활성' : '비활성'}
                            </div>
                        </div>
                    )}

                    {/* 버튼 영역 */}
                    {!isReadOnly && (
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                취소
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || isUploading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {mode === 'create' ? '등록' : '수정 완료'}
                            </Button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
