import React from 'react';

interface ErrorsLayoutProps {
    children: React.ReactNode;
}

export default function ErrorsLayout({ children }: ErrorsLayoutProps) {
    return <>{children}</>;
}

