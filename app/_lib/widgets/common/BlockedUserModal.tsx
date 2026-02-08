'use client';

import React from 'react';
import { Ban, Phone } from 'lucide-react';
import { useFocusTrap } from '@/app/_lib/shared/hooks/useFocusTrap';

interface BlockedUserModalProps {
    reason: string | null;
    unionPhone?: string | null;
}

export default function BlockedUserModal({ reason, unionPhone }: BlockedUserModalProps) {
    const focusTrapRef = useFocusTrap(true);

    return (
        <div ref={focusTrapRef} role="alertdialog" aria-modal="true" aria-labelledby="blocked-modal-title" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* 헤더 */}
                <div className="bg-red-500 p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ban className="w-8 h-8 text-white" />
                    </div>
                    <h2 id="blocked-modal-title" className="text-[22px] font-bold text-white">접근이 제한되었습니다</h2>
                </div>

                {/* 본문 */}
                <div className="p-6 space-y-4">
                    <p className="text-[16px] text-gray-700 text-center leading-relaxed">
                        허용되지 않은 접근입니다.
                        <br />
                        조합 사무실에 문의하세요.
                    </p>

                    {reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-[12px] text-red-600 font-medium mb-1">차단 사유</p>
                            <p className="text-[14px] text-red-800">{reason}</p>
                        </div>
                    )}

                    {unionPhone && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#4E8C6D]/10 rounded-full flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-[#4E8C6D]" />
                                </div>
                                <div>
                                    <p className="text-[12px] text-gray-500">조합 사무실</p>
                                    <a
                                        href={`tel:${unionPhone}`}
                                        className="text-[16px] font-bold text-[#4E8C6D] hover:underline"
                                    >
                                        {unionPhone}
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 안내 문구 */}
                <div className="p-4 bg-gray-100 text-center">
                    <p className="text-[13px] text-gray-500">
                        문의 후 차단이 해제되면 다시 접속할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
