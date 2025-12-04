'use client';

import React from 'react';
import { Edit3, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UnionEditConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    unionName: string;
    isUpdating?: boolean;
}

export default function UnionEditConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    unionName,
    isUpdating = false,
}: UnionEditConfirmModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <Edit3 className="w-6 h-6 text-blue-600" />
                        </div>
                        <DialogTitle className="text-xl">조합 정보 수정</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-left">
                        <span className="font-semibold text-blue-600">{unionName}</span> 조합 정보를 수정하시겠습니까?
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                        취소
                    </Button>
                    <Button onClick={onConfirm} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                        {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        확인
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
