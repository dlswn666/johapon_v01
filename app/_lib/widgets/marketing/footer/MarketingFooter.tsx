import React from 'react';
import Link from 'next/link';

export function MarketingFooter() {
    return (
        <footer className="bg-[#1e2939] text-white w-full py-8 md:py-[37px]">
            <div className="container mx-auto max-w-[1280px] px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-[37px]">
                    {/* 회사 소개 */}
                    <div className="flex flex-col gap-3 md:gap-[18px]">
                        <h3
                            className="font-bold"
                            style={{ fontSize: 'var(--text-marketing-footer-title)', lineHeight: '1.5' }}
                        >
                            조합온( 라텔 )
                        </h3>
                        <div
                            className="text-[#d1d5dc]"
                            style={{ fontSize: 'var(--text-marketing-footer-body)', lineHeight: '1.7' }}
                        >
                            <p>투명하고 신뢰할 수 있는</p>
                            <p>재개발 사업을 위한 최고의 파트너</p>
                        </div>
                    </div>

                    {/* 연락처 */}
                    <div className="flex flex-col gap-3 md:gap-[18px]">
                        <h4
                            className="font-bold"
                            style={{ fontSize: 'var(--text-marketing-footer-title)', lineHeight: '1.5' }}
                        >
                            연락처
                        </h4>
                        <div
                            className="flex flex-col gap-2 md:gap-[9px] text-[#d1d5dc]"
                            style={{ fontSize: 'var(--text-marketing-footer-body)', lineHeight: '1.5' }}
                        >
                            <p>
                                전화:{' '}
                                <a href="tel:0212345678" className="hover:text-white transition-colors cursor-pointer">
                                    010-3504-8164
                                </a>
                            </p>
                            <p>
                                이메일:{' '}
                                <a
                                    href="mailto:contact@johapon.com"
                                    className="hover:text-white transition-colors cursor-pointer"
                                >
                                    injostar@naver.com
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* 오시는 길 */}
                    <div className="flex flex-col gap-3 md:gap-[18px]">
                        <h4
                            className="font-bold"
                            style={{ fontSize: 'var(--text-marketing-footer-title)', lineHeight: '1.5' }}
                        >
                            오시는 길
                        </h4>
                        <div
                            className="text-[#d1d5dc]"
                            style={{ fontSize: 'var(--text-marketing-footer-body)', lineHeight: '1.7' }}
                        >
                            <p></p>
                            <p></p>
                        </div>
                    </div>
                </div>

                {/* 사업자 정보 */}
                <div
                    className="flex flex-wrap justify-center items-center gap-2 md:gap-4 text-[#99a1af] text-center mb-6 md:mb-[37px]"
                    style={{ fontSize: 'var(--text-marketing-footer-body)', lineHeight: '1.5' }}
                >
                    <span>상호: 라텔</span>
                    <span className="hidden md:inline">|</span>
                    <span>대표: 정인주</span>
                    <span className="hidden md:inline">|</span>
                    <span>사업자등록번호: 276-40-01354</span>
                    <span className="hidden md:inline">|</span>
                    <span>주소: 서울특별시 강북구 인수봉로 6가길 9</span>
                </div>

                {/* 약관 링크 */}
                <div
                    className="flex flex-wrap justify-center items-center gap-4 md:gap-6 mb-6 md:mb-[37px]"
                    style={{ fontSize: 'var(--text-marketing-footer-body)', lineHeight: '1.5' }}
                >
                    <Link
                        href="/terms"
                        className="text-[#99a1af] hover:text-white transition-colors"
                    >
                        이용약관
                    </Link>
                    <span className="text-[#4b5563]">|</span>
                    <Link
                        href="/privacy"
                        className="text-[#99a1af] hover:text-white transition-colors"
                    >
                        개인정보처리방침
                    </Link>
                </div>

                {/* Copyright */}
                <div className="border-t border-[#364153] pt-6 md:pt-[37px]">
                    <p
                        className="text-[#99a1af] text-center"
                        style={{ fontSize: 'var(--text-marketing-footer-body)', lineHeight: '1.5' }}
                    >
                        © {new Date().getFullYear()} 조합온. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default MarketingFooter;
