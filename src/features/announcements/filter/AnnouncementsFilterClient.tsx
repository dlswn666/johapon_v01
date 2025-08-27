'use client';

import { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { useAnnouncementStore } from '@/shared/store/announcementStore';

interface AnnouncementsFilterClientProps {
    onFilterChange?: (filter: { categoryKey?: string; searchTerm?: string; subcategoryId?: string }) => void;
}

export default function AnnouncementsFilterClient({ onFilterChange }: AnnouncementsFilterClientProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const { subcategories } = useAnnouncementStore();

    // 카테고리 변경 시 서브카테고리 초기화
    useEffect(() => {
        setSelectedSubcategory('all');
    }, [selectedCategory]);

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        onFilterChange?.({
            categoryKey: category === 'all' ? undefined : category,
            subcategoryId: undefined,
            searchTerm: searchTerm || undefined,
        });
    };

    const handleSubcategoryChange = (subcategory: string) => {
        setSelectedSubcategory(subcategory);
        onFilterChange?.({
            categoryKey: selectedCategory === 'all' ? undefined : selectedCategory,
            subcategoryId: subcategory === 'all' ? undefined : subcategory,
            searchTerm: searchTerm || undefined,
        });
    };

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
    };

    const handleSearch = () => {
        onFilterChange?.({
            categoryKey: selectedCategory === 'all' ? undefined : selectedCategory,
            subcategoryId: selectedSubcategory === 'all' ? undefined : selectedSubcategory,
            searchTerm: searchTerm || undefined,
        });
    };

    // 현재 선택된 카테고리의 서브카테고리만 필터링
    const filteredSubcategories = subcategories.filter(
        (sub) => selectedCategory === 'all' || sub.category_key === selectedCategory
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Subcategory */}
            <div className="md:col-span-1 flex items-center space-x-2 text-black">
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

            {/* Search */}
            <div className="md:col-span-4 flex space-x-2 text-black">
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
