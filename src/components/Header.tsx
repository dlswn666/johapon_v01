'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Users, MapPin, Building2, Settings, LogOut, Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigation } from '@/shared/hooks/useNavigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { useTenant } from '@/shared/providers/TenantProvider';
import Image from 'next/image';

interface HeaderProps {
    userRole?: 'member' | 'admin' | 'systemadmin';
}

export default function Header({ userRole: propUserRole }: HeaderProps) {
    const { userRole: authUserRole } = useAuth();
    const userRole = propUserRole || authUserRole;
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const [activeMenuItem, setActiveMenuItem] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pathname = usePathname();

    // 전역 테넌트 상태 사용
    const { tenantInfo, slug: currentSlug, loading: tenantLoading, error: tenantError } = useTenant();

    // 네비게이션 데이터 로드 (tenantInfo가 있을 때만)
    const { menus, loading, error } = useNavigation({
        slug: currentSlug || undefined,
        userRole: userRole,
        enabled: Boolean(currentSlug && tenantInfo),
    });

    // Mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (menuTimeoutRef.current) {
                clearTimeout(menuTimeoutRef.current);
            }
        };
    }, []);

    const toggleExpandedMenu = (menuId: string) => {
        setExpandedMenus((prev) => (prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]));
    };

    const handleMenuEnter = () => {
        if (menuTimeoutRef.current) {
            clearTimeout(menuTimeoutRef.current);
            menuTimeoutRef.current = null;
        }
        setIsMenuHovered(true);
    };

    const handleMenuLeave = () => {
        menuTimeoutRef.current = setTimeout(() => {
            setIsMenuHovered(false);
            setActiveMenuItem('');
        }, 150);
    };

    const handleMenuItemHover = (item: string) => {
        setActiveMenuItem(item);
    };

    const handleMenuItemClick = () => {
        if (menuTimeoutRef.current) {
            clearTimeout(menuTimeoutRef.current);
            menuTimeoutRef.current = null;
        }
        setIsMenuHovered(false);
        setActiveMenuItem('');
    };

    // 데이터베이스에서 로드된 메뉴 사용
    const allMenuItems = menus || [];

    // 모바일 메뉴도 API 데이터 사용
    const mobileMenuItems = allMenuItems;

    // Build tenant-prefixed hrefs when inside a tenant route (/[homepage]/...)
    const prefixedHref = (href: string) => {
        if (!href || href.startsWith('http')) return href;
        const segments = (pathname || '').split('/').filter(Boolean);
        const candidate = segments[0] || '';
        const reserved = new Set([
            '_next',
            'api',
            'admin',
            'announcements',
            'office',
            'chairman-greeting',
            'organization-chart',
            'community',
            'qna',
            'redevelopment',
            'redevelopment-process',
        ]);
        const isTenant = candidate && !reserved.has(candidate);
        const isAdminHref = href.startsWith('/admin');
        if (!isTenant || isAdminHref) return href;
        // normalize root
        if (href === '/') return `/${candidate}`;
        return `/${candidate}${href.startsWith('/') ? href : `/${href}`}`;
    };

    // 테넌트 경로에서 로딩 중일 때 로딩 스켈레톤 표시
    const isInTenantRoute = currentSlug && currentSlug !== 'admin' && currentSlug !== 'api';
    const shouldShowLoading = isInTenantRoute && tenantLoading;

    // 테넌트 정보를 가져올 때 표시할 텍스트 결정
    const getTenantDisplayName = () => {
        if (tenantInfo?.name) return tenantInfo.name;
        if (isInTenantRoute) {
            if (tenantLoading) return '로딩중...';
            if (tenantError) return '로딩 실패';
            return '테넌트 없음';
        }
        return '조합';
    };

    // 테넌트 경로에서 로딩 중일 때 스켈레톤 헤더 표시
    if (shouldShowLoading) {
        return (
            <>
                {/* Mobile Loading Header */}
                {isMobile && (
                    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                        <div className="flex justify-between items-center h-16 px-4">
                            <div className="flex items-center">
                                <div className="w-6 h-6 bg-gray-200 rounded mr-2 animate-pulse"></div>
                                <div className="w-20 h-5 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>
                )}

                {/* Desktop Loading Header */}
                {!isMobile && (
                    <nav className="bg-white shadow-sm border-b border-gray-200 relative">
                        <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32">
                            <div className="flex justify-between items-center h-20">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gray-200 rounded mr-3 animate-pulse"></div>
                                    <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                                <div className="flex items-center space-x-12">
                                    <div className="w-16 h-5 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-16 h-5 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-16 h-5 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="w-20 h-10 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </nav>
                )}
            </>
        );
    }

    return (
        <>
            {/* Mobile Header */}
            {isMobile && (
                <div className="bg-white sticky top-0 z-40" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex justify-between items-center h-[60px] px-4">
                        {/* Title */}
                        <Link href={prefixedHref('/')} className="flex items-center">
                            {tenantInfo?.logo_url ? (
                                <Image
                                    src={tenantInfo.logo_url}
                                    alt={`${tenantInfo.name || '조합'} 로고`}
                                    width={24}
                                    height={24}
                                    className="mr-2"
                                />
                            ) : (
                                <Building2 className="h-6 w-6 text-green-600 mr-2" />
                            )}
                            <span
                                className="leading-[var(--lh)]"
                                style={{ color: 'var(--color-text)', fontSize: 'var(--fs-nav)' }}
                            >
                                {getTenantDisplayName()}
                            </span>
                        </Link>

                        {/* Hamburger Menu */}
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80 p-0">
                                <SheetHeader
                                    className="p-6"
                                    style={{
                                        backgroundColor: 'var(--bg-soft)',
                                        borderBottom: '1px solid var(--color-border)',
                                    }}
                                >
                                    <SheetTitle className="text-left">
                                        <div className="flex items-center">
                                            {tenantInfo?.logo_url ? (
                                                <Image
                                                    src={tenantInfo.logo_url}
                                                    alt={`${tenantInfo.name || '조합'} 로고`}
                                                    width={24}
                                                    height={24}
                                                    className="mr-2"
                                                />
                                            ) : (
                                                <Building2 className="h-6 w-6 text-green-600 mr-2" />
                                            )}
                                            <span
                                                className=""
                                                style={{ color: 'var(--color-text)', fontSize: 'var(--fs-h2)' }}
                                            >
                                                {getTenantDisplayName()}
                                            </span>
                                        </div>
                                    </SheetTitle>
                                </SheetHeader>

                                {/* Mobile Menu Items */}
                                <div className="flex flex-col h-full bg-white">
                                    <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                                        <div className="space-y-2">
                                            {/* API 데이터 기반 메뉴 아이템 */}
                                            {allMenuItems.map((menuCategory) => (
                                                <Collapsible
                                                    key={menuCategory.id}
                                                    open={expandedMenus.includes(menuCategory.id)}
                                                    onOpenChange={() => toggleExpandedMenu(menuCategory.id)}
                                                >
                                                    <CollapsibleTrigger asChild>
                                                        <button className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors hover:bg-[color:var(--bg-soft)]">
                                                            <div className="flex items-center">
                                                                {menuCategory.id === 'association' && (
                                                                    <Building2 className="h-5 w-5 mr-3 text-green-600" />
                                                                )}
                                                                {menuCategory.id === 'redevelopment' && (
                                                                    <MapPin className="h-5 w-5 mr-3 text-purple-600" />
                                                                )}
                                                                {menuCategory.id === 'community' && (
                                                                    <Users className="h-5 w-5 mr-3 text-blue-600" />
                                                                )}
                                                                {menuCategory.id === 'admin' && (
                                                                    <Settings className="h-5 w-5 mr-3 text-purple-600" />
                                                                )}
                                                                <span
                                                                    className=""
                                                                    style={{
                                                                        color: 'var(--color-text)',
                                                                        fontSize: 'var(--fs-body)',
                                                                    }}
                                                                >
                                                                    {menuCategory.label}
                                                                </span>
                                                            </div>
                                                            {expandedMenus.includes(menuCategory.id) ? (
                                                                <ChevronUp className="h-4 w-4 text-gray-500" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-gray-500" />
                                                            )}
                                                        </button>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <div className="space-y-1 ml-8 mt-1">
                                                            {menuCategory.subItems?.map((subItem) => (
                                                                <Link
                                                                    key={subItem.id}
                                                                    href={prefixedHref(subItem.href)}
                                                                    onClick={() => {
                                                                        setMobileMenuOpen(false);
                                                                        handleMenuItemClick();
                                                                    }}
                                                                    className="w-full flex items-center px-4 py-2 text-left rounded-md transition-colors hover:bg-[color:var(--bg-soft)]"
                                                                >
                                                                    <span
                                                                        className=""
                                                                        style={{
                                                                            color: 'var(--color-muted)',
                                                                            fontSize: 'var(--fs-small)',
                                                                        }}
                                                                    >
                                                                        {subItem.label}
                                                                    </span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mobile Logout Button */}
                                    <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                                        <div className="flex justify-center">
                                            <Button variant="ghost" className="hover:bg-red-50">
                                                <LogOut className="h-4 w-4 mr-2" />
                                                로그아웃
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            )}

            {/* Desktop Navigation */}
            {!isMobile && (
                <nav className="bg-white relative" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32">
                        <div className="flex justify-between items-center h-[120px]">
                            <Link href={prefixedHref('/')} className="flex items-center">
                                {tenantInfo?.logo_url ? (
                                    <Image
                                        src={tenantInfo.logo_url}
                                        alt={`${tenantInfo.name || '조합'} 로고`}
                                        width={32}
                                        height={32}
                                        className="mr-3"
                                    />
                                ) : null}
                                <h1
                                    className="transition-colors"
                                    style={{ fontSize: 'var(--fs-nav)', color: 'var(--color-text)' }}
                                >
                                    {getTenantDisplayName()}
                                </h1>
                            </Link>

                            <div
                                className="flex items-center space-x-12"
                                onMouseEnter={handleMenuEnter}
                                onMouseLeave={handleMenuLeave}
                            >
                                {allMenuItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onMouseEnter={() => handleMenuItemHover(item.id)}
                                        className={`transition-colors py-2 px-4 border-b-4 ${
                                            activeMenuItem === item.id
                                                ? 'border-[color:var(--color-accent-2)]'
                                                : 'border-transparent'
                                        }`}
                                        style={{ fontSize: 'var(--fs-nav)', color: 'var(--color-text)' }}
                                    >
                                        {item.label}
                                    </button>
                                ))}

                                <Button
                                    variant="outline"
                                    className="flex items-center py-2 px-4 h-auto hover:bg-[color:var(--bg-soft)]"
                                    style={{
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text)',
                                        fontSize: 'var(--fs-nav)',
                                    }}
                                >
                                    <LogOut className="h-5 w-5 mr-2" />
                                    로그아웃
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Mega Menu Dropdown */}
                    {isMenuHovered && (
                        <div
                            className="absolute top-full left-0 w-full bg-white z-50"
                            style={{ borderTop: '1px solid var(--color-border)' }}
                            onMouseEnter={handleMenuEnter}
                            onMouseLeave={handleMenuLeave}
                        >
                            <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                                <div className="grid grid-cols-4 gap-8">
                                    {allMenuItems.map((item) => (
                                        <div key={item.id} className="space-y-4">
                                            <h3
                                                className="mb-4"
                                                style={{ fontSize: 'var(--fs-tab)', color: 'var(--color-accent)' }}
                                            >
                                                {item.label}
                                            </h3>
                                            <div className="space-y-3">
                                                {item.subItems?.map((subItem) => (
                                                    <Link
                                                        key={subItem.id}
                                                        href={prefixedHref(subItem.href)}
                                                        onClick={handleMenuItemClick}
                                                        className="block w-full text-left transition-colors py-2 px-3 rounded-md hover:bg-[color:var(--bg-soft)]"
                                                        style={{
                                                            fontSize: 'var(--fs-body)',
                                                            color: 'var(--color-text)',
                                                        }}
                                                    >
                                                        {subItem.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </nav>
            )}
        </>
    );
}
