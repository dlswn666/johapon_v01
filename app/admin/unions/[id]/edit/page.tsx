'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { UnionForm, UnionEditConfirmModal, UnionFormData } from '@/app/_lib/features/union-management/ui';
import { useUnion, useUpdateUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';

export default function UnionEditPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const { data: union, isLoading, error } = useUnion(id);
    const updateMutation = useUpdateUnion();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingData, setPendingData] = useState<UnionFormData | null>(null);

    const handleSubmit = async (data: UnionFormData) => {
        setPendingData(data);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmUpdate = async () => {
        if (!pendingData) return;

        try {
            await updateMutation.mutateAsync({
                id,
                updates: {
                    name: pendingData.name,
                    description: pendingData.description || null,
                    address: pendingData.address || null,
                    phone: pendingData.phone || null,
                    email: pendingData.email || null,
                    business_hours: pendingData.business_hours || null,
                    logo_url: pendingData.logo_url || undefined,
                    is_active: pendingData.is_active,
                    member_count: pendingData.member_count || undefined,
                    area_size: typeof pendingData.area_size === 'string' ? parseFloat(pendingData.area_size) : (pendingData.area_size || undefined),
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

            toast.success('조합 정보가 수정되었습니다.');
            setIsConfirmModalOpen(false);
            router.push(`/admin/unions/${id}`);
        } catch (error: unknown) {
            console.error('Update union error:', error);
            toast.error('조합 수정에 실패했습니다.');
            setIsConfirmModalOpen(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-lg text-gray-600">조합 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error || !union) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-xl font-semibold text-gray-700">조합 정보를 찾을 수 없습니다</p>
                    <Button onClick={() => router.push('/admin/unions')}>목록으로 돌아가기</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4">
            <UnionForm
                mode="edit"
                initialData={union}
                onSubmit={handleSubmit}
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
