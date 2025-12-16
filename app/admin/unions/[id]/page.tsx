'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { UnionForm, UnionDeleteModal } from '@/app/_lib/features/union-management/ui';
import { useUnion, useDeleteUnion } from '@/app/_lib/features/union-management/api/useUnionManagementHook';

export default function UnionDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const { data: union, isLoading, error } = useUnion(id);
    const deleteMutation = useDeleteUnion();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleEdit = () => {
        router.push(`/admin/unions/${id}/edit`);
    };

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('조합이 삭제되었습니다.');
            router.push('/admin/unions');
        } catch (error) {
            console.error('Delete union error:', error);
            toast.error('조합 삭제에 실패했습니다.');
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
        <div className="py-4 space-y-6">
            {/* 액션 버튼 */}
            <Card className="shadow-lg max-w-3xl mx-auto">
                <CardHeader className="border-b bg-gray-50/50 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">관리</h2>
                            <p className="text-sm text-gray-500">조합 정보를 수정하거나 삭제할 수 있습니다</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleEdit} className="gap-2">
                                <Edit className="w-4 h-4" />
                                수정
                            </Button>
                            <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)} className="gap-2">
                                <Trash2 className="w-4 h-4" />
                                삭제
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* 조합 정보 폼 (읽기 전용) */}
            <UnionForm mode="view" initialData={union} />

            {/* 삭제 확인 모달 */}
            <UnionDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                unionName={union.name}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}
