'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Database, Clock, Users, Phone, AlertTriangle, FileText, Globe } from 'lucide-react';

/**
 * 개인정보처리방침 페이지
 * 카카오싱크 연동을 위한 필수 페이지
 */
export default function PrivacyPage() {
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
                            <Shield className="w-6 h-6 text-emerald-600" />
                            <h1 className="text-xl font-bold text-slate-900">개인정보처리방침</h1>
                        </div>
                    </div>
                    <Link
                        href="/privacy/en"
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
                    {/* 서문 */}
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-emerald-800">
                            라텔(이하 &quot;회사&quot;)은 「개인정보 보호법」 및 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라
                            이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여
                            다음과 같이 개인정보 처리방침을 수립·공개합니다.
                        </p>
                    </div>

                    {/* 수집 항목 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Database className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제1조 (수집하는 개인정보 항목)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
                            
                            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded mr-2">
                                        필수
                                    </span>
                                    <span className="font-medium">카카오 로그인 시</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>카카오 계정 ID (고유 식별자)</li>
                                        <li>닉네임</li>
                                        <li>프로필 사진 URL</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mr-2">
                                        선택
                                    </span>
                                    <span className="font-medium">카카오 로그인 시</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>이메일 주소</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded mr-2">
                                        필수
                                    </span>
                                    <span className="font-medium">조합원 가입 시</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>이름</li>
                                        <li>휴대폰 번호</li>
                                        <li>물건지 주소</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mr-2">
                                        선택
                                    </span>
                                    <span className="font-medium">조합원 가입 시</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>생년월일</li>
                                        <li>상세 주소</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-700">
                                    <strong>자동 수집 정보:</strong> 서비스 이용 과정에서 IP 주소, 접속 시간, 브라우저 정보 등이
                                    자동으로 수집될 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 수집 목적 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제2조 (개인정보 수집 및 이용 목적)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>회원 관리:</strong> 본인 확인, 가입 의사 확인, 서비스 이용에 따른 본인 식별·인증
                                </li>
                                <li>
                                    <strong>서비스 제공:</strong> 조합원 등록, 공지사항 및 알림 발송, 민원 처리
                                </li>
                                <li>
                                    <strong>조합 총회 등 주요 행사 안내</strong>
                                </li>
                                <li>
                                    <strong>고객 상담 및 불만 처리</strong>
                                </li>
                                <li>
                                    <strong>서비스 개선:</strong> 서비스 이용 통계, 신규 서비스 개발
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* 보유 기간 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제3조 (개인정보 보유 및 이용 기간)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
                                단, 관련 법령에 의해 보존할 필요가 있는 경우 아래와 같이 일정 기간 동안 보관합니다:
                            </p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">보존 항목</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">보존 기간</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">근거 법령</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">계약 또는 청약철회 등에 관한 기록</td>
                                            <td className="border border-slate-300 px-3 py-2">5년</td>
                                            <td className="border border-slate-300 px-3 py-2">전자상거래법</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">대금결제 및 재화 등의 공급에 관한 기록</td>
                                            <td className="border border-slate-300 px-3 py-2">5년</td>
                                            <td className="border border-slate-300 px-3 py-2">전자상거래법</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">소비자 불만 또는 분쟁처리에 관한 기록</td>
                                            <td className="border border-slate-300 px-3 py-2">3년</td>
                                            <td className="border border-slate-300 px-3 py-2">전자상거래법</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">접속 기록</td>
                                            <td className="border border-slate-300 px-3 py-2">3개월</td>
                                            <td className="border border-slate-300 px-3 py-2">통신비밀보호법</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* 제3자 제공 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-amber-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제4조 (개인정보의 제3자 제공)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
                                다만, 아래의 경우에는 예외로 합니다:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>이용자가 사전에 동의한 경우</li>
                                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                            </ul>
                        </div>
                    </section>

                    {/* 처리 위탁 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Database className="w-5 h-5 text-slate-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제5조 (개인정보 처리 위탁)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">수탁업체</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">위탁 업무</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Supabase Inc.</td>
                                            <td className="border border-slate-300 px-3 py-2">데이터베이스 호스팅 및 관리</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Vercel Inc.</td>
                                            <td className="border border-slate-300 px-3 py-2">웹 서비스 호스팅</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">알리고</td>
                                            <td className="border border-slate-300 px-3 py-2">카카오 알림톡 발송</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">카카오</td>
                                            <td className="border border-slate-300 px-3 py-2">카카오 로그인 인증</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* 이용자 권리 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Lock className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제6조 (이용자의 권리와 행사 방법)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>개인정보 열람 요구</li>
                                <li>개인정보 정정·삭제 요구</li>
                                <li>개인정보 처리정지 요구</li>
                                <li>동의 철회</li>
                            </ul>
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    권리 행사는 서비스 내 설정 메뉴 또는 개인정보 보호책임자에게 서면, 전자우편을 통해 요청하실 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 안전성 확보 조치 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제7조 (개인정보의 안전성 확보 조치)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원 교육</li>
                                <li><strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                                <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
                            </ul>
                        </div>
                    </section>

                    {/* 동의 거부 권리 */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제8조 (동의 거부 권리 및 불이익)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                이용자는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다.
                            </p>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    <strong>주의:</strong> 필수 항목에 대한 동의를 거부하실 경우 서비스 이용이 제한될 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 개인정보 보호책임자 */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Phone className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">제9조 (개인정보 보호책임자)</h2>
                        </div>
                        <div className="pl-13">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700">
                                <p><strong>개인정보 보호책임자</strong></p>
                                <p>성명: 정인주</p>
                                <p>직위: 대표</p>
                                <p>이메일: injostar@naver.com</p>
                                <p>전화: 010-3504-8164</p>
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    개인정보 처리에 관한 문의, 불만 처리, 피해 구제 등에 관한 사항은 위 개인정보 보호책임자에게
                                    문의하시기 바랍니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 시행일 */}
                    <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
                        <p>본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.</p>
                        <p className="mt-2">최종 수정일: 2024년 12월 15일</p>
                    </div>
                </div>

                {/* 관련 링크 */}
                <div className="mt-6 flex justify-center gap-4">
                    <Link
                        href="/terms"
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                    >
                        ← 이용약관 보기
                    </Link>
                </div>
            </main>
        </div>
    );
}

