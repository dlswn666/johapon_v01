import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { Eye, Users, MapPin, BarChart3, TrendingUp, Info } from 'lucide-react';

interface StatsData {
    visitors: number;
    members: number;
    area: string;
    phase: string;
    consentRate: number;
}

interface InformationCardProps {
    statsData: StatsData;
}

export default function InformationCard({ statsData }: InformationCardProps) {
    return (
        <Card className="border-gray-200 flex flex-col border-radius-lg">
            <CardHeader className="bg-white border-b border-gray-200 py-4 flex-shrink-0">
                <CardTitle className="text-green-800 flex items-center text-xl">
                    <Info className="h-6 w-6 mr-3" />
                    Information
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-3 text-blue-600" />
                            <span className="text-base text-gray-600">방문자 수</span>
                        </div>
                        <span className="text-base font-medium text-gray-900">
                            {statsData.visitors.toLocaleString('ko-KR')} 명
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Users className="h-4 w-4 mr-3 text-green-600" />
                            <span className="text-base text-gray-600">조합원 수</span>
                        </div>
                        <span className="text-base font-medium text-gray-900">
                            {statsData.members.toLocaleString('ko-KR')} 명
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-3 text-purple-600" />
                            <span className="text-base text-gray-600">면적</span>
                        </div>
                        <span className="text-base font-medium text-gray-900">{statsData.area}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <BarChart3 className="h-4 w-4 mr-3 text-orange-600" />
                            <span className="text-base text-gray-600">단계</span>
                        </div>
                        <span className="text-base font-medium text-gray-900">{statsData.phase}</span>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <TrendingUp className="h-4 w-4 mr-3 text-green-600" />
                                <span className="text-base text-gray-600">동의율</span>
                            </div>
                            <span className="text-base font-medium text-gray-900">{statsData.consentRate}%</span>
                        </div>
                        <Progress value={statsData.consentRate} className="w-full h-2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
