'use client';

import { Card, CardContent } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { statsData, samplePartners, bannerData, shortcutData } from '@/lib/mockData';
import HeroSection from '@/widgets/home/HeroSection';
import InformationCard from '@/widgets/home/InformationCard';
import AnnouncementsTab from '@/widgets/home/AnnouncementsTab';
import QnATab from '@/widgets/home/QnATab';
import CommunityTab from '@/widgets/home/CommunityTab';
import ShortcutsSection from '@/widgets/home/ShortcutsSection';
import PartnersSection from '@/widgets/home/PartnersSection';
import BannerSlider from '@/widgets/home/BannerSlider';

export default function HomeRoot() {
    return (
        <div className="min-h-screen bg-gray-50">
            <HeroSection />

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:items-start">
                    <div className="lg:col-span-1">
                        <InformationCard statsData={statsData} />
                    </div>

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
                                        <AnnouncementsTab />
                                    </TabsContent>

                                    <TabsContent value="qna" className="flex-1 flex flex-col">
                                        <QnATab />
                                    </TabsContent>

                                    <TabsContent value="community" className="flex-1 flex flex-col">
                                        <CommunityTab />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1">
                            <ShortcutsSection shortcutData={shortcutData} />
                        </div>

                        <div className="lg:col-span-3">
                            <PartnersSection partners={samplePartners} />
                        </div>
                    </div>
                </div>

                <div className="mt-12">
                    <BannerSlider bannerData={bannerData} />
                </div>
            </div>
        </div>
    );
}
