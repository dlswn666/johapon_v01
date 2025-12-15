'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Scale, Clock, Users, Phone, Building, Globe } from 'lucide-react';

/**
 * 이용약관 페이지
 * 카카오싱크 연동을 위한 필수 페이지
 */
export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* 헤더 */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="container mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            aria-label="홈으로"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-blue-600" />
                            <h1 className="text-xl font-bold text-slate-900">이용약관</h1>
                        </div>
                    </div>
                    <Link
                        href="/terms/en"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Globe className="w-4 h-4" />
                        <span>English</span>
                    </Link>
                </div>
            </header>

            {/* 콘텐츠 */}
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    {/* 서비스 소개 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Building className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제1조 (목적)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-2">
                            <p>
                                본 약관은 라텔(이하 &quot;회사&quot;)이 제공하는 조합온 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여
                                회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                            </p>
                        </div>
                    </section>

                    {/* 용어 정의 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Scale className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제2조 (용어의 정의)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-2">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>&quot;서비스&quot;</strong>란 회사가 제공하는 재개발/재건축 조합 관리 플랫폼으로,
                                    조합원 관리, 공지사항 발송, 알림톡 서비스 등을 포함합니다.
                                </li>
                                <li>
                                    <strong>&quot;이용자&quot;</strong>란 본 약관에 따라 서비스를 이용하는 조합 관리자 및 조합원을 말합니다.
                                </li>
                                <li>
                                    <strong>&quot;조합&quot;</strong>이란 재개발/재건축 정비사업을 목적으로 설립된 조합을 말합니다.
                                </li>
                                <li>
                                    <strong>&quot;관리자&quot;</strong>란 조합의 운영을 위해 서비스를 관리하는 권한을 부여받은 자를 말합니다.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* 서비스 제공 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제3조 (서비스의 제공)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>회사는 다음과 같은 서비스를 제공합니다:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>조합원 등록 및 관리 서비스</li>
                                <li>공지사항 및 알림 서비스</li>
                                <li>카카오 알림톡 발송 서비스</li>
                                <li>자유게시판 및 Q&A 서비스</li>
                                <li>조합 정보 관리 서비스</li>
                                <li>기타 회사가 정하는 서비스</li>
                            </ul>
                        </div>
                    </section>

                    {/* 회원 가입 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-amber-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제4조 (이용계약의 성립)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>이용계약은 다음과 같이 성립합니다:</p>
                            <ol className="list-decimal pl-6 space-y-2">
                                <li>이용자가 본 약관에 동의하고 카카오 계정으로 로그인합니다.</li>
                                <li>조합 관리자의 초대를 통해 조합원으로 등록됩니다.</li>
                                <li>회사가 이용 승인을 하면 이용계약이 성립됩니다.</li>
                            </ol>
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-700">
                                    <strong>참고:</strong> 본 서비스는 카카오 계정을 통한 간편 로그인(카카오싱크)을 지원합니다.
                                    카카오 계정 연동 시 프로필 정보(닉네임, 프로필 사진)와 이메일이 수집될 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 이용자 의무 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <Scale className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제5조 (이용자의 의무)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
                                <li>서비스를 이용하여 법령 또는 공서양속에 반하는 행위</li>
                                <li>회사 또는 제3자의 지식재산권을 침해하는 행위</li>
                                <li>서비스의 운영을 방해하거나 안정성을 해치는 행위</li>
                                <li>기타 불법적이거나 부당한 행위</li>
                            </ul>
                        </div>
                    </section>

                    {/* 서비스 중단 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-slate-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제6조 (서비스 이용의 제한 및 중지)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>회사는 다음의 경우 서비스 이용을 제한하거나 중지할 수 있습니다:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>서비스 설비의 보수, 점검, 교체 등 정기적 또는 긴급 작업이 필요한 경우</li>
                                <li>이용자가 본 약관을 위반한 경우</li>
                                <li>기타 불가항력적인 사유가 발생한 경우</li>
                            </ul>
                        </div>
                    </section>

                    {/* 면책 조항 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제7조 (면책사항)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    회사는 천재지변, 전쟁, 테러, 해킹 등 불가항력적인 사유로 인해 서비스를 제공할 수 없는 경우
                                    책임이 면제됩니다.
                                </li>
                                <li>
                                    이용자가 자신의 개인정보를 타인에게 유출하여 발생하는 피해에 대해 회사는 책임을 지지 않습니다.
                                </li>
                                <li>
                                    이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 회사는 개입하지 않으며 책임을 지지 않습니다.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* 약관 변경 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제8조 (약관의 변경)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                회사는 필요한 경우 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.
                                약관이 변경되는 경우 회사는 변경 내용을 시행일 7일 전부터 서비스 내 공지사항을 통해 안내합니다.
                            </p>
                        </div>
                    </section>

                    {/* 문의처 */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Phone className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제9조 (문의처)</h2>
                        </div>
                        <div className="pl-13">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700">
                                <p><strong>상호:</strong> 라텔</p>
                                <p><strong>대표:</strong> 정인주</p>
                                <p><strong>사업자등록번호:</strong> 276-40-01354</p>
                                <p><strong>주소:</strong> 서울특별시 강북구 인수봉로 6가길 9</p>
                                <p><strong>이메일:</strong> injostar@naver.com</p>
                                <p><strong>전화:</strong> 010-3504-8164</p>
                            </div>
                        </div>
                    </section>

                    {/* 시행일 */}
                    <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
                        <p>본 약관은 2024년 1월 1일부터 시행됩니다.</p>
                        <p className="mt-2">최종 수정일: 2024년 12월 15일</p>
                    </div>
                </div>

                {/* 관련 링크 */}
                <div className="mt-6 flex justify-center gap-4">
                    <Link
                        href="/privacy"
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                    >
                        개인정보처리방침 보기 →
                    </Link>
                </div>
            </main>
        </div>
    );
}

