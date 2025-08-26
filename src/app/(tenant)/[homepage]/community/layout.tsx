import { Metadata } from 'next';
import { generateCommunityMetadata } from '@/shared/lib/metadata';

interface CommunityLayoutProps {
    children: React.ReactNode;
    params: Promise<{ homepage: string }>;
}

export async function generateMetadata({ params }: CommunityLayoutProps): Promise<Metadata> {
    const { homepage } = await params;
    return generateCommunityMetadata(homepage);
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
    return children;
}
