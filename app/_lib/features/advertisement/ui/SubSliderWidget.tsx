'use client';

import React from 'react';
import { useRandomAds } from '../api/useAdvertisement';
import { Advertisement } from '@/app/_lib/shared/type/database.types';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

export function SubSliderWidget() {
  const { data: ads, isLoading } = useRandomAds('SUB', 10);

  if (isLoading) {
    return (
      <div className="w-full h-32 bg-slate-50 flex items-center justify-center gap-4 px-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-60 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!ads || ads.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200 py-8 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-600 tracking-tight">PARTNERSHIPS</h3>
        <p className="text-xs text-slate-400">함께하는 협력 업체입니다</p>
      </div>
      
      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-scroll hover:[animation-play-state:paused] gap-6 whitespace-nowrap">
          {[...ads, ...ads].map((ad, i) => (
            <AdCard key={`${ad.id}-${i}`} ad={ad} />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 12px)); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

function AdCard({ ad }: { ad: Advertisement }) {
  const Content = (
    <div className="inline-block w-[300px] h-[100px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-emerald-500 transition-colors cursor-pointer">
      <div className="flex h-full">
        <div className="relative w-1/3 bg-slate-100 border-r border-slate-100">
          {ad.image_url ? (
            <Image src={ad.image_url} alt={ad.business_name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 text-center px-2">
              IMAGE
            </div>
          )}
        </div>
        <div className="w-2/3 p-4 flex flex-col justify-center">
          <p className="text-sm font-bold text-slate-800 mb-1 truncate">{ad.business_name}</p>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            협력 업체 상세 혜택 및 정보는 클릭하여 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );

  if (ad.link_url) {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
        {Content}
      </a>
    );
  }

  return Content;
}
