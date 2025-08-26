'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Search, Filter, Plus } from 'lucide-react';
import { useSubcategories } from '@/shared/hooks/useSubcategories';

interface ListFilterProps {
    searchTerm: string;
    selectedCategory: string;
    onSearchChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onSearch: () => void;
    onWriteClick: () => void;
    totalCount: number;
}

const ListFilter: React.FC<ListFilterProps> = ({
    searchTerm,
    selectedCategory,
    onSearchChange,
    onCategoryChange,
    onSearch,
    onWriteClick,
    totalCount,
}) => {
    // DB에서 정보공유방 서브카테고리 조회
    const { subcategories } = useSubcategories('community');
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSearch();
        }
    };

    return (
        <div className="space-y-4">
            {/* Search and Filter */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Left: Category Selection (1/5 width) */}
                        <div className="md:col-span-1 flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <Select value={selectedCategory} onValueChange={onCategoryChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="카테고리 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 ({totalCount})</SelectItem>
                                    {subcategories?.map((category) => {
                                        // 실제로는 API에서 각 카테고리별 개수를 가져와야 함
                                        return (
                                            <SelectItem key={category.id} value={category.name}>
                                                {category.name}
                                            </SelectItem>
                                        );
                                    }) || []}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Right: Search (4/5 width) */}
                        <div className="md:col-span-4 flex space-x-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    placeholder="제목, 내용, 작성자로 검색..."
                                    className="pl-10"
                                    onKeyPress={handleKeyPress}
                                />
                            </div>
                            <Button onClick={onSearch} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
                                <Search className="h-4 w-4 mr-2" />
                                검색
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Write Button */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-end">
                        <Button
                            onClick={onWriteClick}
                            className="w-[200px] bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />새 게시글 작성
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ListFilter;
