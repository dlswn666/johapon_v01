import { footerInfo } from '@/lib/mockData';

export default function Footer() {
    return (
        <footer className="bg-gray-800 text-white mt-12">
            <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="text-xl mb-4">{footerInfo.associationName}</h3>
                        <p className="text-gray-300 text-base">{footerInfo.associationSubtitle}</p>
                    </div>

                    <div>
                        <h4 className="text-lg mb-4">연락처</h4>
                        <div className="space-y-2 text-base text-gray-300">
                            <p>전화번호: {footerInfo.contact.phone}</p>
                            <p>이메일: {footerInfo.contact.email}</p>
                            <p>주소: {footerInfo.contact.address}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg mb-4">사업관련 문의</h4>
                        <div className="space-y-2 text-base text-gray-300">
                            <p>사업추진실: {footerInfo.business.businessPhone}</p>
                            <p>홈페이지관리: {footerInfo.business.webmasterEmail}</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-8 text-center text-base text-gray-400">
                    <p>
                        © 2024 {footerInfo.associationName} {footerInfo.associationSubtitle}. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
