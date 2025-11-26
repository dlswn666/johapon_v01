'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    return (
        <div className={cn('flex justify-center items-center min-h-screen gap-3')}>
            <h1>Hello World</h1>
            <Button>Click me</Button>
            <Button variant="outline" onClick={() => router.push('/notice')}>
                공지사항
            </Button>
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                알림톡 관리
            </Button>
            <Button variant="ghost">Click me</Button>
            <Button variant="link">Click me</Button>
        </div>
    );
}
