import React from 'react';

export function MarketingFooter() {
    return (
        <footer className="bg-[#1e2939] text-white w-full py-[37px]">
            <div className="container mx-auto max-w-[1280px] px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-[37px]">
                    {/* 회사 소개 */}
                    <div className="flex flex-col gap-[18px]">
                        <h3 className="text-[22.5px] font-bold leading-[33.75px]">
                            조합온
                        </h3>
                        <div className="text-[#d1d5dc] text-[18px] leading-[30.6px]">
                            <p>투명하고 신뢰할 수 있는</p>
                            <p>재개발 사업을 위한 최고의 파트너</p>
                        </div>
                    </div>

                    {/* 연락처 */}
                    <div className="flex flex-col gap-[18px]">
                        <h4 className="text-[20.25px] font-bold leading-[30.375px]">
                            연락처
                        </h4>
                        <div className="flex flex-col gap-[9px] text-[#d1d5dc] text-[18px] leading-[27px]">
                            <p>
                                전화:{' '}
                                <a
                                    href="tel:0212345678"
                                    className="hover:text-white transition-colors cursor-pointer"
                                >
                                    02-1234-5678
                                </a>
                            </p>
                            <p>팩스: 02-1234-5679</p>
                            <p>
                                이메일:{' '}
                                <a
                                    href="mailto:contact@johapon.com"
                                    className="hover:text-white transition-colors cursor-pointer"
                                >
                                    contact@johapon.com
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* 오시는 길 */}
                    <div className="flex flex-col gap-[18px]">
                        <h4 className="text-[20.25px] font-bold leading-[30.375px]">
                            오시는 길
                        </h4>
                        <div className="text-[#d1d5dc] text-[18px] leading-[30.6px]">
                            <p>서울특별시 강남구 테헤란로 123</p>
                            <p>조합온 빌딩 10층</p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-[#364153] pt-[37px]">
                    <p className="text-[#99a1af] text-[15.75px] text-center leading-[23.625px]">
                        © {new Date().getFullYear()} 조합온. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default MarketingFooter;
