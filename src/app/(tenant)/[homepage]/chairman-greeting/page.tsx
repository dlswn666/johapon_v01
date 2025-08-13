import { Card, CardContent } from '@/shared/ui/card';
import { Building2, Mail, Phone, User } from 'lucide-react';

export default function ChairmanGreetingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
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

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white via-blue-50/30 to-green-50/30">
                        <CardContent className="p-0">
                            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl mb-2">조합원 여러분께 드리는 인사말</h2>
                                        <p className="text-green-100">작전현대아파트구역 주택재개발정비사업조합</p>
                                    </div>
                                    <Building2 className="h-16 w-16 text-white/80" />
                                </div>
                            </div>

                            <div className="p-12 bg-white relative">
                                <div className="absolute top-0 left-8 w-px h-full bg-red-200"></div>
                                <div className="absolute top-8 left-0 w-full h-px bg-blue-100"></div>

                                <div className="space-y-8 ml-8">
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
                                            여러분께 진심으로 감사의 말씀을 드립니다.
                                        </p>
                                        <p className="leading-relaxed">
                                            재개발 사업은 단순히 오래된 건물을 새로 짓는 것이 아닙니다. 우리 모두가 함께
                                            만들어 가는 새로운 공동체의 시작입니다.
                                        </p>
                                        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                                            <p className="text-center text-lg text-green-700">
                                                &quot;함께하는 미래, 더 나은 내일을 위하여&quot;
                                            </p>
                                        </div>
                                    </div>

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
