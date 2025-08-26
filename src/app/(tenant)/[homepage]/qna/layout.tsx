import { Metadata } from 'next';
import { generateQnAMetadata } from '@/shared/lib/metadata';

interface QnALayoutProps {
    children: React.ReactNode;
    params: Promise<{ homepage: string }>;
}

export async function generateMetadata({ params }: QnALayoutProps): Promise<Metadata> {
    const { homepage } = await params;
    return generateQnAMetadata(homepage);
}

export default function QnALayout({ children }: QnALayoutProps) {
    return children;
}
