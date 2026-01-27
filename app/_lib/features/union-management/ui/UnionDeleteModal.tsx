'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UnionDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    unionName: string;
    isDeleting?: boolean;
}

export default function UnionDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    unionName,
    isDeleting = false,
}: UnionDeleteModalProps) {
    const [inputName, setInputName] = useState('');
    const [error, setError] = useState('');

    const isValid = inputName === unionName;

    const handleConfirm = async () => {
        if (!isValid) {
            setError('조합명이 일치하지 않습니다.');
            return;
        }

        setError('');
        await onConfirm();
    };

    const handleClose = () => {
        setInputName('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-xl">조합 삭제</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-left">
                        <span className="font-semibold text-red-600">{unionName}</span> 조합을 삭제하시겠습니까?
                        <br />
                        <br />이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
                    <ul className="text-sm text-red-700 space-y-1">
                        <li>• 조합 정보</li>
                        <li>• 공지사항 및 첨부파일</li>
                        <li>• 댓글</li>
                        <li>• 히어로 슬라이드</li>
                        <li>• 업로드된 모든 파일</li>
                    </ul>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-name">
                        삭제하려면 조합명 <span className="font-semibold">{unionName}</span>을 입력하세요
                    </Label>
                    <Input
                        id="confirm-name"
                        value={inputName}
                        onChange={(e) => {
                            setInputName(e.target.value);
                            setError('');
                        }}
                        placeholder={unionName}
                        className={error ? 'border-red-500' : ''}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
                        취소
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!isValid || isDeleting}>
                        {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        삭제
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
