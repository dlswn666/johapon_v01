'use client';

import React from 'react';
import { useRandomAds } from '../api/useAdvertisement';
import { Card, CardContent } from '@/components/ui/card';
import { Advertisement } from '@/app/_lib/shared/type/database.types';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Megaphone } from 'lucide-react';

export function BoardAdWidget() {
  const { data: ads, isLoading } = useRandomAds('BOARD', 3);

  const DEFAULT_BOARD_ADS: Advertisement[] = [
    { id: 'def-brd-1', business_name: '조합 협력사 모집', type: 'BOARD', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: null, link_url: null, created_at: '', title: '[모집] 조합과 함께할 신규 협력사를 찾습니다', content: '공고: 조합원 전용 혜택을 제공할 수 있는 우수한 업체를 모집합니다.', contract_file_url: null },
    { id: 'def-brd-2', business_name: '파트너십 안내', type: 'BOARD', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: null, link_url: null, created_at: '', title: '[안내] 협력 업체 입점 문의 및 절차', content: '조합 홈페이지 내 광고 및 협력 업체 등록 안내입니다.', contract_file_url: null },
    { id: 'def-brd-3', business_name: '서비스 공고', type: 'BOARD', union_id: '', contract_start_date: '', contract_end_date: '', is_payment_completed: true, price: 0, image_url: null, link_url: null, created_at: '', title: '[공고] 분야별 전문 업체 상시 모집', content: '법률, 세무, 인테리어 등 다양한 분야의 파트너를 기다립니다.', contract_file_url: null },
  ];

  const activeAds = ads && ads.length > 0 ? ads : DEFAULT_BOARD_ADS;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (activeAds.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {activeAds.map((ad) => (
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
