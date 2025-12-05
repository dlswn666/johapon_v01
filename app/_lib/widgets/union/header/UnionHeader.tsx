'use client';

import React from 'react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

export default function UnionHeader() {
    const { union } = useSlug();

    if (!union) return null;

    return (
        <div className="flex items-center gap-4">
            <span className="font-bold text-[22px] text-[#5FA37C]">{union.name}</span>
            <span className="text-[14px] px-3 py-1 bg-[#E6E6E6] rounded-full text-[#AFAFAF]">{union.slug}</span>
        </div>
    );
}

