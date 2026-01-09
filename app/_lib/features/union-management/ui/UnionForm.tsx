'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnionWithActive } from '../model/useUnionManagementStore';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useDevelopmentStages } from '@/app/_lib/features/development-stages/api/useDevelopmentStages';

// 영문 ENUM → 한글 매핑 (development_stages 테이블과 동기화용)
const BUSINESS_TYPE_TO_KOREAN: Record<string, string> = {
    REDEVELOPMENT: '재개발',
    RECONSTRUCTION: '재건축',
    HOUSING_ASSOCIATION: '지역주택',
    STREET_HOUSING: '가로주택정비',
    SMALL_RECONSTRUCTION: '소규모재건축',
};

// 사업 유형 옵션
const BUSINESS_TYPE_OPTIONS = [
    { value: 'REDEVELOPMENT', label: '재개발' },
    { value: 'RECONSTRUCTION', label: '재건축' },
    { value: 'HOUSING_ASSOCIATION', label: '지역주택' },
    { value: 'STREET_HOUSING', label: '가로주택정비' },
    { value: 'SMALL_RECONSTRUCTION', label: '소규모재건축' },
];

// Zod 스키마 정의
const unionFormSchema = z.object({
    name: z.string().min(1, '조합명을 입력해주세요.'),
    slug: z.string().min(1, 'Slug를 입력해주세요.'),
    description: z.string().optional(),
    logo_url: z.string().optional(),
    // 조합 정보 (사업소 정보)
    office_address: z.string().optional(),
    office_phone: z.string().optional(),
    registration_number: z.string().optional(),
    business_hours: z.string().optional(),
    // 조합 상세 정보 (사업 상세 정보)
    business_type: z.string().optional(),
    district_name: z.string().optional(),
    current_stage_id: z.string().nullable().optional(),
    member_count: z.coerce.number().optional(),
    area_size: z.string().optional(),
    establishment_date: z.string().optional(),
    approval_date: z.string().optional(),
});

export type UnionFormData = z.infer<typeof unionFormSchema> & {
    is_active?: boolean;
    address?: string;
    phone?: string;
    email?: string;
};

interface UnionFormProps {
    mode: 'create' | 'edit' | 'view';
    initialData?: UnionWithActive | null;
    onSubmit?: (data: UnionFormData) => Promise<void>;
    isSubmitting?: boolean;
}

export default function UnionForm({ mode, initialData, onSubmit, isSubmitting = false }: UnionFormProps) {
    const router = useRouter();
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const isReadOnly = mode === 'view';

    const form = useForm<z.infer<typeof unionFormSchema>>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(unionFormSchema) as any,
        defaultValues: {
            name: '',
            slug: '',
            description: '',
            logo_url: '',
            office_address: '',
            office_phone: '',
            registration_number: '',
            business_hours: '',
            business_type: '',
            district_name: '',
            current_stage_id: null,
            member_count: 0,
            area_size: '',
            establishment_date: '',
            approval_date: '',
        },
    });

    const businessType = form.watch('business_type');

    // 영문 ENUM을 한글로 변환하여 development_stages 조회
    const koreanBusinessType = businessType ? BUSINESS_TYPE_TO_KOREAN[businessType] : undefined;
    const { data: stages } = useDevelopmentStages(koreanBusinessType);

    // initialData가 변경되면 폼 값 업데이트
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name || '',
                slug: initialData.slug || '',
                description: initialData.description || '',
                logo_url: initialData.logo_url || '',
                office_address: initialData.office_address || '',
                office_phone: initialData.office_phone || '',
                registration_number: initialData.registration_number || '',
                business_hours: initialData.business_hours || '',
                business_type: initialData.business_type || '',
                district_name: initialData.district_name || '',
                current_stage_id: initialData.current_stage_id || null,
                member_count: initialData.member_count || 0,
                area_size: initialData.area_size?.toString() || '',
                establishment_date: initialData.establishment_date || '',
                approval_date: initialData.approval_date || '',
            });
            if (initialData.logo_url) {
                setLogoPreview(initialData.logo_url);
            }
        }
    }, [initialData, form]);

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
        form.setValue('logo_url', '');
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return form.getValues('logo_url') || null;

        setIsUploading(true);
        try {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `union-logos/${form.getValues('slug')}-${Date.now()}.${fileExt}`;

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

    const handleFormSubmit = async (values: z.infer<typeof unionFormSchema>) => {
        if (isReadOnly || !onSubmit) return;

        try {
            let logoUrl = values.logo_url || '';
            if (logoFile) {
                logoUrl = (await uploadLogo()) || '';
            }

            await onSubmit({
                ...values,
                logo_url: logoUrl,
                is_active: initialData?.is_active ?? true,
            });
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

    // slug 자동 생성 (create 모드에서 name 변경 시)
    const handleNameChange = (value: string) => {
        if (mode === 'create') {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9가-힣]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            form.setValue('slug', slug);
        }
    };

    return (
        <Card className="shadow-lg max-w-4xl mx-auto">
            <CardHeader className="border-b bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-xl font-semibold">{getTitle()}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                        {/* ==================== 기본 정보 ==================== */}
                        
                        {/* 로고 업로드 */}
                        <div className="space-y-2">
                            <FormLabel className="text-[16px] font-bold text-[#5FA37C]">로고</FormLabel>
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
                                        <FormLabel
                                            htmlFor="logo-upload"
                                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            이미지 선택
                                        </FormLabel>
                                        <p className="text-xs text-gray-500 mt-1">권장: 200x200px, PNG/JPG</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 조합명 */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">
                                        조합명 <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="조합명을 입력하세요"
                                            disabled={isReadOnly}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                handleNameChange(e.target.value);
                                            }}
                                            className={cn(
                                                'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                'bg-white'
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Slug */}
                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">
                                        Slug (URL 경로) <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="예: my-union"
                                            disabled={isReadOnly || mode === 'edit'}
                                            className={cn(
                                                'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                'bg-white'
                                            )}
                                        />
                                    </FormControl>
                                    <p className="text-xs text-gray-500">URL에 사용됩니다: example.com/{field.value || 'slug'}</p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 조합 소개 */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">조합 소개</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="조합 소개를 입력하세요"
                                            rows={3}
                                            disabled={isReadOnly}
                                            className={cn(
                                                'text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                'bg-white'
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* ==================== 조합 정보 (기존 사업소 정보) ==================== */}
                        <div className="pt-4 pb-2 border-t">
                            <h3 className="text-lg font-semibold text-gray-900">조합 정보</h3>
                        </div>

                        {/* 사무실 주소 */}
                        <FormField
                            control={form.control}
                            name="office_address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">사무실 주소</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="사무실 상세 주소를 입력하세요"
                                            disabled={isReadOnly}
                                            className={cn(
                                                'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                'bg-white'
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 사무실 전화번호 */}
                            <FormField
                                control={form.control}
                                name="office_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">사무실 전화번호</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="02-123-4567"
                                                disabled={isReadOnly}
                                                className={cn(
                                                    'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                    'bg-white'
                                                )}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 사업자 등록번호 */}
                            <FormField
                                control={form.control}
                                name="registration_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">사업자 등록번호</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="000-00-00000"
                                                disabled={isReadOnly}
                                                className={cn(
                                                    'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                    'bg-white'
                                                )}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* 운영시간 (기본 연락처 정보에서 이동) */}
                        <FormField
                            control={form.control}
                            name="business_hours"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">운영시간</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="평일 09:00~18:00, 주말 휴무"
                                            disabled={isReadOnly}
                                            className={cn(
                                                'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                'bg-white'
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* ==================== 조합 상세 정보 (기존 사업 상세 정보) ==================== */}
                        <div className="pt-4 pb-2 border-t">
                            <h3 className="text-lg font-semibold text-gray-900">조합 상세 정보</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 사업 유형 */}
                            <FormField
                                control={form.control}
                                name="business_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">사업 유형</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                            disabled={isReadOnly}
                                        >
                                            <FormControl>
                                                <SelectTrigger
                                                    className={cn(
                                                        'h-[48px] w-full text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                        'bg-white'
                                                    )}
                                                >
                                                    <SelectValue placeholder="선택하세요" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {BUSINESS_TYPE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 구역명 */}
                            <FormField
                                control={form.control}
                                name="district_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">구역명</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="예: 미아 3구역"
                                                disabled={isReadOnly}
                                                className={cn(
                                                    'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                    'bg-white'
                                                )}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 현재 진행 단계 */}
                            <FormField
                                control={form.control}
                                name="current_stage_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">현재 진행 단계</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                            disabled={isReadOnly || !businessType}
                                        >
                                            <FormControl>
                                                <SelectTrigger
                                                    className={cn(
                                                        'h-[48px] w-full text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                        'bg-white'
                                                    )}
                                                >
                                                    <SelectValue placeholder={businessType ? '선택하세요' : '사업 유형을 먼저 선택하세요'} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {stages?.map((stage) => (
                                                    <SelectItem key={stage.id} value={stage.id}>
                                                        {stage.stage_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 조합원 수 */}
                            <FormField
                                control={form.control}
                                name="member_count"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">조합원 수</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                placeholder="0"
                                                disabled={isReadOnly}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                className={cn(
                                                    'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                    'bg-white'
                                                )}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 조합 설립일 */}
                            <FormField
                                control={form.control}
                                name="establishment_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">조합 설립일</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="date"
                                                disabled={isReadOnly}
                                                className={cn(
                                                    'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                    'bg-white'
                                                )}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 사업 시행 인가일 */}
                            <FormField
                                control={form.control}
                                name="approval_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">사업 시행 인가일</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="date"
                                                disabled={isReadOnly}
                                                className={cn(
                                                    'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                    'bg-white'
                                                )}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* 사업 면적 (추가) */}
                        <FormField
                            control={form.control}
                            name="area_size"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[16px] font-bold text-[#5FA37C]">사업 면적 (㎡)</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="text"
                                            placeholder="예: 12000"
                                            disabled={isReadOnly}
                                            className={cn(
                                                'h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]',
                                                'bg-white'
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 버튼 영역 */}
                        {!isReadOnly && (
                            <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    취소
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isUploading}
                                    className="bg-[#4E8C6D] hover:bg-[#3d7359]"
                                >
                                    {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {mode === 'create' ? '등록' : '수정 완료'}
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
