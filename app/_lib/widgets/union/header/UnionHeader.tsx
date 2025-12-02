'use client';

import React from 'react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

export default function UnionHeader() {
    const { union } = useSlug();

    if (!union) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{union.name}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">{union.slug}</span>
        </div>
    );
}

