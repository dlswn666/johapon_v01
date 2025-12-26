'use client';

import React from 'react';
import { useRandomAds } from '../api/useAdvertisement';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function BoardAdWidget() {
  const { data: ads, isLoading } = useRandomAds('BOARD', 3);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!ads || ads.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {ads.map((ad) => (
        <Card key={ad.id} className="group relative bg-[#F8FAFC] border-none shadow-none rounded-[24px] overflow-hidden hover:bg-emerald-50 transition-colors duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">AD</span>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                {ad.title || ad.business_name}
              </h4>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                {ad.content || `${ad.business_name}에서 제공하는 특별 혜택을 확인하세요.`}
              </p>
              <div className="mt-auto flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                자세히 보기 <ArrowRight className="w-3 h-3" strokeWidth={3} />
              </div>
            </div>
          </CardContent>
          {ad.link_url && (
            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />
          )}
        </Card>
      ))}
    </div>
  );
}
