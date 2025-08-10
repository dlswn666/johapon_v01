import { Card, CardContent } from '@/components/ui/card';
import { Building2, Mail, Phone, User } from 'lucide-react';

export default function ChairmanGreetingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-4">
                        <User className="h-8 w-8 text-green-600" />
                        <div>
                            <h1 className="text-3xl text-gray-900">조합장 인사</h1>
                            <p className="text-gray-600 mt-1">조합원 여러분께 드리는 조합장의 인사말씀입니다.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white via-blue-50/30 to-green-50/30">
                        <CardContent className="p-0">
                            {/* Letter Header */}
                            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl mb-2">조합원 여러분께 드리는 인사말</h2>
                                        <p className="text-green-100">작전현대아파트구역 주택재개발정비사업조합</p>
                                    </div>
                                    <Building2 className="h-16 w-16 text-white/80" />
                                </div>
                            </div>

                            {/* Letter Content */}
                            <div className="p-12 bg-white relative">
                                {/* Decorative Letter Paper Effect */}
                                <div className="absolute top-0 left-8 w-px h-full bg-red-200"></div>
                                <div className="absolute top-8 left-0 w-full h-px bg-blue-100"></div>

                                <div className="space-y-8 ml-8">
                                    {/* Chairman Info */}
                                    <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-l-4 border-green-500">
                                        <div className="flex-shrink-0">
                                            <div className="w-24 h-24 bg-gray-200 rounded-full" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl text-gray-900 mb-2">김조합장</h3>
                                            <p className="text-green-600 mb-1">
                                                작전현대아파트구역 주택재개발정비사업조합장
                                            </p>
                                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <Mail className="h-4 w-4 mr-1" /> chairman@redevelopment.co.kr
                                                </div>
                                                <div className="flex items-center">
                                                    <Phone className="h-4 w-4 mr-1" /> 032-123-4567
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Greeting Content */}
                                    <div className="space-y-6 text-gray-800 leading-relaxed">
                                        <div className="text-lg">
                                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm mb-4">
                                                조합원 여러분께
                                            </span>
                                        </div>
                                        <p className="text-lg leading-relaxed">
                                            안녕하십니까. 작전현대아파트구역 주택재개발정비사업조합 조합장
                                            김조합장입니다.
                                        </p>
                                        <p className="leading-relaxed">
                                            먼저 우리 조합의 재개발 사업에 적극적으로 참여해 주시고 지지해 주시는 조합원
                                            여러분께 진심으로 감사의 말씀을 드립니다. 여러분의 관심과 성원이 있기에 우리
                                            조합이 현재까지 안정적으로 사업을 추진할 수 있었습니다.
                                        </p>
                                        <p className="leading-relaxed">
                                            우리 지역은 수십 년간 거주해 온 소중한 터전입니다. 하지만 노후화된
                                            주거환경과 부족한 기반시설로 인해 주민들의 삶의 질 향상에 한계가 있었던 것도
                                            사실입니다. 이에 우리는 보다 나은 주거환경과 현대적인 생활 인프라를 갖춘
                                            새로운 마을을 만들기 위해 재개발 사업을 추진하게 되었습니다.
                                        </p>
                                        <p className="leading-relaxed">
                                            재개발 사업은 단순히 오래된 건물을 새로 짓는 것이 아닙니다. 우리 모두가 함께
                                            만들어 가는 새로운 공동체의 시작입니다. 안전하고 편리한 주거환경,
                                            친환경적이고 지속가능한 개발, 그리고 무엇보다 주민들이 행복하게 살 수 있는
                                            따뜻한 마을을 만드는 것이 우리의 목표입니다.
                                        </p>
                                        <p className="leading-relaxed">
                                            사업 추진 과정에서 예상치 못한 어려움이나 의견 차이가 있을 수 있습니다.
                                            하지만 조합원 여러분과의 열린 소통과 투명한 정보 공유를 통해 모든 문제를
                                            슬기롭게 해결해 나갈 것을 약속드립니다.
                                        </p>
                                        <p className="leading-relaxed">
                                            앞으로도 조합원 여러분의 의견에 귀 기울이고, 정직하고 투명한 사업 추진으로
                                            신뢰받는 조합이 되도록 최선을 다하겠습니다. 조합원 여러분께서도 우리 사업에
                                            지속적인 관심과 참여를 부탁드립니다.
                                        </p>
                                        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                                            <p className="text-center text-lg text-green-700">
                                                &quot;함께하는 미래, 더 나은 내일을 위하여&quot;
                                            </p>
                                        </div>
                                    </div>

                                    {/* Signature */}
                                    <div className="mt-12 pt-8 border-t border-gray-200">
                                        <div className="text-right space-y-2">
                                            <p className="text-gray-600">
                                                {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
                                            </p>
                                            <p className="text-lg text-gray-900">
                                                작전현대아파트구역 주택재개발정비사업조합
                                            </p>
                                            <p className="text-xl text-green-600 mb-4">조합장 김조합장</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Letter Footer */}
                            <div className="bg-gray-50 p-6 border-t">
                                <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
                                    <div className="flex items-center">
                                        <Building2 className="h-4 w-4 mr-2" /> 인천광역시 남동구 작전동 일원
                                    </div>
                                    <div className="flex items-center">
                                        <Phone className="h-4 w-4 mr-2" /> 대표전화: 032-123-4567
                                    </div>
                                    <div className="flex items-center">
                                        <Mail className="h-4 w-4 mr-2" /> info@redevelopment.co.kr
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
