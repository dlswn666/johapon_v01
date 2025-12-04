'use client';

import React from 'react';
import { Union } from '@/app/_lib/shared/type/database.types';
import { cn } from '@/lib/utils';
import { Phone, MapPin, Mail, Clock, Building2 } from 'lucide-react';

interface UnionInfoFooterProps {
    union: Union;
    className?: string;
}

/**
 * 조합 정보 Footer 섹션
 * - 전화번호, 주소, 이메일, 운영시간 표시
 * - 조합 소개 표시
 */
export function UnionInfoFooter({ union, className }: UnionInfoFooterProps) {
    // 표시할 정보가 없으면 렌더링하지 않음
    const hasContactInfo = union.phone || union.address || union.email || union.business_hours;
    const hasDescription = union.description;

    if (!hasContactInfo && !hasDescription) {
        return null;
    }

    return (
        <footer className={cn('bg-gray-900 text-gray-300', className)}>
            <div className="container mx-auto px-4 py-12">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* 조합 정보 */}
                    <div className="space-y-6">
                        {/* 조합명 & 로고 */}
                        <div className="flex items-center gap-3">
                            {union.logo_url ? (
                                <img 
                                    src={union.logo_url} 
                                    alt={`${union.name} 로고`}
                                    className="h-12 w-auto object-contain"
                                />
                            ) : (
                                <Building2 className="h-10 w-10 text-blue-400" />
                            )}
                            <h3 className="text-xl font-bold text-white">{union.name}</h3>
                        </div>

                        {/* 조합 소개 */}
                        {hasDescription && (
                            <p className="text-sm leading-relaxed text-gray-400">
                                {union.description}
                            </p>
                        )}
                    </div>

                    {/* 연락처 정보 */}
                    {hasContactInfo && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-white mb-4">연락처</h4>
                            
                            <ul className="space-y-3">
                                {union.phone && (
                                    <li className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-blue-400 flex-shrink-0" />
                                        <a 
                                            href={`tel:${union.phone.replace(/-/g, '')}`}
                                            className="hover:text-white transition-colors"
                                        >
                                            {union.phone}
                                        </a>
                                    </li>
                                )}
                                
                                {union.email && (
                                    <li className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-blue-400 flex-shrink-0" />
                                        <a 
                                            href={`mailto:${union.email}`}
                                            className="hover:text-white transition-colors"
                                        >
                                            {union.email}
                                        </a>
                                    </li>
                                )}
                                
                                {union.address && (
                                    <li className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <span>{union.address}</span>
                                    </li>
                                )}
                                
                                {union.business_hours && (
                                    <li className="flex items-start gap-3">
                                        <Clock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <span className="whitespace-pre-line">{union.business_hours}</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* 저작권 */}
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} {union.name}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export default UnionInfoFooter;


