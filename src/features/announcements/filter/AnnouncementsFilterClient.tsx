'use client';

import { useState } from 'react';
import ListFilter, { type ListCategoryOption } from '@/components/common/ListFilter';

interface AnnouncementsFilterClientProps {
    categories: ListCategoryOption[];
    onFilterChange?: (filter: { categoryKey?: string; searchTerm?: string; subcategoryId?: string }) => void;
}

export default function AnnouncementsFilterClient({ categories, onFilterChange }: AnnouncementsFilterClientProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        onFilterChange?.({
            categoryKey: category === 'all' ? undefined : category,
            searchTerm: searchTerm || undefined,
        });
    };

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
    };

    const handleSearch = () => {
        onFilterChange?.({
            categoryKey: selectedCategory === 'all' ? undefined : selectedCategory,
            searchTerm: searchTerm || undefined,
        });
    };

    return (
        <ListFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            searchTerm={searchTerm}
            onSearchTermChange={handleSearchTermChange}
            onSearch={handleSearch}
            variant="desktop"
        />
    );
}
