import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Building2 } from 'lucide-react';
import { Partner } from '@/lib/types';

interface PartnersSectionProps {
    partners: Partner[];
}

export default function PartnersSection({ partners }: PartnersSectionProps) {
    const firstThree = partners.slice(0, 3);

    return (
        <Card className="border-gray-200">
            <CardHeader className="bg-white border-b border-gray-200 py-4">
                <CardTitle className="text-gray-800 text-xl">협력업체</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {firstThree.map((partner) => (
                        <div
                            key={partner.id}
                            className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-green-300"
                        >
                            <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                <Building2 className="h-6 w-6 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-base text-gray-900 mb-1 truncate">{partner.name}</h4>
                                <p className="text-sm text-gray-600 leading-tight">{partner.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm text-blue-800 mb-1">협력업체 1-3개</div>
                            <div className="text-xs text-blue-600">협력업체명</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-sm text-green-800 mb-1">협력업체 2-3개</div>
                            <div className="text-xs text-green-600">협력업체명</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="text-sm text-purple-800 mb-1">협력업체 3-3개</div>
                            <div className="text-xs text-purple-600">협력업체명</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
