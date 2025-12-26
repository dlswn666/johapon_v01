'use client';

import React from 'react';
import { useRandomAds } from '../api/useAdvertisement';
import Image from 'next/image';

export function SideAdWidget() {
  const { data: ads, isLoading } = useRandomAds('MAIN', 1);

  if (isLoading || !ads || ads.length === 0) {
    return (
      <div className="w-full aspect-[1/5] bg-slate-200/50 rounded-xl animate-pulse" />
    );
  }

  const ad = ads[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[1/5] w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
        {ad.image_url ? (
          <Image 
            src={ad.image_url} 
            alt={ad.business_name} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-4">
            {ad.business_name}
          </div>
        )}
        {ad.link_url && (
            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />
        )}
      </div>
      <p className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-widest">Advertisement</p>
    </div>
  );
}
