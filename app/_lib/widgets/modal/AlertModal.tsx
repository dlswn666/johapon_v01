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
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export default function AlertModal() {
    const { alertModal, closeAlertModal } = useModalStore();

    const getIcon = () => {
        switch (alertModal.type) {
            case 'success':
                return <CheckCircle2 className="h-6 w-6 text-green-600" />;
            case 'error':
                return <XCircle className="h-6 w-6 text-red-600" />;
            case 'info':
                return <Info className="h-6 w-6 text-blue-600" />;
            default:
                return null;
        }
    };

    return (
        <Dialog open={alertModal.isOpen} onOpenChange={(open) => !open && closeAlertModal()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <DialogTitle>{alertModal.title}</DialogTitle>
                    </div>
                    <DialogDescription>{alertModal.message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={() => {
                        closeAlertModal();
                        if (alertModal.onOk) alertModal.onOk();
                    }}>확인</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
