'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { ApprovalPendingModal } from './ApprovalPendingModal';
import { ApprovalRejectedModal } from './ApprovalRejectedModal';

/**
 * 사용자 상태에 따른 모달 표시 컴포넌트
 * URL 파라미터 또는 사용자 상태를 확인하여 적절한 모달 표시
 */
export function UserStatusModal() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, userStatus, isLoading, isUserFetching } = useAuth();
    const { slug } = useSlug();

    // 모달 닫힘 상태 추적
    const [pendingModalDismissed, setPendingModalDismissed] = useState(false);
    const [rejectedModalDismissed, setRejectedModalDismissed] = useState(false);

    // URL 파라미터 또는 사용자 상태에서 모달 표시 여부 계산
    const showPendingModal = useMemo(() => {
        if (isLoading || isUserFetching || pendingModalDismissed) return false;

        const statusParam = searchParams.get('status');
        if (statusParam === 'pending') return true;
        if (userStatus === 'PENDING_APPROVAL') return true;

        return false;
    }, [searchParams, userStatus, isLoading, isUserFetching, pendingModalDismissed]);

    const showRejectedModal = useMemo(() => {
        if (isLoading || isUserFetching || rejectedModalDismissed) return false;

        // 추가: 현재 상태가 승인 대기 중이면 반려 모달을 표시하지 않음 (중첩 방지)
        if (userStatus === 'PENDING_APPROVAL') return false;

        const statusParam = searchParams.get('status');
        if (statusParam === 'rejected') return true;
        if (userStatus === 'REJECTED') return true;

        return false;
    }, [searchParams, userStatus, isLoading, isUserFetching, rejectedModalDismissed]);

    const handleClosePendingModal = useCallback(() => {
        setPendingModalDismissed(true);
        // URL에서 status 파라미터 제거
        if (searchParams.get('status')) {
            router.replace(`/${slug}`);
        }
    }, [searchParams, router, slug]);

    const handleCloseRejectedModal = useCallback(() => {
        setRejectedModalDismissed(true);
        // URL에서 status 파라미터 제거
        if (searchParams.get('status')) {
            router.replace(`/${slug}`);
        }
    }, [searchParams, router, slug]);

    return (
        <>
            <ApprovalPendingModal
                isOpen={showPendingModal}
                onClose={handleClosePendingModal}
                userName={user?.name}
            />
            <ApprovalRejectedModal
                isOpen={showRejectedModal}
                onClose={handleCloseRejectedModal}
                userName={user?.name}
                rejectedReason={user?.rejected_reason || undefined}
            />
        </>
    );
}

export default UserStatusModal;
