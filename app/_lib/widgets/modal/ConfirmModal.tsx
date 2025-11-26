'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

export default function ConfirmModal() {
    const { confirmModal, closeConfirmModal } = useModalStore();

    const handleConfirm = () => {
        confirmModal.onConfirm();
        closeConfirmModal();
    };

    return (
        <Dialog open={confirmModal.isOpen} onOpenChange={(open) => !open && closeConfirmModal()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{confirmModal.title}</DialogTitle>
                    <DialogDescription>{confirmModal.message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={closeConfirmModal}>
                        {confirmModal.cancelText}
                    </Button>
                    <Button
                        variant={confirmModal.variant === 'danger' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                    >
                        {confirmModal.confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
