'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    MapPin, 
    Users, 
    Building2, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Percent,
    User,
    Phone,
    Pencil,
    Trash2,
    Loader2
} from 'lucide-react';
import { useParcelDetail, ParcelDetail, ConsentStageStatus, Owner } from '../api/useParcelDetail';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { updateParcelInfo, deleteParcel } from '../actions/parcelActions';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import toast from 'react-hot-toast';

interface ParcelDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pnu: string | null;
    stageId: string | null;
    unionId?: string;
    onDeleted?: () => void;
}

export default function ParcelDetailModal({ 
    open, 
    onOpenChange, 
    pnu, 
    stageId,
    unionId,
    onDeleted 
}: ParcelDetailModalProps) {
    const { data: parcel, isLoading, refetch } = useParcelDetail(pnu, stageId);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // 삭제 mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!pnu || !unionId) throw new Error('필수 정보가 없습니다.');
            return deleteParcel({ pnu, unionId });
        },
        onSuccess: () => {
            toast.success('필지가 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['consent-map', unionId] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', pnu] });
            setIsDeleteDialogOpen(false);
            onOpenChange(false);
            onDeleted?.();
        },
        onError: (error: Error) => {
            toast.error(error.message || '삭제에 실패했습니다.');
        },
    });

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            필지 상세 정보
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {isLoading ? (
                            <LoadingSkeleton />
                        ) : parcel ? (
                            <>
                                {/* 필지 기본 정보 + 수정/삭제 버튼 */}
                                <ParcelBasicInfo 
                                    parcel={parcel} 
                                    onEdit={() => setIsEditModalOpen(true)}
                                    onDelete={() => setIsDeleteDialogOpen(true)}
                                />

                                {/* 동의 단계별 현황 */}
                                <ConsentStagesSection 
                                    stages={parcel.consent_stages} 
                                    currentStageId={stageId}
                                />

                                {/* 소유주 목록 */}
                                <OwnersSection parcel={parcel} />
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                필지 정보를 불러올 수 없습니다.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 수정 모달 */}
            {parcel && (
                <EditParcelModal
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    parcel={parcel}
                    unionId={unionId}
                    onSuccess={() => {
                        refetch();
                        setIsEditModalOpen(false);
                    }}
                />
            )}

            {/* 삭제 확인 대화상자 */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>필지를 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. 필지와 관련된 모든 데이터가 삭제되며, 
                            지도에서도 해당 필지가 제거됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                deleteMutation.mutate();
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    삭제 중...
                                </>
                            ) : (
                                '삭제'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// 필지 기본 정보
function ParcelBasicInfo({ 
    parcel, 
    onEdit, 
    onDelete 
}: { 
    parcel: ParcelDetail; 
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">주소</p>
                    <p className="font-semibold text-gray-900">{parcel.address}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className="h-8"
                    >
                        <Pencil className="w-3 h-3 mr-1" />
                        수정
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelete}
                        className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-3 h-3 mr-1" />
                        삭제
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs">호수</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{parcel.summary.total_units}</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">소유주</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{parcel.summary.total_owners}</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs">면적</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                        {parcel.land_area ? `${parcel.land_area.toLocaleString()}㎡` : '-'}
                    </p>
                </div>
            </div>
        </div>
    );
}

// 수정 모달
interface EditParcelModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parcel: ParcelDetail;
    unionId?: string;
    onSuccess: () => void;
}

function EditParcelModal({ open, onOpenChange, parcel, unionId, onSuccess }: EditParcelModalProps) {
    const [formData, setFormData] = useState({
        owner_count: parcel.summary.total_owners,
        land_area: parcel.land_area || 0,
    });

    // 모달이 열릴 때 데이터 초기화
    React.useEffect(() => {
        if (open) {
            setFormData({
                owner_count: parcel.summary.total_owners,
                land_area: parcel.land_area || 0,
            });
        }
    }, [open, parcel]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            return updateParcelInfo({
                pnu: parcel.pnu,
                owner_count: formData.owner_count,
                land_area: formData.land_area,
            });
        },
        onSuccess: () => {
            toast.success('필지 정보가 수정되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['consent-map', unionId] });
            queryClient.invalidateQueries({ queryKey: ['parcel-detail', parcel.pnu] });
            onSuccess();
        },
        onError: (error: Error) => {
            toast.error(error.message || '수정에 실패했습니다.');
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>필지 정보 수정</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="owner_count">소유주수</Label>
                        <Input
                            id="owner_count"
                            type="number"
                            min={0}
                            value={formData.owner_count}
                            onChange={(e) => setFormData({ ...formData, owner_count: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="land_area">면적 (㎡)</Label>
                        <Input
                            id="land_area"
                            type="number"
                            min={0}
                            step={0.01}
                            value={formData.land_area}
                            onChange={(e) => setFormData({ ...formData, land_area: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={updateMutation.isPending}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            '저장'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// 동의 단계별 현황
function ConsentStagesSection({ 
    stages, 
    currentStageId 
}: { 
    stages: ConsentStageStatus[]; 
    currentStageId: string | null;
}) {
    if (stages.length === 0) {
        return null;
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                동의 단계별 현황
            </h3>
            <div className="space-y-2">
                {stages.map((stage) => (
                    <div 
                        key={stage.stage_id}
                        className={cn(
                            "p-3 rounded-lg border transition-all",
                            stage.stage_id === currentStageId 
                                ? "border-primary bg-primary/5" 
                                : "border-gray-200 bg-white"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{stage.stage_name}</span>
                                {stage.stage_id === currentStageId && (
                                    <Badge className="bg-primary text-white text-xs">현재</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-sm font-bold",
                                    stage.is_completed ? "text-green-600" : "text-orange-500"
                                )}>
                                    {stage.consent_rate}%
                                </span>
                                <span className="text-xs text-gray-400">
                                    / {stage.required_rate}%
                                </span>
                            </div>
                        </div>

                        {/* 프로그레스 바 */}
                        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={cn(
                                    "absolute inset-y-0 left-0 rounded-full transition-all",
                                    stage.is_completed ? "bg-green-500" : "bg-orange-400"
                                )}
                                style={{ width: `${Math.min(stage.consent_rate, 100)}%` }}
                            />
                            {/* 목표선 */}
                            <div 
                                className="absolute inset-y-0 w-0.5 bg-gray-400"
                                style={{ left: `${stage.required_rate}%` }}
                            />
                        </div>

                        {/* 상세 카운트 */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                동의 {stage.agreed_owners}
                            </span>
                            <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-500" />
                                미동의 {stage.disagreed_owners}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                미제출 {stage.pending_owners}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 소유주 목록
function OwnersSection({ parcel }: { parcel: ParcelDetail }) {
    // 소유주 정보가 없으면 섹션 자체를 숨김
    if (parcel.building_units.length === 0) {
        return null;
    }

    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                소유주 목록
            </h3>
            <div className="space-y-3">
                {parcel.building_units.map((unit) => (
                    <div key={unit.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* 호수 정보 */}
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">
                                {unit.dong && `${unit.dong}동 `}
                                {unit.ho ? `${unit.ho}호` : '호수 정보 없음'}
                            </span>
                            {unit.exclusive_area && (
                                <span className="text-xs text-gray-400 ml-auto">
                                    전용 {unit.exclusive_area}㎡
                                </span>
                            )}
                        </div>

                        {/* 소유주 목록 */}
                        <div className="divide-y divide-gray-100">
                            {unit.owners.map((owner) => (
                                <OwnerRow key={owner.id} owner={owner} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 소유주 행
function OwnerRow({ owner }: { owner: Owner }) {
    const statusConfig = {
        AGREED: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: '동의' },
        DISAGREED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '미동의' },
        PENDING: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50', label: '미제출' }
    };

    const status = statusConfig[owner.consent_status || 'PENDING'];
    const StatusIcon = status.icon;

    return (
        <div className="px-3 py-2 flex items-center gap-3 hover:bg-gray-50/50">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", status.bg)}>
                <StatusIcon className={cn("w-4 h-4", status.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-sm truncate">{owner.name}</span>
                    {owner.is_representative && (
                        <Badge variant="secondary" className="text-xs py-0">대표</Badge>
                    )}
                    {owner.share && (
                        <span className="text-xs text-gray-400">지분: {owner.share}</span>
                    )}
                </div>
                {owner.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {owner.phone}
                    </div>
                )}
            </div>
            <Badge 
                variant="outline" 
                className={cn("text-xs", status.color)}
            >
                {status.label}
            </Badge>
        </div>
    );
}

// 로딩 스켈레톤
function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full rounded-lg" />
            </div>
        </div>
    );
}
