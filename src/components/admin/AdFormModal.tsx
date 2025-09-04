'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { X, Upload, AlertCircle } from 'lucide-react';
import type { AdCreateData, AdUpdateData, Ad, AdPlacement } from '@/entities/advertisement/model/types';

interface AdFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AdCreateData | AdUpdateData) => Promise<{ success: boolean; message: string }>;
    editingAd?: Ad | null;
    title: string;
}

// 권장 해상도 정보
const RECOMMENDED_RESOLUTIONS = {
    SIDE: {
        MOBILE: '600x600',
        DESKTOP: '400x300',
    },
    HOME: {
        MOBILE: '1080x1080',
        DESKTOP: '1200x400',
    },
    BOARD: {
        MOBILE: '1080x1080',
        DESKTOP: '800x450',
    },
} as const;

interface ImageUploadProps {
    label: string;
    value: string | null;
    onChange: (url: string | null) => void;
    recommendedResolution: string;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    deviceType: 'DESKTOP' | 'MOBILE';
}

function ImageUpload({
    label,
    value,
    onChange,
    recommendedResolution,
    enabled,
    onEnabledChange,
    deviceType,
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);

    // 이미지 정보 확인
    useEffect(() => {
        if (value) {
            const img = new Image();
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

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/uploads', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('업로드 실패');
            }

            const result = await response.json();
            if (result.success) {
                onChange(result.data.url);
            } else {
                throw new Error(result.error?.message || '업로드 실패');
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
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{label}</Label>
                <div className="flex items-center gap-2">
                    <Label htmlFor={`${deviceType}-enabled`} className="text-sm">
                        활성화
                    </Label>
                    <Switch id={`${deviceType}-enabled`} checked={enabled} onCheckedChange={onEnabledChange} />
                </div>
            </div>

            <div className="text-xs text-muted-foreground">권장 해상도: {recommendedResolution}</div>

            {enabled && (
                <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {value ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <img
                                        src={value}
                                        alt="미리보기"
                                        className="max-w-full h-32 object-contain mx-auto"
                                    />
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
                </div>
            )}
        </div>
    );
}

export default function AdFormModal({ isOpen, onClose, onSubmit, editingAd, title }: AdFormModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        partner_name: '',
        phone: '',
        thumbnail_url: null as string | null,
        detail_image_url: null as string | null,
        desktop_image_url: null as string | null,
        mobile_image_url: null as string | null,
        desktop_enabled: true,
        mobile_enabled: true,
        placements: [] as AdPlacement[],
        is_active: true,
        union_id: null as string | null,
    });

    const [submitting, setSubmitting] = useState(false);

    // 편집 모드일 때 데이터 설정
    useEffect(() => {
        if (editingAd) {
            setFormData({
                title: editingAd.title,
                partner_name: editingAd.partner_name,
                phone: editingAd.phone,
                thumbnail_url: editingAd.thumbnail_url,
                detail_image_url: editingAd.detail_image_url,
                desktop_image_url: editingAd.desktop_image_url,
                mobile_image_url: editingAd.mobile_image_url,
                desktop_enabled: editingAd.desktop_enabled,
                mobile_enabled: editingAd.mobile_enabled,
                placements: editingAd.placements,
                is_active: editingAd.is_active,
                union_id: editingAd.union_id,
            });
        } else {
            // 새 광고 생성 시 초기화
            setFormData({
                title: '',
                partner_name: '',
                phone: '',
                thumbnail_url: null,
                detail_image_url: null,
                desktop_image_url: null,
                mobile_image_url: null,
                desktop_enabled: true,
                mobile_enabled: true,
                placements: [],
                is_active: true,
                union_id: null,
            });
        }
    }, [editingAd, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 유효성 검사
        if (!formData.title || !formData.partner_name || !formData.phone) {
            alert('필수 필드를 모두 입력해주세요.');
            return;
        }

        if (formData.placements.length === 0) {
            alert('최소 하나의 게재 위치를 선택해주세요.');
            return;
        }

        if (!formData.desktop_enabled && !formData.mobile_enabled) {
            alert('적어도 하나의 디바이스가 활성화되어야 합니다.');
            return;
        }

        // 디바이스별 이미지 검증
        if (formData.desktop_enabled && !formData.desktop_image_url && !formData.detail_image_url) {
            alert('데스크톱이 활성화된 경우 데스크톱 이미지 또는 기본 이미지가 필요합니다.');
            return;
        }

        if (formData.mobile_enabled && !formData.mobile_image_url && !formData.detail_image_url) {
            alert('모바일이 활성화된 경우 모바일 이미지 또는 기본 이미지가 필요합니다.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await onSubmit(formData);
            if (result.success) {
                alert(result.message);
                onClose();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('처리 중 오류가 발생했습니다.');
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

    // 현재 선택된 게재 위치에 따른 권장 해상도
    const getRecommendedResolution = (deviceType: 'DESKTOP' | 'MOBILE') => {
        const primaryPlacement = formData.placements[0] || 'SIDE';
        return RECOMMENDED_RESOLUTIONS[primaryPlacement][deviceType];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <Button type="button" variant="outline" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* 기본 정보 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="title">광고명 *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="광고명을 입력하세요"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="partner_name">업체명 *</Label>
                            <Input
                                id="partner_name"
                                value={formData.partner_name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, partner_name: e.target.value }))}
                                placeholder="업체명을 입력하세요"
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">전화번호 *</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                                placeholder="전화번호를 입력하세요"
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
                            >
                                <option value="common">공통 광고</option>
                                {/* TODO: 실제 조합 목록 추가 */}
                            </select>
                        </div>
                    </div>

                    {/* 게재 위치 선택 */}
                    <div>
                        <Label>게재 위치 *</Label>
                        <div className="flex gap-2 mt-2">
                            {(['SIDE', 'HOME', 'BOARD'] as AdPlacement[]).map((placement) => (
                                <Badge
                                    key={placement}
                                    variant={formData.placements.includes(placement) ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => togglePlacement(placement)}
                                >
                                    {placement}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* 디바이스별 이미지 업로드 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 모바일 이미지 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">모바일용 이미지</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ImageUpload
                                    label="모바일 이미지"
                                    value={formData.mobile_image_url}
                                    onChange={(url) => setFormData((prev) => ({ ...prev, mobile_image_url: url }))}
                                    recommendedResolution={getRecommendedResolution('MOBILE')}
                                    enabled={formData.mobile_enabled}
                                    onEnabledChange={(enabled) =>
                                        setFormData((prev) => ({ ...prev, mobile_enabled: enabled }))
                                    }
                                    deviceType="MOBILE"
                                />
                            </CardContent>
                        </Card>

                        {/* 데스크톱 이미지 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">데스크톱용 이미지</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ImageUpload
                                    label="데스크톱 이미지"
                                    value={formData.desktop_image_url}
                                    onChange={(url) => setFormData((prev) => ({ ...prev, desktop_image_url: url }))}
                                    recommendedResolution={getRecommendedResolution('DESKTOP')}
                                    enabled={formData.desktop_enabled}
                                    onEnabledChange={(enabled) =>
                                        setFormData((prev) => ({ ...prev, desktop_enabled: enabled }))
                                    }
                                    deviceType="DESKTOP"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* 기본 이미지 (호환성용) */}
                    <div>
                        <Label htmlFor="detail_image_url">기본 이미지 (호환성용)</Label>
                        <Input
                            id="detail_image_url"
                            value={formData.detail_image_url || ''}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, detail_image_url: e.target.value || null }))
                            }
                            placeholder="기본 이미지 URL (디바이스별 이미지가 없을 때 사용)"
                        />
                    </div>

                    {/* 썸네일 이미지 */}
                    <div>
                        <Label htmlFor="thumbnail_url">썸네일 이미지</Label>
                        <Input
                            id="thumbnail_url"
                            value={formData.thumbnail_url || ''}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, thumbnail_url: e.target.value || null }))
                            }
                            placeholder="썸네일 이미지 URL"
                        />
                    </div>

                    {/* 활성화 상태 */}
                    <div className="flex items-center gap-2">
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                        />
                        <Label htmlFor="is_active">광고 활성화</Label>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            취소
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? '처리 중...' : editingAd ? '수정' : '등록'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
