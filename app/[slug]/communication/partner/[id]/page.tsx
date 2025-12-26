'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAd, useDeleteAd } from '@/app/_lib/features/advertisement/api/useAdvertisement';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

const PartnerDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    
    const { isLoading: isUnionLoading } = useSlug();
    const { isSystemAdmin } = useAuth();
    
    const { data: ad, isLoading, error } = useAd(id);
    const { mutate: deleteAd } = useDeleteAd();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    const handleDelete = () => {
        openConfirmModal({
            title: '협력 업체 삭제',
            message: '정말로 이 협력 업체를 삭제하시겠습니까?',
            onConfirm: () => {
                deleteAd(id, {
                    onSuccess: () => {
                        router.push(`/${slug}/communication/partner`);
                    }
                });
            },
        });
    };

    if (isUnionLoading || isLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (error || !ad) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">협력 업체를 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8 md:py-12')}>
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* 상단 네비게이션 및 액션 */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-8">
                        <div className="space-y-2">
                            <button 
                                onClick={() => router.push(`/${slug}/communication/partner`)}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#4E8C6D] transition-colors cursor-pointer group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                목록으로 돌아가기
                            </button>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
                                {ad.title || ad.business_name}
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            {isSystemAdmin && (
                                <div className="flex items-center gap-2 mr-2 pr-4 border-r border-gray-200">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 uppercase tracking-wider">
                                        <ShieldCheck className="w-3 h-3" />
                                        Admin
                                    </div>
                                    <Button 
                                        variant="outline"
                                        className="border-gray-200 text-gray-600 hover:bg-gray-50 h-9" 
                                        onClick={() => router.push(`/${slug}/admin/advertisements/${id}/edit`)} // 관리자 페이지로 이동 가정
                                    >
                                        수정
                                    </Button>
                                    <Button 
                                        variant="destructive"
                                        className="bg-rose-500 hover:bg-rose-600 h-9" 
                                        onClick={handleDelete}
                                    >
                                        삭제
                                    </Button>
                                </div>
                            )}
                            {ad.link_url && (
                                <Button 
                                    className="bg-[#4E8C6D] hover:bg-[#3d7a5c] text-white flex items-center gap-2 shadow-lg shadow-emerald-700/10 h-10 px-6 rounded-xl"
                                    onClick={() => window.open(ad.link_url!, '_blank')}
                                >
                                    홈페이지 방문
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 업체 정보 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-8">
                            {/* 상세 내용 */}
                            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    상세 설명
                                </h3>
                                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {ad.content || `${ad.business_name}에서 제공하는 특별한 서비스를 만나보세요.`}
                                </div>
                            </div>
                        </div>

                        {/* 사이드바 정보 */}
                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Partner Info</h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">업체명</p>
                                        <p className="text-base font-bold text-slate-800">{ad.business_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">등록일</p>
                                        <p className="text-base font-medium text-slate-600">
                                            {new Date(ad.contract_start_date).toLocaleDateString('ko-KR')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default PartnerDetailPage;
