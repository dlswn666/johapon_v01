'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { X, Shield, FileText, Check, ExternalLink, UserCheck } from 'lucide-react';

interface TermsConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAgree: () => void;
}

/**
 * 카카오싱크 가입 전 약관 동의 확인 모달
 * 이용약관 및 개인정보처리방침 동의를 받은 후 카카오 로그인 진행
 */
export function TermsConsentModal({ isOpen, onClose, onAgree }: TermsConsentModalProps) {
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [ageAgreed, setAgeAgreed] = useState(false);

    const allAgreed = termsAgreed && privacyAgreed && ageAgreed;

    const handleAgreeAll = () => {
        setTermsAgreed(true);
        setPrivacyAgreed(true);
        setAgeAgreed(true);
    };

    const handleConfirm = () => {
        if (allAgreed) {
            onAgree();
            // 상태 초기화
            setTermsAgreed(false);
            setPrivacyAgreed(false);
            setAgeAgreed(false);
        }
    };

    const handleClose = () => {
        // 상태 초기화
        setTermsAgreed(false);
        setPrivacyAgreed(false);
        setAgeAgreed(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
            <div
                className={cn(
                    'bg-white flex flex-col',
                    'w-full max-w-md rounded-2xl shadow-2xl',
                    'max-h-[90vh] overflow-hidden'
                )}
            >
                {/* 헤더 */}
                <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">약관 동의</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <p className="text-gray-600 mb-6">
                        서비스 이용을 위해 아래 약관에 동의해 주세요.
                    </p>

                    {/* 전체 동의 */}
                    <button
                        onClick={handleAgreeAll}
                        className={cn(
                            'w-full p-4 rounded-xl border-2 mb-4 transition-all',
                            'flex items-center gap-3',
                            allAgreed
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                    >
                        <div
                            className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                                allAgreed ? 'bg-blue-500' : 'bg-gray-200'
                            )}
                        >
                            <Check className={cn('w-4 h-4', allAgreed ? 'text-white' : 'text-gray-400')} />
                        </div>
                        <span className={cn('font-semibold', allAgreed ? 'text-blue-700' : 'text-gray-700')}>
                            전체 동의하기
                        </span>
                    </button>

                    <div className="space-y-3">
                        {/* 이용약관 동의 */}
                        <div
                            className={cn(
                                'p-4 rounded-xl border transition-all',
                                termsAgreed ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setTermsAgreed(!termsAgreed)}
                                    className="flex items-center gap-3 flex-1"
                                >
                                    <div
                                        className={cn(
                                            'w-5 h-5 rounded flex items-center justify-center transition-colors',
                                            termsAgreed ? 'bg-blue-500' : 'bg-gray-200'
                                        )}
                                    >
                                        <Check className={cn('w-3 h-3', termsAgreed ? 'text-white' : 'text-gray-400')} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-700">
                                            이용약관 동의 <span className="text-red-500">(필수)</span>
                                        </span>
                                    </div>
                                </button>
                                <Link
                                    href="/terms"
                                    target="_blank"
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    aria-label="이용약관 보기"
                                >
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                </Link>
                            </div>
                        </div>

                        {/* 개인정보처리방침 동의 */}
                        <div
                            className={cn(
                                'p-4 rounded-xl border transition-all',
                                privacyAgreed ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setPrivacyAgreed(!privacyAgreed)}
                                    className="flex items-center gap-3 flex-1"
                                >
                                    <div
                                        className={cn(
                                            'w-5 h-5 rounded flex items-center justify-center transition-colors',
                                            privacyAgreed ? 'bg-blue-500' : 'bg-gray-200'
                                        )}
                                    >
                                        <Check className={cn('w-3 h-3', privacyAgreed ? 'text-white' : 'text-gray-400')} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-700">
                                            개인정보처리방침 동의 <span className="text-red-500">(필수)</span>
                                        </span>
                                    </div>
                                </button>
                                <Link
                                    href="/privacy"
                                    target="_blank"
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    aria-label="개인정보처리방침 보기"
                                >
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                </Link>
                            </div>
                        </div>

                        {/* 만 14세 이상 연령 동의 */}
                        <div
                            className={cn(
                                'p-4 rounded-xl border transition-all',
                                ageAgreed ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
                            )}
                        >
                            <button
                                onClick={() => setAgeAgreed(!ageAgreed)}
                                className="flex items-center gap-3 w-full"
                            >
                                <div
                                    className={cn(
                                        'w-5 h-5 rounded flex items-center justify-center transition-colors',
                                        ageAgreed ? 'bg-blue-500' : 'bg-gray-200'
                                    )}
                                >
                                    <Check className={cn('w-3 h-3', ageAgreed ? 'text-white' : 'text-gray-400')} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-700">
                                        만 14세 이상입니다 <span className="text-red-500">(필수)</span>
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* 안내 문구 */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                            동의 후 카카오 계정으로 간편하게 가입이 진행됩니다.
                            카카오톡에 로그인되어 있다면 별도 로그인 없이 빠르게 가입할 수 있습니다.
                        </p>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex-shrink-0 border-t border-gray-200 p-4 flex gap-3">
                    <button
                        onClick={handleClose}
                        className={cn(
                            'flex-1 h-12 rounded-xl',
                            'text-base font-medium text-gray-700',
                            'bg-gray-100 hover:bg-gray-200',
                            'transition-colors'
                        )}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!allAgreed}
                        className={cn(
                            'flex-1 h-12 rounded-xl',
                            'text-base font-medium text-white',
                            'transition-all',
                            allAgreed
                                ? 'bg-[#FEE500] hover:bg-[#FDD800] text-[#191919]'
                                : 'bg-gray-300 cursor-not-allowed'
                        )}
                    >
                        동의하고 계속하기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TermsConsentModal;

