import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { TenantProvider } from '@/shared/providers/TenantProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: {
        template: '%s | 조합 관리 시스템',
        default: '조합 관리 시스템',
    },
    description: '정비사업조합 공식 홈페이지입니다.',
    keywords: ['정비사업', '재개발', '재건축', '조합'],
    authors: [{ name: '조합 관리 시스템' }],
    viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <body className={inter.className}>
                <TenantProvider>{children}</TenantProvider>
            </body>
        </html>
    );
}
