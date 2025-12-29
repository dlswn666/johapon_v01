'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
    MapPin, 
    Users, 
    Building2, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Percent,
    User,
    Phone
} from 'lucide-react';
import { useParcelDetail, ParcelDetail, ConsentStageStatus, Owner } from '../api/useParcelDetail';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ParcelDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pnu: string | null;
    stageId: string | null;
}

export default function ParcelDetailModal({ open, onOpenChange, pnu, stageId }: ParcelDetailModalProps) {
    const { data: parcel, isLoading } = useParcelDetail(pnu, stageId);

    return (
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
                            {/* 필지 기본 정보 */}
                            <ParcelBasicInfo parcel={parcel} />

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
    );
}

// 필지 기본 정보
function ParcelBasicInfo({ parcel }: { parcel: ParcelDetail }) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">주소</p>
                    <p className="font-semibold text-gray-900">{parcel.address}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">PNU: {parcel.pnu}</p>
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
                                <Badge variant="outline" className="text-xs font-mono">
                                    {stage.stage_code}
                                </Badge>
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
                                비동의 {stage.disagreed_owners}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                대기 {stage.pending_owners}
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
    if (parcel.building_units.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                등록된 소유주 정보가 없습니다.
            </div>
        );
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
        DISAGREED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '비동의' },
        PENDING: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50', label: '대기' }
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

