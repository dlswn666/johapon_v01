import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: '작전현대아파트구역 주택재개발정비사업조합',
    description: '작전현대아파트구역 주택재개발정비사업조합 공식 홈페이지입니다.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <body className={inter.className}>
                <div className="min-h-screen bg-gray-50">
                    <Header />
                    <main>{children}</main>
                    <Footer />
                </div>
            </body>
        </html>
    );
}
