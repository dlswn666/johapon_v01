import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export interface OfficeHours {
    weekdays: string;
    saturday: string;
    sunday: string;
}

export default function OperatingHours({ hours }: { hours: OfficeHours }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span>운영시간</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-lg text-blue-700 mb-2">평일</div>
                        <div className="text-blue-600">{hours.weekdays}</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-lg text-green-700 mb-2">토요일</div>
                        <div className="text-green-600">{hours.saturday}</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-lg text-red-700 mb-2">일요일 및 공휴일</div>
                        <div className="text-red-600">{hours.sunday}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
