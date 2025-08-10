'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, MessageCircle, Globe } from 'lucide-react';
import {
    sampleAnnouncements,
    sampleQnAList,
    sampleCommunityPosts,
    statsData,
    samplePartners,
    bannerData,
    shortcutData,
} from '@/lib/mockData';
import HeroSection from '@/components/home/HeroSection';
import InformationCard from '@/components/home/InformationCard';
import AnnouncementsTab from '@/components/home/AnnouncementsTab';
import QnATab from '@/components/home/QnATab';
import CommunityTab from '@/components/home/CommunityTab';
import ShortcutsSection from '@/components/home/ShortcutsSection';
import PartnersSection from '@/components/home/PartnersSection';
import BannerSlider from '@/components/home/BannerSlider';

export default function HomePage() {
    // Ensure arrays are always defined
    const safeAnnouncements = sampleAnnouncements || [];
    const safeQnaList = sampleQnAList || [];
    const safeCommunityPosts = sampleCommunityPosts || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <HeroSection />

            {/* Main Content */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:items-start">
                    {/* Left Column - Information */}
                    <div className="lg:col-span-1">
                        <InformationCard statsData={statsData} />
                    </div>

                    {/* Center Column - Tabbed Content */}
                    <div className="lg:col-span-3 flex">
                        <Card className="border-gray-200 flex flex-col min-h-full min-w-full">
                            <CardContent className="p-4 flex-1 flex flex-col">
                                <Tabs defaultValue="announcements" className="w-full flex-1 flex flex-col">
                                    <TabsList className="grid w-full grid-cols-3 mb-2 text-basic-primary font-wanted">
                                        <TabsTrigger value="announcements" className="text-base">
                                            공지사항
                                        </TabsTrigger>
                                        <TabsTrigger value="qna" className="text-base">
                                            Q&A
                                        </TabsTrigger>
                                        <TabsTrigger value="community" className="text-base">
                                            정보공유방
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="announcements" className="flex-1 flex flex-col">
                                        <AnnouncementsTab announcements={safeAnnouncements} />
                                    </TabsContent>

                                    <TabsContent value="qna" className="flex-1 flex flex-col">
                                        <QnATab qnaList={safeQnaList} />
                                    </TabsContent>

                                    <TabsContent value="community" className="flex-1 flex flex-col">
                                        <CommunityTab communityPosts={safeCommunityPosts} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Shortcuts and Partners Section */}
                <div className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Shortcuts Section */}
                        <div className="lg:col-span-1">
                            <ShortcutsSection shortcutData={shortcutData} />
                        </div>

                        {/* Partners Section */}
                        <div className="lg:col-span-3">
                            <PartnersSection partners={samplePartners} />
                        </div>
                    </div>
                </div>

                {/* Banner Slider */}
                <div className="mt-12">
                    <BannerSlider bannerData={bannerData} />
                </div>
            </div>
        </div>
    );
}
