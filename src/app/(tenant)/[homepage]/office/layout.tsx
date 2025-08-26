import { Metadata } from 'next';
import { generateOfficeMetadata } from '@/shared/lib/metadata';

interface OfficeLayoutProps {
    children: React.ReactNode;
    params: Promise<{ homepage: string }>;
}

export async function generateMetadata({ params }: OfficeLayoutProps): Promise<Metadata> {
    const { homepage } = await params;
    return generateOfficeMetadata(homepage);
}

export default function OfficeLayout({ children }: OfficeLayoutProps) {
    return children;
}
