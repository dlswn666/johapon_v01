import React from 'react';
import SlugProvider from '@/app/_lib/app/providers/SlugProvider';
import AuthProvider from '@/app/_lib/app/providers/AuthProvider';
import UnionLayoutContent from './UnionLayoutContent';

interface SlugLayoutProps {
    children: React.ReactNode;
    params: Promise<{
        slug: string;
    }>;
}

export default async function SlugLayout({ children, params }: SlugLayoutProps) {
    const { slug } = await params;

    return (
        <AuthProvider>
            <SlugProvider slug={slug}>
                <UnionLayoutContent>{children}</UnionLayoutContent>
            </SlugProvider>
        </AuthProvider>
    );
}
