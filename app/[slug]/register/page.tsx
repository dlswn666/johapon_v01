'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { Loader2 } from 'lucide-react';

/**
 * 회원가입 페이지 - 메인 페이지로 리다이렉트
 * 
 * 기존 RegisterPage는 Step-by-Step RegisterModal로 통합되었습니다.
 * 이 URL에 직접 접근하는 경우 메인 페이지로 리다이렉트합니다.
 */
export default function RegisterPage() {
    const router = useRouter();
    const { slug } = useSlug();

    useEffect(() => {
        // 메인 페이지로 리다이렉트 (모달이 자동으로 열림)
        const redirectUrl = slug ? `/${slug}` : '/';
        router.replace(redirectUrl);
    }, [router, slug]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#4E8C6D]" />
                <p className="text-gray-600">잠시만 기다려주세요...</p>
            </div>
        </div>
    );
}
