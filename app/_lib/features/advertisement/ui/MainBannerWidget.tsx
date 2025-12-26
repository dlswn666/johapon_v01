'use client';

import React from 'react';
import { useAdsByType } from '../api/useAdvertisement';
import { Advertisement } from '@/app/_lib/shared/type/database.types';
import Image from 'next/image';

export function MainBannerWidget() {
  const { data: ads, isLoading } = useAdsByType('MAIN');

  if (isLoading || !ads || ads.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 hidden xl:block">
      <div className="relative w-full h-full max-w-[1600px] mx-auto">
        {/* Left Banner */}
        {ads[0] && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto">
            <AdItem
            ad={ads[0]}
            _side="left"
            _onClose={() => {}}
          />
          </div>
        )}

        {/* Right Banner */}
        {ads[1] && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
            <AdItem
            ad={ads[1]}
            _side="right"
            _onClose={() => {}}
          />
          </div>
        )}
      </div>
    </div>
  );
}

function AdItem({ ad, _side, _onClose }: { ad: Advertisement; _side: 'left' | 'right'; _onClose: () => void }) {
  const Content = (
    <div className="group relative w-[120px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="relative aspect-[1/5] w-full">
        {ad.image_url ? (
          <Image 
            src={ad.image_url} 
            alt={ad.business_name} 
            fill 
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs text-center p-2">
            {ad.business_name}
          </div>
        )}
      </div>
      <div className="p-2 bg-white border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-800 truncate">{ad.business_name}</p>
        <p className="text-[9px] text-slate-400">ADVERTISEMENT</p>
      </div>
      
      {/* Overlay Close Button (Optional, but often requested for UX) */}
      {/* 
      <button 
        onClick={(e) => { e.preventDefault(); onClose(); }}
        className="absolute top-1 right-1 p-1 bg-black/20 hover:bg-black/40 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button> 
      */}
    </div>
  );

  if (ad.link_url) {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block">
        {Content}
      </a>
    );
  }

  return Content;
}
