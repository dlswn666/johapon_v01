import AnnouncementsList, { type AnnouncementItem } from '../../components/announcements/AnnouncementsList';
import BannerAd from '@/components/common/BannerAd';
import ListFilter, { type ListCategoryOption } from '@/components/common/ListFilter';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

// Server Component: 데이터 공급 및 페이지 골격만 담당
export default function AnnouncementsPage() {
    // 원본 UI에 맞춘 샘플 데이터 (우선순위/고정/조회수 포함)
    const sampleAnnouncements: AnnouncementItem[] = [
        {
            id: 1,
            title: '톡시그처법가책에 대한 안내공지',
            content:
                '톡시그처법가책에 대한 상세한 안내사항을 공지드립니다. 조합원 여러분께서는 관련 내용을 숙지하시어 불편함이 없도록 하시기 바랍니다. 자세한 사항은 조합사무실로 문의해 주시기 바랍니다. 추가적으로 이번 안내사항은 모든 조합원분들께 매우 중요한 내용이므로 반드시 숙지하시어 향후 진행될 재개발 사업에 차질이 없도록 협조해 주시기 바랍니다.',
            author: '관리자',
            date: '2025-04-21',
            category: '중요공지',
            priority: 'high',
            views: 234,
            isPinned: true,
        },
        {
            id: 2,
            title: '[문영캘리] 2025년 3월 31일 기준 운영캘리 참여',
            content: '문영캘리 운영캘리 참여에 관한 안내입니다. 관련 세부사항을 확인해 주세요.',
            author: '관리자',
            date: '2025-04-21',
            category: '일반공지',
            priority: 'normal',
            views: 156,
            isPinned: false,
        },
        {
            id: 3,
            title: '서울시 신육아파트 공급 가족이 불척업으로 시각됩니다',
            content: '서울시 신육아파트 공급 관련 안내사항입니다. 자세한 내용은 본문을 확인해 주세요.',
            author: '관리자',
            date: '2025-04-21',
            category: '일반공지',
            priority: 'normal',
            views: 89,
            isPinned: false,
        },
        {
            id: 4,
            title: '코로나 19 역학 희망 균등사회 확하지 모집 광고 (2023-03-31)',
            content: '코로나19 관련 모집 광고 안내입니다. 참여를 원하시는 분들은 세부사항을 확인해 주시기 바랍니다.',
            author: '관리자',
            date: '2025-04-21',
            category: '일반공지',
            priority: 'low',
            views: 67,
            isPinned: false,
        },
        {
            id: 5,
            title: '2025년 재개발 일정 안내',
            content: '2025년 재개발 추진 일정에 대해 안내드립니다. 조합원 여러분의 적극적인 관심과 참여 부탁드립니다.',
            author: '관리자',
            date: '2025-04-20',
            category: '중요공지',
            priority: 'high',
            views: 312,
            isPinned: true,
        },
        {
            id: 6,
            title: '임시거주지 지원 정책 변경 안내',
            content:
                '임시거주지 지원 정책이 일부 변경되었습니다. 해당 내용을 숙지하시어 불편함이 없도록 하시기 바랍니다.',
            author: '관리자',
            date: '2025-04-19',
            category: '안내사항',
            priority: 'normal',
            views: 198,
            isPinned: false,
        },
    ];

    // 카테고리 카운트 (SSR에서도 계산 가능)
    const categories: ListCategoryOption[] = [
        { id: 'all', name: '전체', count: sampleAnnouncements.length },
        {
            id: '중요공지',
            name: '중요공지',
            count: sampleAnnouncements.filter((a) => a.category === '중요공지').length,
        },
        {
            id: '일반공지',
            name: '일반공지',
            count: sampleAnnouncements.filter((a) => a.category === '일반공지').length,
        },
        {
            id: '안내사항',
            name: '안내사항',
            count: sampleAnnouncements.filter((a) => a.category === '안내사항').length,
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* layout.tsx 에서 Header/Footer 렌더링됨 */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                    <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">공지사항</h1>
                    <p className="text-gray-600 text-sm lg:text-base">
                        조합 운영과 재개발 관련 중요한 소식을 전해드립니다
                    </p>
                </div>
            </div>

            {/* 페이지 컨테이너 */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>

                    {/* Center: Filter + Actions + List */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardContent className="p-4">
                                {/* 클라이언트 측 상태가 필요한 필터는 CSR로 이동 필요. 추후 Client Wrapper로 교체 */}
                                <ListFilter
                                    categories={categories}
                                    selectedCategory={'all'}
                                    onCategoryChange={() => {}}
                                    searchTerm={''}
                                    onSearchTermChange={() => {}}
                                    onSearch={() => {}}
                                    variant="desktop"
                                />
                            </CardContent>
                        </Card>

                        {/* Admin Action (데모 링크) */}
                        <Card>
                            <CardContent className="p-4 flex justify-end">
                                <Link href="/announcements/new" className="inline-block">
                                    <span className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">
                                        새 공지사항 작성
                                    </span>
                                </Link>
                            </CardContent>
                        </Card>

                        <AnnouncementsList announcements={sampleAnnouncements} />
                    </div>

                    {/* Right Banner */}
                    <div className="lg:col-span-1 space-y-6">
                        <BannerAd onClick={() => alert('배너 이동')} />
                    </div>
                </div>
            </div>
        </div>
    );
}
