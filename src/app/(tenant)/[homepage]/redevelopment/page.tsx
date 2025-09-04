import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import SideBannerAds from '@/widgets/common/SideBannerAds';

export default function TenantRedevelopmentPage() {
    const steps = [
        { id: 1, title: '조합설립', desc: '주민 동의 및 조합 설립 총회' },
        { id: 2, title: '사업시행', desc: '사업시행 인가 및 기본계획 수립' },
        { id: 3, title: '관리처분', desc: '분양 계획 및 이주/철거 준비' },
        { id: 4, title: '착공', desc: '시공사 착공 및 공사 진행' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-8">
                    <h1 className="text-2xl lg:text-3xl text-gray-900 mb-2">재개발 진행 과정</h1>
                    <p className="text-gray-600 text-sm lg:text-base">우리 지역 재개발의 주요 단계 안내</p>
                </div>
            </div>

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <SideBannerAds sticky />
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>주요 단계</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {steps.map((s) => (
                                    <div key={s.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                                        <div className="text-sm text-green-700 mb-1">STEP {s.id}</div>
                                        <div className="text-lg text-gray-900">{s.title}</div>
                                        <div className="text-sm text-gray-600 mt-1">{s.desc}</div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <SideBannerAds sticky />
                    </div>
                </div>
            </div>
        </div>
    );
}
