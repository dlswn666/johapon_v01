'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

// 메뉴 구조 정의
const menuStructure: Record<string, { parent?: { label: string; href?: string }; label: string }> = {
    // 조합 소식
    'news': { label: '조합 소식' },
    'news/notice': { parent: { label: '조합 소식' }, label: '공지사항' },
    'news/qna': { parent: { label: '조합 소식' }, label: '질문 게시판' },
    
    // 소통방
    'communication': { label: '소통방' },
    'communication/union-info': { parent: { label: '소통방' }, label: '조합 정보 공유' },
    'communication/free-board': { parent: { label: '소통방' }, label: '자유 게시판' },
    
    // 관리자
    'admin': { label: '관리자' },
    
    // 알림톡 관리
    'dashboard': { label: '알림톡 관리' },
};

export default function UnionBreadcrumb() {
    const pathname = usePathname();
    const { slug } = useSlug();

    // pathname에서 slug를 제외한 경로 추출
    // 예: /my-union/news/notice/123 -> news/notice/123
    const pathWithoutSlug = pathname.replace(`/${slug}`, '').replace(/^\//, '');
    
    // 경로가 없으면 (홈 페이지) breadcrumb 표시 안함
    if (!pathWithoutSlug) {
        return null;
    }

    // 경로 세그먼트 분리
    const segments = pathWithoutSlug.split('/');
    
    // Breadcrumb 아이템 생성
    const breadcrumbItems: BreadcrumbItem[] = [];
    
    // 메뉴 구조에서 매칭되는 항목 찾기
    let currentPath = '';
    let foundMenu = false;
    
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        
        const menuItem = menuStructure[currentPath];
        
        if (menuItem) {
            foundMenu = true;
            
            // 상위 메뉴가 있고 아직 추가되지 않았으면 추가
            if (menuItem.parent && breadcrumbItems.length === 0) {
                breadcrumbItems.push({
                    label: menuItem.parent.label,
                    href: menuItem.parent.href,
                });
            }
            
            // 현재 메뉴 추가
            const isLast = i === segments.length - 1;
            breadcrumbItems.push({
                label: menuItem.label,
                href: isLast ? undefined : `/${slug}/${currentPath}`,
            });
        } else if (foundMenu) {
            // 메뉴 구조에 없는 세그먼트 (상세 페이지, new, edit 등)
            if (segment === 'new') {
                breadcrumbItems.push({ label: '작성' });
            } else if (segment === 'edit') {
                breadcrumbItems.push({ label: '수정' });
            } else if (!isNaN(Number(segment))) {
                // 숫자인 경우 상세 페이지
                breadcrumbItems.push({ label: '상세' });
            }
        }
    }

    // 아이템이 없으면 표시 안함
    if (breadcrumbItems.length === 0) {
        return null;
    }

    return (
        <nav className="bg-gray-50 border-b border-gray-100">
            <div className="container mx-auto px-4">
                <ol className="flex items-center gap-2 py-3 text-sm">
                    {/* 홈 아이콘 */}
                    <li>
                        <Link
                            href={`/${slug}`}
                            className="text-gray-400 hover:text-[#4e8c6d] transition-colors"
                            aria-label="홈으로 이동"
                        >
                            <Home className="size-4" />
                        </Link>
                    </li>
                    
                    {breadcrumbItems.map((item, index) => (
                        <React.Fragment key={index}>
                            <li className="text-gray-300">
                                <ChevronRight className="size-4" />
                            </li>
                            <li>
                                {item.href ? (
                                    <Link
                                        href={item.href}
                                        className="text-gray-500 hover:text-[#4e8c6d] transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className={cn(
                                        index === breadcrumbItems.length - 1
                                            ? 'text-[#4e8c6d] font-medium'
                                            : 'text-gray-500'
                                    )}>
                                        {item.label}
                                    </span>
                                )}
                            </li>
                        </React.Fragment>
                    ))}
                </ol>
            </div>
        </nav>
    );
}

