import React from 'react';
import SlugProvider from '@/app/_lib/app/providers/SlugProvider';

interface SlugLayoutProps {
    children: React.ReactNode;
    params: Promise<{
        slug: string;
    }>;
}

export default async function SlugLayout({
    children,
    params,
}: SlugLayoutProps) {
    const { slug } = await params;

    return (
        <SlugProvider slug={slug}>
            <div className="min-h-screen bg-gray-50">
                {children}
            </div>
        </SlugProvider>
    );
}

