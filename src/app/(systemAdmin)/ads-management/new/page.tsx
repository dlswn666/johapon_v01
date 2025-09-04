'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdAdminStore } from '@/shared/store/adAdminStore';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import { ArrowLeft, Upload, X, AlertCircle } from 'lucide-react';
import NextImage from 'next/image';
import { projectId } from '@/shared/lib/supabase';
import type { AdPlacement, BillingCycle } from '@/entities/advertisement/model/types';

// 권장 해상도 정보
const RECOMMENDED_RESOLUTIONS = {
    THUMBNAIL: {
        DESKTOP: '400x300',
        MOBILE: '600x600',
    },
    DETAIL: {
        DESKTOP: '1200x400',
        MOBILE: '1080x1080',
    },
} as const;

interface ImageUploadCardProps {
    title: string;
    value: string | null;
    onChange: (url: string | null) => void;
    recommendedResolution: string;
    required?: boolean;
    unionId?: string | null;
    unions?: Array<{ id: string; name: string; homepage: string }>;
}

function ImageUploadCard({
    title,
    value,
    onChange,
    recommendedResolution,
    required = false,
    unionId,
    unions = [],
}: ImageUploadCardProps) {
    const [uploading, setUploading] = useState(false);
    const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);

    // 이미지 정보 확인
    React.useEffect(() => {
        if (value) {
            const img = new window.Image();
            img.onload = () => {
                setImageInfo({ width: img.width, height: img.height });
            };
            img.src = value;
        } else {
            setImageInfo(null);
        }
    }, [value]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!unionId) {
            alert('이미지 업로드를 위해 먼저 조합을 선택해 주세요.');
            return;
        }

        setUploading(true);
        try {
            // 선택된 조합의 slug 찾기
            let slug = 'common'; // 기본값
            if (unionId && unions.length > 0) {
                const selectedUnion = unions.find((u) => u.id === unionId);
                if (selectedUnion && selectedUnion.homepage) {
                    slug = selectedUnion.homepage;
                }
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('target_table', 'ads');
            formData.append('slug', slug);

            const response = await fetch('/api/uploads', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('업로드 실패');
            }

            const result = await response.json();
            if (result.bucket && result.path && projectId) {
                const publicUrl = `https://${projectId}.supabase.co/storage/v1/object/public/${result.bucket}/${result.path}`;
                onChange(publicUrl);
            } else if (result.file_url) {
                onChange(result.file_url);
            } else {
                throw new Error('업로드된 파일 URL을 받을 수 없습니다.');
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const isResolutionWarning = imageInfo
        ? imageInfo.width !== parseInt(recommendedResolution.split('x')[0]) ||
          imageInfo.height !== parseInt(recommendedResolution.split('x')[1])
        : false;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    {title}
                    {required && <span className="text-red-500">*</span>}
                </CardTitle>
                <div className="text-sm text-muted-foreground">권장 해상도: {recommendedResolution}</div>
            </CardHeader>
            <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {value ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <div className="relative w-full h-32">
                                    <NextImage
                                        src={value}
                                        alt="미리보기"
                                        fill
                                        sizes="200px"
                                        className="object-contain mx-auto"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => onChange(null)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {imageInfo && (
                                <div className="text-xs text-center">
                                    <div>
                                        현재 해상도: {imageInfo.width}x{imageInfo.height}
                                    </div>
                                    {isResolutionWarning && (
                                        <div className="flex items-center justify-center gap-1 text-orange-600 mt-1">
                                            <AlertCircle className="w-3 h-3" />
                                            권장 해상도와 다릅니다
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <div className="text-sm text-gray-600 mb-2">이미지를 업로드하세요</div>
                        </div>
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="w-full mt-2 text-sm"
                    />

                    {uploading && <div className="text-center text-sm text-blue-600 mt-2">업로드 중...</div>}
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdCreatePage() {
    const router = useRouter();
    const { createAdWithContract, loading } = useAdAdminStore();

    const [unions, setUnions] = useState<Array<{ id: string; name: string; homepage: string }>>([]);
    const [loadingUnions, setLoadingUnions] = useState(false);

    const [formData, setFormData] = useState({
        // 기본 정보
        title: '',
        partner_name: '',
        phone: '',
        union_id: null as string | null,

        // 게재 위치
        placements: [] as AdPlacement[],

        // 이미지
        thumbnail_desktop_url: null as string | null, // 기존 thumbnail_url 활용
        thumbnail_mobile_url: null as string | null, // 추가 필드 (임시로 mobile_image_url 활용)
        desktop_image_url: null as string | null,
        mobile_image_url: null as string | null,

        // 계약 정보
        start_date: '',
        end_date: '',
        amount: '',
        billing_cycle: 'MONTHLY' as BillingCycle,
        auto_invoice: true,
        memo: '',

        // 상태
        is_active: true,
    });

    const [submitting, setSubmitting] = useState(false);

    // 조합 목록 불러오기
    React.useEffect(() => {
        const fetchUnions = async () => {
            setLoadingUnions(true);
            try {
                const response = await fetch('/api/admin/unions', {
                    headers: {
                        Authorization: 'Bearer temp-token',
                    },
                });

                if (!response.ok) {
                    throw new Error('조합 목록 조회 실패');
                }

                const result = await response.json();
                if (result.success) {
                    setUnions(result.data.items);
                }
            } catch (error) {
                console.error('조합 목록 조회 오류:', error);
            } finally {
                setLoadingUnions(false);
            }
        };

        fetchUnions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 유효성 검사
        if (!formData.title || !formData.partner_name || !formData.phone) {
            alert('제목, 업체명, 연락처는 필수 입력 항목입니다.');
            return;
        }

        if (formData.placements.length === 0) {
            alert('최소 하나의 게재 위치를 선택해주세요.');
            return;
        }

        if (
            !formData.thumbnail_desktop_url ||
            !formData.thumbnail_mobile_url ||
            !formData.desktop_image_url ||
            !formData.mobile_image_url
        ) {
            alert('모든 이미지를 업로드해주세요.');
            return;
        }

        if (!formData.start_date || !formData.end_date) {
            alert('계약 시작일과 종료일을 입력해주세요.');
            return;
        }

        if (new Date(formData.start_date) > new Date(formData.end_date)) {
            alert('계약 시작일은 종료일보다 이전이어야 합니다.');
            return;
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            alert('올바른 계약 금액을 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            // 광고 데이터 준비
            const adData = {
                union_id: formData.union_id,
                title: formData.title,
                partner_name: formData.partner_name,
                phone: formData.phone,
                thumbnail_url: formData.thumbnail_desktop_url, // 기존 필드 활용
                desktop_image_url: formData.desktop_image_url,
                mobile_image_url: formData.mobile_image_url,
                placements: formData.placements,
                is_active: formData.is_active,
            };

            // 계약 데이터 준비
            const contractData = {
                union_id: formData.union_id,
                start_date: formData.start_date,
                end_date: formData.end_date,
                billing_cycle: formData.billing_cycle,
                amount: parseFloat(formData.amount),
                auto_invoice: formData.auto_invoice,
                memo: formData.memo || null,
            };

            // 광고와 계약 연속 생성
            const result = await createAdWithContract(adData, contractData);

            if (!result.success) {
                alert(result.message);
                return;
            }

            alert(result.message);
            router.push('/ads-management');
        } catch (error) {
            alert('등록 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const togglePlacement = (placement: AdPlacement) => {
        setFormData((prev) => ({
            ...prev,
            placements: prev.placements.includes(placement)
                ? prev.placements.filter((p) => p !== placement)
                : [...prev.placements, placement],
        }));
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* 헤더 */}
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    뒤로가기
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">광고 등록</h1>
                    <p className="text-muted-foreground">새로운 배너 광고를 등록하고 계약을 설정하세요</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 좌측: 기본 정보, 게재 위치, 계약 */}
                    <div className="space-y-6">
                        {/* 기본 정보 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>기본 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="title">광고 제목 *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                                        placeholder="광고 제목을 입력하세요"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="partner_name">업체명 *</Label>
                                    <Input
                                        id="partner_name"
                                        value={formData.partner_name}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, partner_name: e.target.value }))
                                        }
                                        placeholder="업체명을 입력하세요"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="phone">연락처 *</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                                        placeholder="연락처를 입력하세요"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="union_id">조합</Label>
                                    <select
                                        id="union_id"
                                        value={formData.union_id || 'common'}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                union_id: e.target.value === 'common' ? null : e.target.value,
                                            }))
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        disabled={loadingUnions}
                                    >
                                        <option value="common">공통 광고</option>
                                        {unions.map((union) => (
                                            <option key={union.id} value={union.id}>
                                                {union.name}
                                            </option>
                                        ))}
                                    </select>
                                    {loadingUnions && (
                                        <div className="text-xs text-muted-foreground mt-1">조합 목록 로딩 중...</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 게재 위치 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>게재 위치 *</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    {(['SIDE', 'HOME', 'BOARD'] as AdPlacement[]).map((placement) => (
                                        <Badge
                                            key={placement}
                                            variant={formData.placements.includes(placement) ? 'default' : 'outline'}
                                            className="cursor-pointer px-4 py-2"
                                            onClick={() => togglePlacement(placement)}
                                        >
                                            {placement === 'SIDE' ? '사이드' : placement === 'HOME' ? '홈' : '게시판'}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 계약 정보 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>계약 정보</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="start_date">계약 시작일 *</Label>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                                            }
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="end_date">계약 종료일 *</Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="amount">계약 금액 *</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={formData.amount}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                                        placeholder="계약 금액을 입력하세요"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="billing_cycle">청구 주기 *</Label>
                                    <select
                                        id="billing_cycle"
                                        value={formData.billing_cycle}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                billing_cycle: e.target.value as BillingCycle,
                                            }))
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="MONTHLY">월간</option>
                                        <option value="YEARLY">연간</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="auto_invoice"
                                        checked={formData.auto_invoice}
                                        onCheckedChange={(checked) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                auto_invoice: checked,
                                            }))
                                        }
                                    />
                                    <Label htmlFor="auto_invoice">자동 청구</Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 상태 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>광고 상태</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                is_active: checked,
                                            }))
                                        }
                                    />
                                    <Label htmlFor="is_active">광고 활성화</Label>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 우측: 이미지 */}
                    <div className="space-y-6">
                        {/* 썸네일 이미지 */}
                        <div className="grid grid-cols-1 gap-4">
                            <ImageUploadCard
                                title="썸네일 (데스크톱)"
                                value={formData.thumbnail_desktop_url}
                                onChange={(url) => setFormData((prev) => ({ ...prev, thumbnail_desktop_url: url }))}
                                recommendedResolution={RECOMMENDED_RESOLUTIONS.THUMBNAIL.DESKTOP}
                                required
                                unionId={formData.union_id}
                                unions={unions}
                            />
                            <ImageUploadCard
                                title="썸네일 (모바일)"
                                value={formData.thumbnail_mobile_url}
                                onChange={(url) => setFormData((prev) => ({ ...prev, thumbnail_mobile_url: url }))}
                                recommendedResolution={RECOMMENDED_RESOLUTIONS.THUMBNAIL.MOBILE}
                                required
                                unionId={formData.union_id}
                                unions={unions}
                            />
                        </div>

                        {/* 상세 이미지 */}
                        <div className="grid grid-cols-1 gap-4">
                            <ImageUploadCard
                                title="상세 이미지 (데스크톱)"
                                value={formData.desktop_image_url}
                                onChange={(url) => setFormData((prev) => ({ ...prev, desktop_image_url: url }))}
                                recommendedResolution={RECOMMENDED_RESOLUTIONS.DETAIL.DESKTOP}
                                required
                                unionId={formData.union_id}
                                unions={unions}
                            />
                            <ImageUploadCard
                                title="상세 이미지 (모바일)"
                                value={formData.mobile_image_url}
                                onChange={(url) => setFormData((prev) => ({ ...prev, mobile_image_url: url }))}
                                recommendedResolution={RECOMMENDED_RESOLUTIONS.DETAIL.MOBILE}
                                required
                                unionId={formData.union_id}
                                unions={unions}
                            />
                        </div>
                    </div>
                </div>

                {/* 제출 버튼 */}
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        취소
                    </Button>
                    <Button type="submit" disabled={submitting || loading}>
                        {submitting ? '등록 중...' : '광고 등록'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
