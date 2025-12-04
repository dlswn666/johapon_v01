'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { UnionForm } from '@/app/_lib/features/union-management/ui';
import { useCreateUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';

export default function NewUnionPage() {
    const router = useRouter();
    const createMutation = useCreateUnion();

    const handleSubmit = async (data: {
        name: string;
        slug: string;
        description: string;
        address: string;
        phone: string;
        email: string;
        business_hours: string;
        logo_url: string;
        is_active: boolean;
    }) => {
        try {
            const result = await createMutation.mutateAsync({
                name: data.name,
                slug: data.slug,
                description: data.description || null,
                address: data.address || null,
                phone: data.phone || null,
                email: data.email || null,
                business_hours: data.business_hours || null,
                logo_url: data.logo_url || null,
            });

            toast.success('조합이 등록되었습니다.');
            router.push(`/admin/unions/${result.id}`);
        } catch (error: any) {
            console.error('Create union error:', error);
            if (error?.code === '23505') {
                toast.error('이미 존재하는 Slug입니다. 다른 값을 입력해주세요.');
            } else {
                toast.error('조합 등록에 실패했습니다.');
            }
            throw error;
        }
    };

    return (
        <div className="py-4">
            <UnionForm mode="create" onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
        </div>
    );
}
