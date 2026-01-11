'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Settings, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { UnionForm, UnionEditConfirmModal, UnionFormData } from '@/app/_lib/features/union-management/ui';
import { useUpdateUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';
import { Button } from '@/components/ui/button';

export default function UnionSettingsPage() {
    const { union, isLoading: isUnionLoading } = useSlug();
    const router = useRouter();
    const updateMutation = useUpdateUnion();

    // view: 상세 보기 모드, edit: 수정 모드
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingData, setPendingData] = useState<UnionFormData | null>(null);

    const handleSubmit = async (data: UnionFormData) => {
        setPendingData(data);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmUpdate = async () => {
        if (!pendingData || !union) return;

        try {
            await updateMutation.mutateAsync({
                id: union.id,
                updates: {
                    name: pendingData.name,
                    description: pendingData.description || null,
                    address: pendingData.address || null,
                    phone: pendingData.phone || null,
                    email: pendingData.email || null,
                    business_hours: pendingData.business_hours || null,
                    logo_url: pendingData.logo_url || undefined,
                    is_active: pendingData.is_active,
                    member_count: Number(pendingData.member_count) || undefined,
                    area_size:
                        typeof pendingData.area_size === 'string'
                            ? parseFloat(pendingData.area_size)
                            : pendingData.area_size || undefined,
                    district_name: pendingData.district_name || undefined,
                    establishment_date: pendingData.establishment_date || undefined,
                    approval_date: pendingData.approval_date || undefined,
                    office_address: pendingData.office_address || undefined,
                    office_phone: pendingData.office_phone || undefined,
                    registration_number: pendingData.registration_number || undefined,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    business_type: (pendingData.business_type as any) || undefined,
                    current_stage_id: pendingData.current_stage_id || undefined,
                },
            });

            toast.success('조합 정보 및 단계 설정이 저장되었습니다.');
            setIsConfirmModalOpen(false);
            setMode('view'); // 저장 완료 후 view 모드로 전환
            router.refresh();
        } catch (error: unknown) {
            console.error('Update union error:', error);
            toast.error('저장에 실패했습니다.');
            setIsConfirmModalOpen(false);
        }
    };

    const handleCancel = () => {
        setMode('view'); // 취소 시 view 모드로 전환
    };

    if (isUnionLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-[#4e8c6d]" />
                    <p className="text-lg text-gray-600">조합 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!union) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">조합 정보를 찾을 수 없습니다</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-[1280px] px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-[32px] font-bold text-[#4e8c6d] flex items-center gap-3">
                        <Settings className="w-8 h-8" />
                        조합 정보 설정
                    </h1>
                    <p className="text-gray-500 mt-2">조합의 기본 정보와 사업 진행 단계를 통합 관리합니다.</p>
                </div>
                {mode === 'view' && (
                    <Button
                        onClick={() => setMode('edit')}
                        className="bg-[#4E8C6D] hover:bg-[#3d7359] text-white flex items-center gap-2"
                    >
                        <Pencil className="w-4 h-4" />
                        수정
                    </Button>
                )}
            </div>

            <UnionForm
                mode={mode}
                initialData={union}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={updateMutation.isPending}
            />

            {/* 수정 확인 모달 */}
            <UnionEditConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmUpdate}
                unionName={union.name}
                isUpdating={updateMutation.isPending}
            />
        </div>
    );
}
