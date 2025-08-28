'use client';

import { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { useAnnouncementStore } from '@/shared/store/announcementStore';

interface AnnouncementsFilterClientProps {
    onFilterChange?: (filter: { 
        categoryKey?: string; 
        searchTerm?: string; 
        subcategoryId?: string;
        isUrgent?: boolean;
        isPinned?: boolean;
        popup?: boolean;
        alrimtalkSent?: boolean;
    }) => void;
}

export default function AnnouncementsFilterClient({ onFilterChange }: AnnouncementsFilterClientProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [urgentFilter, setUrgentFilter] = useState<string>('all'); // all, urgent, normal
    const [pinnedFilter, setPinnedFilter] = useState<string>('all'); // all, pinned, normal
    const [popupFilter, setPopupFilter] = useState<string>('all'); // all, popup, normal
    const [alrimtalkFilter, setAlrimtalkFilter] = useState<string>('all'); // all, sent, not_sent

    const { subcategories } = useAnnouncementStore();

    // 카테고리 변경 시 서브카테고리 초기화
    useEffect(() => {
        setSelectedSubcategory('all');
    }, [selectedCategory]);

    const buildFilterObject = (overrides: any = {}) => ({
        categoryKey: (overrides.categoryKey !== undefined ? overrides.categoryKey : selectedCategory) === 'all' ? undefined : (overrides.categoryKey !== undefined ? overrides.categoryKey : selectedCategory),
        subcategoryId: (overrides.subcategoryId !== undefined ? overrides.subcategoryId : selectedSubcategory) === 'all' ? undefined : (overrides.subcategoryId !== undefined ? overrides.subcategoryId : selectedSubcategory),
        searchTerm: (overrides.searchTerm !== undefined ? overrides.searchTerm : searchTerm) || undefined,
        isUrgent: (overrides.urgentFilter !== undefined ? overrides.urgentFilter : urgentFilter) === 'urgent' ? true : (overrides.urgentFilter !== undefined ? overrides.urgentFilter : urgentFilter) === 'normal' ? false : undefined,
        isPinned: (overrides.pinnedFilter !== undefined ? overrides.pinnedFilter : pinnedFilter) === 'pinned' ? true : (overrides.pinnedFilter !== undefined ? overrides.pinnedFilter : pinnedFilter) === 'normal' ? false : undefined,
        popup: (overrides.popupFilter !== undefined ? overrides.popupFilter : popupFilter) === 'popup' ? true : (overrides.popupFilter !== undefined ? overrides.popupFilter : popupFilter) === 'normal' ? false : undefined,
        alrimtalkSent: (overrides.alrimtalkFilter !== undefined ? overrides.alrimtalkFilter : alrimtalkFilter) === 'sent' ? true : (overrides.alrimtalkFilter !== undefined ? overrides.alrimtalkFilter : alrimtalkFilter) === 'not_sent' ? false : undefined,
    });

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        onFilterChange?.(buildFilterObject({ categoryKey: category, subcategoryId: 'all' }));
    };

    const handleSubcategoryChange = (subcategory: string) => {
        setSelectedSubcategory(subcategory);
        onFilterChange?.(buildFilterObject({ subcategoryId: subcategory }));
    };

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
    };

    const handleSearch = () => {
        onFilterChange?.(buildFilterObject());
    };

    const handleUrgentFilterChange = (filter: string) => {
        setUrgentFilter(filter);
        onFilterChange?.(buildFilterObject({ urgentFilter: filter }));
    };

    const handlePinnedFilterChange = (filter: string) => {
        setPinnedFilter(filter);
        onFilterChange?.(buildFilterObject({ pinnedFilter: filter }));
    };

    const handlePopupFilterChange = (filter: string) => {
        setPopupFilter(filter);
        onFilterChange?.(buildFilterObject({ popupFilter: filter }));
    };

    const handleAlrimtalkFilterChange = (filter: string) => {
        setAlrimtalkFilter(filter);
        onFilterChange?.(buildFilterObject({ alrimtalkFilter: filter }));
    };

    // 현재 선택된 카테고리의 서브카테고리만 필터링
    const filteredSubcategories = subcategories.filter(
        (sub) => selectedCategory === 'all' || sub.category_key === selectedCategory
    );

    return (
        <div className="space-y-4">
            {/* First Row: Category and Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subcategory */}
                <div className="flex items-center space-x-2 text-black">
                    <Select value={selectedSubcategory} onValueChange={handleSubcategoryChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="서브카테고리 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            {filteredSubcategories.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                    {sub.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Second Row: Filter Options */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Urgent Filter */}
                <div className="text-black">
                    <Select value={urgentFilter} onValueChange={handleUrgentFilterChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="긴급 공지" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="urgent">긴급만</SelectItem>
                            <SelectItem value="normal">일반만</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Pinned Filter */}
                <div className="text-black">
                    <Select value={pinnedFilter} onValueChange={handlePinnedFilterChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="상단 고정" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="pinned">고정만</SelectItem>
                            <SelectItem value="normal">일반만</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Popup Filter */}
                <div className="text-black">
                    <Select value={popupFilter} onValueChange={handlePopupFilterChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="팝업 공지" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="popup">팝업만</SelectItem>
                            <SelectItem value="normal">일반만</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Alrimtalk Filter */}
                <div className="text-black">
                    <Select value={alrimtalkFilter} onValueChange={handleAlrimtalkFilterChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="알림톡 발송" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="sent">발송완료</SelectItem>
                            <SelectItem value="not_sent">미발송</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Third Row: Search */}
            <div className="flex space-x-2 text-black">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => handleSearchTermChange(e.target.value)}
                        placeholder="공지사항 검색..."
                        className="pl-10"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700 text-white px-6">
                    <Search className="h-4 w-4 mr-2" /> 검색
                </Button>
            </div>
        </div>
    );
}
