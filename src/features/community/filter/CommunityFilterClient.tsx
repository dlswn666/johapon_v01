'use client';

import { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { useCommunityStore } from '@/shared/store/communityStore';

interface CommunityFilterClientProps {
    onFilterChange?: (filter: { 
        categoryKey?: string; 
        searchTerm?: string; 
        subcategoryId?: string; 
        isAnonymous?: boolean;
    }) => void;
}

export default function CommunityFilterClient({ onFilterChange }: CommunityFilterClientProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
    const [selectedAnonymousStatus, setSelectedAnonymousStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const { subcategories } = useCommunityStore();

    // 카테고리 변경 시 서브카테고리 초기화
    useEffect(() => {
        setSelectedSubcategory('all');
    }, [selectedCategory]);

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        applyFilter({
            categoryKey: category === 'all' ? undefined : category,
            subcategoryId: undefined,
        });
    };

    const handleSubcategoryChange = (subcategory: string) => {
        setSelectedSubcategory(subcategory);
        applyFilter({
            categoryKey: selectedCategory === 'all' ? undefined : selectedCategory,
            subcategoryId: subcategory === 'all' ? undefined : subcategory,
        });
    };

    const handleAnonymousStatusChange = (status: string) => {
        setSelectedAnonymousStatus(status);
        applyFilter({
            isAnonymous: status === 'all' ? undefined : status === 'anonymous',
        });
    };

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
    };

    const handleSearch = () => {
        applyFilter({
            searchTerm: searchTerm || undefined,
        });
    };

    const applyFilter = (updates: Partial<{categoryKey?: string; searchTerm?: string; subcategoryId?: string; isAnonymous?: boolean}>) => {
        onFilterChange?.({
            categoryKey: selectedCategory === 'all' ? undefined : selectedCategory,
            subcategoryId: selectedSubcategory === 'all' ? undefined : selectedSubcategory,
            isAnonymous: selectedAnonymousStatus === 'all' ? undefined : selectedAnonymousStatus === 'anonymous',
            searchTerm: searchTerm || undefined,
            ...updates,
        });
    };

    // 현재 선택된 카테고리의 서브카테고리만 필터링
    const filteredSubcategories = subcategories.filter(
        (sub) => selectedCategory === 'all' || sub.category_key === selectedCategory
    );

    return (
        <div className="space-y-4">
            {/* 첫 번째 줄: 서브카테고리, 작성자 구분 */}
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

                {/* Anonymous Status */}
                <div className="flex items-center space-x-2 text-black">
                    <Select value={selectedAnonymousStatus} onValueChange={handleAnonymousStatusChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="작성자 구분" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="named">실명글</SelectItem>
                            <SelectItem value="anonymous">익명글</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 두 번째 줄: 검색 */}
            <div className="flex space-x-2 text-black">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => handleSearchTermChange(e.target.value)}
                        placeholder="게시글 검색..."
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