'use client';

import { Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface ListCategoryOption {
    id: string;
    name: string;
    count?: number;
}

interface ListFilterProps {
    categories: ListCategoryOption[];
    selectedCategory: string;
    onCategoryChange: (value: string) => void;
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    onSearch: () => void;
    variant?: 'desktop' | 'mobile';
}

export default function ListFilter({
    categories,
    selectedCategory,
    onCategoryChange,
    searchTerm,
    onSearchTermChange,
    onSearch,
    variant = 'desktop',
}: ListFilterProps) {
    const isDesktop = variant === 'desktop';

    if (isDesktop) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Category */}
                <div className="md:col-span-1 flex items-center space-x-2 text-black">
                    <Select value={selectedCategory} onValueChange={onCategoryChange}>
                        <SelectTrigger className="w-full ">
                            <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                    {typeof c.count === 'number' ? ` (${c.count})` : ''}
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
                            onChange={(e) => onSearchTermChange(e.target.value)}
                            placeholder="공지사항 검색..."
                            className="pl-10"
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        />
                    </div>
                    <Button onClick={onSearch} className="bg-green-600 hover:bg-green-700 text-white px-6">
                        <Search className="h-4 w-4 mr-2" /> 검색
                    </Button>
                </div>
            </div>
        );
    }

    // Mobile
    return (
        <div className="space-y-4">
            {/* Category */}
            <div className="flex items-center space-x-2 text-black">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                                {typeof c.count === 'number' ? ` (${c.count})` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Search */}
            <div className="flex space-x-2 text-black">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        placeholder="공지사항 검색..."
                        className="pl-10"
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    />
                </div>
                <Button onClick={onSearch} className="bg-green-600 hover:bg-green-700 text-white px-4">
                    <Search className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
