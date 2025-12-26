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

  const DEFAULT_SUB_ADS: Advertisement[] = [
    { id: 'def-sub-1', business_name: '협력사 모집 중', type: 'SUB', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=200&h=200&auto=format&fit=crop', link_url: null, created_at: '', title: '우리 조합과 함께할 파트너를 찾습니다', content: '공고: 협력 업체 모집 공고', contract_file_url: null },
    { id: 'def-sub-2', business_name: '공고 모집 중', type: 'SUB', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=200&h=200&auto=format&fit=crop', link_url: null, created_at: '', title: '신규 파트너십 상시 모집', content: '공고: 협력 업체 모집 공고', contract_file_url: null },
    { id: 'def-sub-3', business_name: 'Partner Recruitment', type: 'SUB', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=200&h=200&auto=format&fit=crop', link_url: null, created_at: '', title: '함께 성장할 업체를 제안해주세요', content: '공고: 협력 업체 모집 공고', contract_file_url: null },
    { id: 'def-sub-4', business_name: '조합 파트너 모집', type: 'SUB', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=200&h=200&auto=format&fit=crop', link_url: null, created_at: '', title: '다양한 혜택을 제공하는 파트너십', content: '공고: 협력 업체 모집 공고', contract_file_url: null },
    { id: 'def-sub-6', business_name: 'Business Support', type: 'SUB', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=200&h=200&auto=format&fit=crop', link_url: null, created_at: '', title: '조합과 함께하는 성공 비즈니스', content: '공고: 협력 업체 모집 공고', contract_file_url: null },
  ];

  const activeAds = ads && ads.length > 0 ? ads : DEFAULT_SUB_ADS;

  if (!activeAds || activeAds.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200 py-8 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-600 tracking-tight">PARTNERSHIPS</h3>
        <p className="text-xs text-slate-400">함께하는 협력 업체입니다</p>
      </div>
      
      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-scroll hover:[animation-play-state:paused] gap-6 whitespace-nowrap">
          {[...activeAds, ...activeAds].map((ad, i) => (
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
