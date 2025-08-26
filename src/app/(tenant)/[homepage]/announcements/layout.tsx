import { Metadata } from 'next';
import { generateAnnouncementsMetadata } from '@/shared/lib/metadata';

interface AnnouncementsLayoutProps {
    children: React.ReactNode;
    params: Promise<{ homepage: string }>;
}

export async function generateMetadata({ params }: AnnouncementsLayoutProps): Promise<Metadata> {
    const { homepage } = await params;
    return generateAnnouncementsMetadata(homepage);
}

export default function AnnouncementsLayout({ children }: AnnouncementsLayoutProps) {
    return children;
}
