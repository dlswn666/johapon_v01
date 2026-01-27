'use client';

import React, { useMemo } from 'react';
import { useRandomAds } from '../api/useAdvertisement';
import { Advertisement } from '@/app/_lib/shared/type/database.types';
import Image from 'next/image';
import { useMediaQuery } from '@/app/_lib/shared/hooks/useMediaQuery';

const DEFAULT_MAIN_ADS: Advertisement[] = [
  { id: 'def-main-1', business_name: '협력사 모집 공고', type: 'MAIN', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&h=1200&auto=format&fit=crop', image_url_mobile: null, link_url: null, created_at: '', title: '우리 조합과 함께할 신규 파트너 상시 모집 중', content: '공고: 협력 업체 모집', contract_file_url: null },
  { id: 'def-main-2', business_name: '조합원 혜택 파트너', type: 'MAIN', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=600&h=1200&auto=format&fit=crop', image_url_mobile: null, link_url: null, created_at: '', title: '전문 분야별 파트너사 모집 안내', content: '공고: 협력 업체 모집', contract_file_url: null },
  { id: 'def-main-3', business_name: 'Professional Partners', type: 'MAIN', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&h=1200&auto=format&fit=crop', image_url_mobile: null, link_url: null, created_at: '', title: '성공적인 비즈니스를 위한 최고의 선택', content: '공고: 협력 업체 모집', contract_file_url: null },
  { id: 'def-main-4', business_name: 'Announcement', type: 'MAIN', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=600&h=1200&auto=format&fit=crop', image_url_mobile: null, link_url: null, created_at: '', title: '신규 입점 및 제휴 문의 환영', content: '공고: 협력 업체 모집', contract_file_url: null },
];

export function SideAdWidget() {
  const { data: ads, isLoading } = useRandomAds('MAIN', 1);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // useMemo를 사용하여 ads 변경 시 activeAd 계산
  const activeAd = useMemo<Advertisement>(() => {
    if (ads && ads.length > 0) {
      return ads[0];
    }
    // 기본값 사용 (서버/클라이언트 동일하게 첫 번째 사용)
    return DEFAULT_MAIN_ADS[0];
  }, [ads]);

  // 모바일이면 모바일 이미지 우선 사용, 없으면 웹 이미지로 폴백
  const imageUrl = isMobile && activeAd.image_url_mobile ? activeAd.image_url_mobile : activeAd.image_url;

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[300px] bg-slate-200/50 rounded-xl animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative w-full h-full min-h-[400px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={`${activeAd.business_name} 광고`}
              fill
              sizes="(max-width: 1024px) 100vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {/* Text Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Partnership</span>
              <h4 className="text-white font-bold text-sm leading-tight mb-1">{activeAd.title}</h4>
              <p className="text-white/70 text-[10px] font-medium">{activeAd.business_name}</p>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-4">
            {activeAd.business_name}
          </div>
        )}
        {activeAd.link_url && (
            <a href={activeAd.link_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />
        )}
      </div>
      <p className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-widest">Advertisement</p>
    </div>
  );
}
