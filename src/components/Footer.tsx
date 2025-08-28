'use client';

import { useEffect, useState } from 'react';
import { useTenantSlug } from '@/shared/providers/TenantProvider';
import { useFooterStore } from '@/shared/store/footerStore';

export default function Footer() {
    const slug = useTenantSlug();
    const { currentFooterInfo, loading, error, fetchFooterInfo } = useFooterStore();
    const [isMobile, setIsMobile] = useState(false);

    // 모바일 감지
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!slug) return;

        fetchFooterInfo(slug).catch((err) => {
            console.error('[Footer] Failed to load footer info:', err);
        });
    }, [slug, fetchFooterInfo]);

    // 모바일용 간단한 footer (로딩 상태)
    if (loading && isMobile) {
        return (
            <footer className="bg-gray-800 text-white mt-6">
                <div className="px-4 py-4">
                    <div className="text-center text-gray-400 text-sm">정보를 불러오는 중...</div>
                </div>
            </footer>
        );
    }

    // 데스크톱용 footer (로딩 상태)
    if (loading) {
        return (
            <footer className="bg-gray-800 text-white mt-12">
                <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                    <div className="text-center text-gray-400">Footer 정보를 불러오는 중...</div>
                </div>
            </footer>
        );
    }

    // 모바일용 간단한 footer (에러 상태)
    if ((error || !currentFooterInfo) && isMobile) {
        return (
            <footer className="bg-gray-800 text-white mt-6">
                <div className="px-4 py-4">
                    <div className="text-center text-xs text-gray-400">
                        © 2024 미아동 791-2882일대 신속통합 재개발 정비사업 주택재개발정비사업조합. All rights reserved.
                    </div>
                </div>
            </footer>
        );
    }

    // 데스크톱용 footer (에러 상태)
    if (error || !currentFooterInfo) {
        return (
            <footer className="bg-gray-800 text-white mt-12">
                <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                    <div className="text-center text-red-400">{error || 'Footer 정보를 불러올 수 없습니다.'}</div>
                </div>
            </footer>
        );
    }

    // 모바일용 간단한 footer
    if (isMobile) {
        return (
            <footer className="bg-gray-800 text-white mt-6">
                <div className="px-4 py-4">
                    <div className="text-center text-xs text-gray-400">
                        © 2024 미아동 791-2882일대 신속통합 재개발 정비사업 주택재개발정비사업조합. All rights reserved.
                    </div>
                </div>
            </footer>
        );
    }

    // 데스크톱용 상세 footer
    return (
        <footer className="bg-gray-800 text-white mt-12">
            <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="text-xl mb-4">{currentFooterInfo.associationName}</h3>
                        <p className="text-gray-300 text-base">{currentFooterInfo.associationSubtitle}</p>
                        {currentFooterInfo.chairman && (
                            <p className="text-gray-300 text-sm mt-2">조합장: {currentFooterInfo.chairman}</p>
                        )}
                        {currentFooterInfo.area && (
                            <p className="text-gray-300 text-sm">면적: {currentFooterInfo.area}</p>
                        )}
                        {currentFooterInfo.members && (
                            <p className="text-gray-300 text-sm">조합원: {currentFooterInfo.members}명</p>
                        )}
                    </div>

                    <div>
                        <h4 className="text-lg mb-4">연락처</h4>
                        <div className="space-y-2 text-base text-gray-300">
                            {currentFooterInfo.contact.phone && <p>전화번호: {currentFooterInfo.contact.phone}</p>}
                            {currentFooterInfo.contact.email && <p>이메일: {currentFooterInfo.contact.email}</p>}
                            {currentFooterInfo.contact.address && <p>주소: {currentFooterInfo.contact.address}</p>}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg mb-4">사업관련 문의</h4>
                        <div className="space-y-2 text-base text-gray-300">
                            {currentFooterInfo.business.businessPhone && (
                                <p>사업추진실: {currentFooterInfo.business.businessPhone}</p>
                            )}
                            {currentFooterInfo.business.webmasterEmail && (
                                <p>홈페이지관리: {currentFooterInfo.business.webmasterEmail}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-8 text-center text-base text-gray-400">
                    <p>
                        © 2024 {currentFooterInfo.associationName} {currentFooterInfo.associationSubtitle}. All rights
                        reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
