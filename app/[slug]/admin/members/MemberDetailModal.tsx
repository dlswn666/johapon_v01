'use client';

import React from 'react';
import { User, Phone, MapPin, CheckCircle2, Clock } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { MemberInvite } from '@/app/_lib/shared/type/database.types';

interface MemberDetailModalProps {
    invite: MemberInvite | null;
    onClose: () => void;
}

export default function MemberDetailModal({ invite, onClose }: MemberDetailModalProps) {
    if (!invite) return null;

    // 상태 정보
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'USED':
                return {
                    label: '수락됨',
                    icon: CheckCircle2,
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/20',
                };
            case 'EXPIRED':
                return {
                    label: '만료됨',
                    icon: Clock,
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/20',
                };
            default:
                return {
                    label: '대기중',
                    icon: Clock,
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/20',
                };
        }
    };

    const statusInfo = getStatusInfo(invite.status);
    const StatusIcon = statusInfo.icon;

    return (
        <Dialog open={!!invite} onOpenChange={onClose}>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        조합원 상세 정보
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* 상태 */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${statusInfo.bgColor}`}>
                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                        <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>

                    {/* 이름 */}
                    <div className="p-4 bg-slate-700/50 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <User className="w-4 h-4" />
                            이름
                        </div>
                        <p className="text-white text-lg font-medium pl-6">{invite.name}</p>
                    </div>

                    {/* 핸드폰번호 */}
                    <div className="p-4 bg-slate-700/50 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Phone className="w-4 h-4" />
                            핸드폰번호
                        </div>
                        <p className="text-white text-lg font-medium pl-6">{invite.phone_number}</p>
                    </div>

                    {/* 물건지 주소 */}
                    <div className="p-4 bg-slate-700/50 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <MapPin className="w-4 h-4" />
                            물건지 주소
                        </div>
                        <p className="text-white text-lg font-medium pl-6">{invite.property_address}</p>
                    </div>

                    {/* 등록일 */}
                    <div className="text-sm text-slate-500 text-center pt-2">
                        등록일: {new Date(invite.created_at).toLocaleDateString('ko-KR')}
                        {invite.used_at && (
                            <span className="ml-4">
                                수락일: {new Date(invite.used_at).toLocaleDateString('ko-KR')}
                            </span>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

