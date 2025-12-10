import Link from 'next/link';

export default function ContactPage() {
    return (
        <div className="bg-white">
            <div className="max-w-7xl mx-auto py-10 md:py-16 px-4 md:px-6 lg:px-8">
                <div className="max-w-lg mx-auto md:max-w-none md:grid md:grid-cols-2 md:gap-8">
                    <div>
                        <h2
                            className="font-extrabold text-gray-900"
                            style={{
                                fontSize: 'var(--text-marketing-section-title)',
                                lineHeight: 'var(--leading-marketing-section-title)',
                            }}
                        >
                            조합 홈페이지 개설 문의
                        </h2>
                        <div className="mt-10">
                            <p
                                className="text-gray-600"
                                style={{
                                    fontSize: 'var(--text-marketing-card-body)',
                                    lineHeight: 'var(--leading-marketing-card-body)',
                                }}
                            >
                                홈페이지 개설 관련하여 궁굼한 점이 있으신가요?
                                <br />
                                아래 연락처로 문의 주시면 친절하게 안내해 드리겠습니다.
                            </p>
                        </div>
                        <div className="mt-7 md:mt-58">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg
                                        className="h-5 w-5 md:h-6 md:w-6 text-[#4e8c6d]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                <div
                                    className="ml-3 text-gray-600"
                                    style={{ fontSize: 'var(--text-marketing-card-body)' }}
                                >
                                    <p>injostar@naver.com</p>
                                </div>
                            </div>
                            <div className="mt-5 md:mt-6 flex">
                                <div className="flex-shrink-0">
                                    <svg
                                        className="h-5 w-5 md:h-6 md:w-6 text-[#4e8c6d]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                        />
                                    </svg>
                                </div>
                                <div
                                    className="ml-3 text-gray-600"
                                    style={{ fontSize: 'var(--text-marketing-card-body)' }}
                                >
                                    <p>010-3504-8164</p>
                                    <p className="mt-1">평일 09:00 ~ 18:00 (주말/공휴일 휴무)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 sm:mt-12 md:mt-0">
                        <div className="bg-[#4e8c6d]/10 rounded-lg shadow-lg overflow-hidden p-5 md:p-8">
                            <h3
                                className="font-medium text-[#2d2d2d]"
                                style={{ fontSize: 'var(--text-marketing-card-title)' }}
                            >
                                FAQ
                            </h3>
                            <ul className="mt-4 space-y-8">
                                <li>
                                    <p
                                        className="font-semibold text-[#2d2d2d]"
                                        style={{ fontSize: 'var(--text-marketing-faq-question)' }}
                                    >
                                        Q. 홈페이지 구축 비용은 얼마인가요?
                                    </p>
                                    <p
                                        className="mt-2 text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-faq-answer)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        A. 홈페이지 구축 비용은 <strong>무료</strong>입니다. 단, 운영 비용이 발생합니다.
                                        <br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;초기 3개월은 운영비가 면제되며,
                                        <br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;이후 비용은 상담을 통해 상세히 안내해 드립니다.
                                    </p>
                                </li>
                                <li>
                                    <p
                                        className="font-semibold text-[#2d2d2d]"
                                        style={{ fontSize: 'var(--text-marketing-faq-question)' }}
                                    >
                                        Q. 구축까지 얼마나 걸리나요?
                                    </p>
                                    <p
                                        className="mt-2 text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-faq-answer)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        A. 시스템 구축은 <strong>1시간이면 충분</strong>합니다.
                                        <br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;다만, 조합의 내부 정보를 정리하고 등록하는 데
                                        <br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;추가적인 시간이 소요될 수 있습니다.
                                    </p>
                                </li>
                                <li>
                                    <p
                                        className="font-semibold text-[#2d2d2d]"
                                        style={{ fontSize: 'var(--text-marketing-faq-question)' }}
                                    >
                                        Q. 홈페이지 구축 후 조합 정보 적용은 어떻게 하나요?
                                    </p>
                                    <p
                                        className="mt-2 text-gray-600"
                                        style={{
                                            fontSize: 'var(--text-marketing-faq-answer)',
                                            lineHeight: 'var(--leading-marketing-card-body)',
                                        }}
                                    >
                                        A. 걱정하지 마세요. <strong>조합온</strong>에서
                                        <br />
                                        &nbsp;&nbsp;&nbsp;&nbsp;초기 정보 입력 및 홈페이지 구성을 직접 도와드립니다.
                                    </p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="mt-10 md:mt-12 border-t border-gray-200 pt-6 md:pt-8">
                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="text-[#4e8c6d] hover:text-[#3d7a5c] font-medium"
                            style={{ fontSize: 'var(--text-marketing-card-body)' }}
                        >
                            &larr; 홈으로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
