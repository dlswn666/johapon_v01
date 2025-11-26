'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Swagger UI를 dynamic import로 불러옵니다 (SSR 비활성화)
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });
import 'swagger-ui-react/swagger-ui.css';

/**
 * Swagger UI 페이지
 *
 * API 문서를 시각적으로 표시하고 테스트할 수 있습니다.
 * 경로: /swagger
 */
export default function SwaggerPage() {
    const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/docs')
            .then((res) => res.json())
            .then((data) => {
                setSpec(data);
                setLoading(false);
            })
            .catch((err) => {
                setError('API 문서를 불러오는데 실패했습니다.');
                setLoading(false);
                console.error('Failed to load swagger spec:', err);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">API 문서를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return <div className="swagger-container">{spec && <SwaggerUI spec={spec} />}</div>;
}
