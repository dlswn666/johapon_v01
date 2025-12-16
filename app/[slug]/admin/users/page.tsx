'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * 사용자 관리 페이지 - 조합원 관리로 리다이렉트
 * 
 * 기존 사용자 관리 기능은 조합원 관리 페이지의 "승인 관리" 탭으로 통합되었습니다.
 */
export default function AdminUsersRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;

    useEffect(() => {
        // 조합원 관리 페이지의 승인 탭으로 리다이렉트
        router.replace(`/${slug}/admin/members?tab=approval`);
    }, [router, slug]);

    return (
        <div className="min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-[#4E8C6D]" />
                <p className="text-lg text-gray-600">조합원 관리 페이지로 이동 중...</p>
            </div>
        </div>
    );
}
