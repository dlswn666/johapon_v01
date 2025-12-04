'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { UnionForm, UnionEditConfirmModal } from '@/app/_lib/features/union-management/ui';
import { useUnion, useUpdateUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';

interface UnionEditPageProps {
    params: Promise<{ id: string }>;
}

interface FormData {
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

export default function UnionEditPage({ params }: UnionEditPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { data: union, isLoading, error } = useUnion(id);
    const updateMutation = useUpdateUnion();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingData, setPendingData] = useState<FormData | null>(null);

    const handleSubmit = async (data: FormData) => {
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
                    logo_url: pendingData.logo_url || null,
                    is_active: pendingData.is_active,
                },
            });

            toast.success('조합 정보가 수정되었습니다.');
            setIsConfirmModalOpen(false);
            router.push(`/admin/unions/${id}`);
        } catch (error: any) {
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
