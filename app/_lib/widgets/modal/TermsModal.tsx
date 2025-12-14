'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X, FileText } from 'lucide-react';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 개인정보 수집 및 이용 동의 약관 모달
 * 정보통신망법 및 개인정보보호법에 따른 필수 항목 포함
 */
export function TermsModal({ isOpen, onClose }: TermsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div
                className={cn(
                    'bg-white flex flex-col',
                    // 모바일: 전체 화면
                    'w-full h-full',
                    // 태블릿 이상: 중앙 모달
                    'md:w-full md:max-w-[600px] md:h-auto md:max-h-[90vh] md:rounded-2xl'
                )}
            >
                {/* 헤더 */}
                <div className="flex-shrink-0 border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-[#4E8C6D]" />
                        <h2 className="text-lg md:text-xl font-bold text-gray-900">개인정보 수집 및 이용 동의</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
                    <div className="prose prose-sm md:prose max-w-none">
                        {/* 수집 목적 */}
                        <section className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4E8C6D] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    1
                                </span>
                                수집 및 이용 목적
                            </h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-1">
                                <li>조합원 본인 확인 및 서비스 제공</li>
                                <li>조합 소식 및 공지사항 안내</li>
                                <li>민원 처리 및 고객 상담</li>
                                <li>조합 총회 등 주요 행사 안내</li>
                            </ul>
                        </section>

                        {/* 수집 항목 */}
                        <section className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4E8C6D] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    2
                                </span>
                                수집 항목
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="mb-3">
                                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded mr-2">
                                        필수
                                    </span>
                                    <span className="text-gray-700">이름, 휴대폰 번호, 물건지 주소</span>
                                </div>
                                <div>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mr-2">
                                        선택
                                    </span>
                                    <span className="text-gray-700">생년월일, 상세 주소</span>
                                </div>
                            </div>
                        </section>

                        {/* 보유 기간 */}
                        <section className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4E8C6D] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    3
                                </span>
                                보유 및 이용 기간
                            </h3>
                            <ul className="list-disc pl-6 text-gray-700 space-y-1">
                                <li>회원 탈퇴 시까지</li>
                                <li>단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관</li>
                            </ul>
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-700">
                                    <strong>관련 법령에 따른 보존 기간</strong>
                                    <br />
                                    • 계약 또는 청약철회 등에 관한 기록: 5년
                                    <br />
                                    • 대금결제 및 재화 등의 공급에 관한 기록: 5년
                                    <br />• 소비자 불만 또는 분쟁처리에 관한 기록: 3년
                                </p>
                            </div>
                        </section>

                        {/* 동의 거부 권리 */}
                        <section className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4E8C6D] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    4
                                </span>
                                동의 거부 권리 및 불이익
                            </h3>
                            <p className="text-gray-700 mb-2">
                                귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다.
                            </p>
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    <strong>주의:</strong> 필수 항목에 대한 동의를 거부하실 경우 조합원 등록 및 서비스
                                    이용이 제한될 수 있습니다.
                                </p>
                            </div>
                        </section>

                        {/* 개인정보 처리 위탁 */}
                        <section className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4E8C6D] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    5
                                </span>
                                개인정보 처리 위탁
                            </h3>
                            <p className="text-gray-700">
                                원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.
                            </p>
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-medium">
                                                수탁업체
                                            </th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-medium">
                                                위탁 업무
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-300 px-3 py-2">Supabase Inc.</td>
                                            <td className="border border-gray-300 px-3 py-2">
                                                데이터베이스 호스팅 및 관리
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-300 px-3 py-2">Vercel Inc.</td>
                                            <td className="border border-gray-300 px-3 py-2">웹 서비스 호스팅</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* 법적 근거 */}
                        <section className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4E8C6D] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    6
                                </span>
                                법적 근거
                            </h3>
                            <p className="text-gray-700">본 동의는 다음 법률에 근거하여 수집됩니다.</p>
                            <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                                <li>정보통신망 이용촉진 및 정보보호 등에 관한 법률</li>
                                <li>개인정보보호법</li>
                            </ul>
                        </section>

                        {/* 문의처 */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#4E8C6D] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    7
                                </span>
                                개인정보 관련 문의
                            </h3>
                            <p className="text-gray-700">
                                개인정보 처리에 관한 문의사항이 있으시면 조합 관리자에게 연락해주시기 바랍니다.
                            </p>
                        </section>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex-shrink-0 border-t border-gray-200 p-4 md:p-6">
                    <button
                        onClick={onClose}
                        className={cn(
                            'w-full h-14 md:h-16 rounded-xl',
                            'text-base md:text-lg font-medium text-white',
                            'bg-[#4E8C6D] hover:bg-[#3d7058]',
                            'transition-colors'
                        )}
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TermsModal;
