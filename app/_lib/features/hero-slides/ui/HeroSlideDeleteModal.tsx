'use client';

import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface HeroSlideDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export default function HeroSlideDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
}: HeroSlideDeleteModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <DialogTitle>슬라이드 삭제</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        이 슬라이드를 삭제하시겠습니까?
                        <br />
                        삭제된 슬라이드는 복구할 수 없습니다.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                        취소
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        삭제
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

