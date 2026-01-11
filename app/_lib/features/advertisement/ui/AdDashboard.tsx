'use client';

import React, { useState } from 'react';
import { Plus, Download, Calendar, ExternalLink, Trash2, Edit, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useAdminAds, useDeleteAd } from '../api/useAdvertisement';
import { AdType, Advertisement } from '@/app/_lib/shared/type/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { AdForm } from './AdForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

export function AdDashboard({ _unionId }: { _unionId: string }) {
  const [filterType, setFilterType] = useState<AdType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  const { data: ads, isLoading } = useAdminAds({
    type: filterType === 'ALL' ? undefined : filterType,
    status: filterStatus === 'ALL' ? undefined : filterStatus,
  });

  const deleteMutation = useDeleteAd();

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('광고가 삭제되었습니다.');
    } catch (_error) {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const openEditForm = (ad: Advertisement) => {
    setEditingAd(ad);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingAd(null);
    setIsFormOpen(false);
  };

  const getStatusBadge = (ad: Advertisement) => {
    const now = new Date().toISOString().split('T')[0];
    const isExpired = ad.contract_end_date < now;
    const isUpcoming = ad.contract_start_date > now;
    
    // 만료 7일 전 체크
    const endDate = new Date(ad.contract_end_date);
    const diffDays = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = !isExpired && diffDays <= 7;

    if (isExpired) return <Badge variant="secondary" className="bg-slate-700 text-slate-400">종료</Badge>;
    if (isUpcoming) return <Badge variant="outline" className="border-blue-500 text-blue-400">예정</Badge>;
    if (isExpiringSoon) return <Badge className="bg-amber-500 text-white animate-pulse">만료예정</Badge>;
    return <Badge className="bg-emerald-500 text-white">진행중</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          광고 관리
          <Badge variant="outline" className="text-slate-400 border-slate-700">
            {ads?.length || 0}
          </Badge>
        </h2>
        <Button onClick={() => setIsFormOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          광고 등록
        </Button>
      </div>

      {/* 필터 영역 */}
      <Card className="bg-slate-800/30 border-slate-700">
        <CardContent className="p-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">유형</span>
            <Select value={filterType} onValueChange={(v: AdType | 'ALL') => setFilterType(v)}>
              <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="MAIN">메인 배너</SelectItem>
                <SelectItem value="SUB">서브 슬라이드</SelectItem>
                <SelectItem value="BOARD">게시판</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">상태</span>
            <Select value={filterStatus} onValueChange={(v: 'ALL' | 'ACTIVE' | 'EXPIRED') => setFilterStatus(v)}>
              <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="ACTIVE">진행중</SelectItem>
                <SelectItem value="EXPIRED">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 리스트 영역 */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="h-40 bg-slate-800/50 rounded-xl animate-pulse" />
        ) : ads?.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">등록된 광고가 없습니다.</p>
          </div>
        ) : (
          ads?.map((ad) => (
            <div key={ad.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {ad.image_url ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                      <Image src={ad.image_url} alt={ad.business_name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{ad.business_name}</h3>
                      {getStatusBadge(ad)}
                      <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                        {ad.type === 'MAIN' ? '메인' : ad.type === 'SUB' ? '서브' : '게시판'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {ad.contract_start_date} ~ {ad.contract_end_date}
                      </span>
                      <span className="flex items-center gap-1">
                        ₩ {(ad.price ?? 0).toLocaleString()}
                      </span>
                      {ad.is_payment_completed ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 입금완료
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> 입금대기
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ad.link_url && (
                    <a href={ad.link_url} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  {ad.contract_file_url && (
                    <a href={ad.contract_file_url} download>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEditForm(ad)} className="text-slate-400 hover:text-white hover:bg-slate-700">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingAd ? '광고 수정' : '광고 등록'}
            </DialogTitle>
          </DialogHeader>
          <AdForm 
            ad={editingAd || undefined} 
            onSuccess={() => {
              closeForm();
            }} 
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
