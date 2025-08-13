'use client';

import { Card, CardContent } from '@/shared/ui/card';
import { Building2, Phone, Train, Bus, Car } from 'lucide-react';
import MapSection from '@/widgets/office/MapSection';
import OfficeDetails from '@/widgets/office/OfficeDetails';
import TransportInfo, { TransportItem } from '@/widgets/office/TransportInfo';
import OperatingHours from '@/widgets/office/OperatingHours';
import ContactCTA from '@/components/office/ContactCTA';

export default function TenantOfficePage() {
    const officeInfo = {
        name: '작전현대아파트구역 주택재개발정비사업조합',
        address: '인천광역시 계양구 작전동 123-45',
        detailAddress: '작전빌딩 4층',
        phone: '032-123-4567',
        fax: '032-123-4568',
        email: 'info@jakjeon-redevelopment.co.kr',
        hours: {
            weekdays: '09:00 - 18:00',
            saturday: '09:00 - 13:00',
            sunday: '휴무',
        },
        coordinates: { lat: 37.5439, lng: 126.7367 },
    };

    const transportInfo: TransportItem[] = [
        {
            type: 'subway',
            icon: Train,
            title: '지하철',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            routes: ['인천1호선 작전역 2번 출구에서 도보 3분', '인천1호선 경인교대입구역 1번 출구에서 도보 7분'],
        },
        {
            type: 'bus',
            icon: Bus,
            title: '버스',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            routes: ['간선버스: 16, 23, 24, 111', '지선버스: 512, 515, 523, 908', '마을버스: 계양01, 계양04'],
        },
        {
            type: 'car',
            icon: Car,
            title: '자가용',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            routes: [
                '서울방향: 경인고속도로 → 계양IC → 작전동',
                '인천방향: 봉오대로 → 계양대로 → 작전동',
                '건물 지하 주차장 이용 가능 (2시간 무료)',
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-4">
                        <div>
                            <h1 className="text-3xl text-gray-900">사무실 안내</h1>
                            <p className="text-gray-600 mt-1">조합 사무실 위치 및 연락처 정보를 확인하세요</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-1 space-y-6" />

                    <div className="lg:col-span-3 space-y-8">
                        <MapSection
                            officeName={officeInfo.name}
                            address={officeInfo.address}
                            detailAddress={officeInfo.detailAddress}
                            phone={officeInfo.phone}
                            coordinates={officeInfo.coordinates}
                        />

                        <Card>
                            <CardContent>
                                <OfficeDetails officeInfo={officeInfo} />
                            </CardContent>
                        </Card>

                        <TransportInfo items={transportInfo} />
                        <OperatingHours hours={officeInfo.hours} />
                        <ContactCTA phone={officeInfo.phone} email={officeInfo.email} />
                    </div>

                    <div className="lg:col-span-1 space-y-6" />
                </div>
            </div>
        </div>
    );
}
