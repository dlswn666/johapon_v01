'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Users, MapPin, Building2, Settings, LogOut, Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { menuItems, adminMenuItems } from '@/lib/mockData';

interface HeaderProps {
    isAdmin?: boolean;
}

export default function Header({ isAdmin = true }: HeaderProps) {
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const [activeMenuItem, setActiveMenuItem] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pathname = usePathname();

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

    // 관리자 메뉴 추가
    const allMenuItems = isAdmin ? [...menuItems, ...adminMenuItems] : menuItems;

    const mobileMenuItems = [
        { icon: Building2, label: '대시보드', href: '/', color: 'text-blue-600' },
        { icon: MapPin, label: '사무소 정보', href: '/office', color: 'text-gray-600' },
        { icon: Users, label: '추진 일정', href: '/timeline', color: 'text-orange-600' },
    ];

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

    return (
        <>
            {/* Mobile Header */}
            {isMobile && (
                <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                    <div className="flex justify-between items-center h-16 px-4">
                        {/* Title */}
                        <div className="flex items-center">
                            <Building2 className="h-6 w-6 text-green-600 mr-2" />
                            <span className="text-lg text-gray-900">우리마을 재개발</span>
                        </div>

                        {/* Hamburger Menu */}
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80 p-0">
                                <SheetHeader className="p-6 bg-green-50 border-b">
                                    <SheetTitle className="text-left">
                                        <div className="flex items-center">
                                            <Building2 className="h-6 w-6 text-green-600 mr-2" />
                                            <span className="text-gray-900">우리마을 재개발</span>
                                        </div>
                                    </SheetTitle>
                                </SheetHeader>

                                {/* Mobile Menu Items */}
                                <div className="flex flex-col h-full bg-white">
                                    <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                                        <div className="space-y-2">
                                            {/* Simple menu items */}
                                            {mobileMenuItems.map((item) => (
                                                <Link
                                                    key={item.href}
                                                    href={prefixedHref(item.href)}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="w-full flex items-center px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors"
                                                >
                                                    <item.icon className={`h-5 w-5 mr-3 ${item.color}`} />
                                                    <span className="text-gray-900">{item.label}</span>
                                                </Link>
                                            ))}

                                            {/* Hierarchical menu items */}
                                            {allMenuItems.map((menuCategory) => (
                                                <Collapsible
                                                    key={menuCategory.id}
                                                    open={expandedMenus.includes(menuCategory.id)}
                                                    onOpenChange={() => toggleExpandedMenu(menuCategory.id)}
                                                >
                                                    <CollapsibleTrigger asChild>
                                                        <button className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors">
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
                                                                <span className="text-gray-900">
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
                                                                    className="w-full flex items-center px-4 py-2 text-left rounded-md hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <span className="text-sm text-gray-600">
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
                                    <div className="p-4 border-t border-gray-200">
                                        <div className="flex justify-center">
                                            <Button
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
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
                <nav className="bg-white shadow-sm border-b border-gray-200 relative">
                    <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32">
                        <div className="flex justify-between items-center h-20">
                            <div className="flex items-center">
                                <h1 className="text-xl text-gray-900">작전현대아파트구역 주택재개발정비사업조합</h1>
                            </div>

                            <div
                                className="flex items-center space-x-12"
                                onMouseEnter={handleMenuEnter}
                                onMouseLeave={handleMenuLeave}
                            >
                                {allMenuItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onMouseEnter={() => handleMenuItemHover(item.id)}
                                        className={`text-lg text-gray-700 hover:text-green-600 transition-colors py-2 px-4 ${
                                            activeMenuItem === item.id ? 'text-green-600' : ''
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}

                                <Button
                                    variant="outline"
                                    className="flex items-center border-gray-300 text-gray-700 hover:bg-gray-50 text-lg py-2 px-4 h-auto"
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
                            className="absolute top-full left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50"
                            onMouseEnter={handleMenuEnter}
                            onMouseLeave={handleMenuLeave}
                        >
                            <div className="max-w-none mx-auto px-32 sm:px-32 lg:px-32 py-8">
                                <div className="grid grid-cols-4 gap-8">
                                    {allMenuItems.map((item) => (
                                        <div key={item.id} className="space-y-4">
                                            <h3 className="text-lg text-green-600 mb-4">{item.label}</h3>
                                            <div className="space-y-3">
                                                {item.subItems?.map((subItem) => (
                                                    <Link
                                                        key={subItem.id}
                                                        href={prefixedHref(subItem.href)}
                                                        onClick={handleMenuItemClick}
                                                        className="block w-full text-left text-base text-gray-700 hover:text-green-600 transition-colors py-2 px-3 rounded-md hover:bg-green-50"
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
