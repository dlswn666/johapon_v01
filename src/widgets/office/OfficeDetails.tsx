import { Building2, MapPin, Phone, Mail } from 'lucide-react';

export interface OfficeInfo {
    name: string;
    address: string;
    detailAddress: string;
    phone: string;
    fax: string;
    email: string;
}

export default function OfficeDetails({ officeInfo }: { officeInfo: OfficeInfo }) {
    return (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-gray-900 mb-2 flex items-center">
                            <Building2 className="h-4 w-4 mr-2" /> 조합명
                        </h4>
                        <p className="text-gray-600">{officeInfo.name}</p>
                    </div>
                    <div>
                        <h4 className="text-gray-900 mb-2 flex items-center">
                            <MapPin className="h-4 w-4 mr-2" /> 주소
                        </h4>
                        <p className="text-gray-600">{officeInfo.address}</p>
                        <p className="text-gray-600">{officeInfo.detailAddress}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <h4 className="text-gray-900 mb-2 flex items-center">
                            <Phone className="h-4 w-4 mr-2" /> 연락처
                        </h4>
                        <p className="text-gray-600">전화: {officeInfo.phone}</p>
                        <p className="text-gray-600">팩스: {officeInfo.fax}</p>
                    </div>
                    <div>
                        <h4 className="text-gray-900 mb-2 flex items-center">
                            <Mail className="h-4 w-4 mr-2" /> 이메일
                        </h4>
                        <p className="text-gray-600">{officeInfo.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
