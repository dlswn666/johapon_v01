'use client';

import { useEffect, useState } from 'react';
import { useTenantSlug } from '@/shared/providers/TenantProvider';
import { footerStore, type FooterInfo } from '@/shared/store/footerStore';

export default function Footer() {
    const slug = useTenantSlug();
    const [footerInfo, setFooterInfo] = useState<FooterInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadFooterInfo = async () => {
            if (!slug) return;

            try {
                setLoading(true);
                setError(null);

                const info = await footerStore.getOrFetchBySlug(slug);
                setFooterInfo(info);

                if (!info) {
                    setError('Footer 정보를 불러올 수 없습니다.');
                }
            } catch (err) {
                console.error('[Footer] Failed to load footer info:', err);
                setError(err instanceof Error ? err.message : 'Footer 정보 로드 중 오류가 발생했습니다.');
                setFooterInfo(null);
            } finally {
                setLoading(false);
            }
        };

        loadFooterInfo();
    }, [slug]);

    if (loading) {
        return (
            <footer className="bg-gray-800 text-white mt-12">
                <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                    <div className="text-center text-gray-400">Footer 정보를 불러오는 중...</div>
                </div>
            </footer>
        );
    }

    if (error || !footerInfo) {
        return (
            <footer className="bg-gray-800 text-white mt-12">
                <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                    <div className="text-center text-red-400">{error || 'Footer 정보를 불러올 수 없습니다.'}</div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-gray-800 text-white mt-12">
            <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="text-xl mb-4">{footerInfo.associationName}</h3>
                        <p className="text-gray-300 text-base">{footerInfo.associationSubtitle}</p>
                        {footerInfo.chairman && (
                            <p className="text-gray-300 text-sm mt-2">조합장: {footerInfo.chairman}</p>
                        )}
                        {footerInfo.area && <p className="text-gray-300 text-sm">면적: {footerInfo.area}</p>}
                        {footerInfo.members && <p className="text-gray-300 text-sm">조합원: {footerInfo.members}명</p>}
                    </div>

                    <div>
                        <h4 className="text-lg mb-4">연락처</h4>
                        <div className="space-y-2 text-base text-gray-300">
                            {footerInfo.contact.phone && <p>전화번호: {footerInfo.contact.phone}</p>}
                            {footerInfo.contact.email && <p>이메일: {footerInfo.contact.email}</p>}
                            {footerInfo.contact.address && <p>주소: {footerInfo.contact.address}</p>}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg mb-4">사업관련 문의</h4>
                        <div className="space-y-2 text-base text-gray-300">
                            {footerInfo.business.businessPhone && (
                                <p>사업추진실: {footerInfo.business.businessPhone}</p>
                            )}
                            {footerInfo.business.webmasterEmail && (
                                <p>홈페이지관리: {footerInfo.business.webmasterEmail}</p>
                            )}
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
