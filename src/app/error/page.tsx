'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function GlobalErrorPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center px-6">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">문제가 발생했습니다</h2>
                <p className="text-gray-600 mb-6">잠시 후 다시 시도해 주세요.</p>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => router.back()} className="flex items-center">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        이전 페이지로
                    </Button>
                    <Button onClick={() => router.push('/')}>홈으로</Button>
                </div>
            </div>
        </div>
    );
}
