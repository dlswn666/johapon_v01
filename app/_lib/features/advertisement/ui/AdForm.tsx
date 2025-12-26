'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdType, Advertisement, NewAdvertisement, UpdateAdvertisement } from '@/app/_lib/shared/type/database.types';
import { useAddAd, useUpdateAd } from '../api/useAdvertisement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ActionButton } from '@/app/_lib/widgets/common/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Info } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/app/_lib/shared/supabase/client';
import toast from 'react-hot-toast';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

interface AdFormProps {
  ad?: Advertisement;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdForm({ ad, onSuccess, onCancel }: AdFormProps) {
  const { slug } = useSlug();
  const [adType, setAdType] = useState<AdType>(ad?.type || 'MAIN');
  const [imagePreview, setImagePreview] = useState<string | null>(ad?.image_url || null);
  const [contractPreview, setContractPreview] = useState<string | null>(ad?.contract_file_url || null);
  const [isUploading, setIsUploading] = useState(false);

  const addMutation = useAddAd();
  const updateMutation = useUpdateAd();

  const { register, handleSubmit, setValue, watch } = useForm<NewAdvertisement>({
    defaultValues: ad || {
      type: 'MAIN',
      business_name: '',
      contract_start_date: new Date().toISOString().split('T')[0],
      contract_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 0,
      is_payment_completed: false,
      image_url: '',
      link_url: '',
      title: '',
      content: '',
    }
  });

  const onSubmit = async (data: NewAdvertisement) => {
    try {
      if (ad) {
        await updateMutation.mutateAsync({ 
          id: ad.id, 
          updates: { ...data, type: adType } as UpdateAdvertisement 
        });
        toast.success('수정되었습니다.');
      } else {
        await addMutation.mutateAsync({ ...data, type: adType } as NewAdvertisement);
        toast.success('등록되었습니다.');
      }
      onSuccess();
    } catch (_error) {
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'contract_file_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const path = `ads/${slug}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('files').upload(path, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path);
      setValue(field, publicUrl);
      if (field === 'image_url') setImagePreview(publicUrl);
      else setContractPreview(publicUrl);
      
      toast.success('업로드 완료');
    } catch (_error) {
      toast.error('업로드 실패');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">광고 유형</Label>
          <Select 
            value={adType} 
            onValueChange={(v: AdType) => {
              setAdType(v);
              setValue('type', v);
            }}
          >
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MAIN">메인 배너</SelectItem>
              <SelectItem value="SUB">서브 슬라이드</SelectItem>
              <SelectItem value="BOARD">게시판</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">업체명</Label>
          <Input 
            {...register('business_name', { required: true })}
            className="bg-slate-700/50 border-slate-600 text-white" 
            placeholder="업체명을 입력하세요"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">계약 시작일</Label>
          <Input 
            type="date"
            {...register('contract_start_date', { required: true })}
            className="bg-slate-700/50 border-slate-600 text-white" 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">계약 종료일</Label>
          <Input 
            type="date"
            {...register('contract_end_date', { required: true })}
            className="bg-slate-700/50 border-slate-600 text-white" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">단가 (₩)</Label>
          <Input 
            type="number"
            {...register('price', { valueAsNumber: true })}
            className="bg-slate-700/50 border-slate-600 text-white" 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">입금 완료 여부</Label>
          <div className="flex items-center gap-2 pt-2">
            <Switch 
              checked={watch('is_payment_completed')}
              onCheckedChange={(checked) => setValue('is_payment_completed', checked)}
            />
            <span className="text-sm text-slate-400">
              {watch('is_payment_completed') ? '입금 완료' : '입금 대기'}
            </span>
          </div>
        </div>
      </div>

      {/* 유형별 동적 필드 */}
      {adType !== 'BOARD' ? (
        <>
          <div className="space-y-2">
            <Label className="text-slate-300">광고 이미지</Label>
            <div className="flex items-start gap-4">
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-600">
                  <Image src={imagePreview} alt="미리보기" fill className="object-cover" />
                  <button 
                    type="button" 
                    onClick={() => { setImagePreview(null); setValue('image_url', ''); }}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-800/50 text-slate-500">
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="text-xs">이미지 업로드</span>
                  <input 
                    type="file" 
                    className="absolute w-32 h-32 opacity-0 cursor-pointer" 
                    onChange={(e) => handleFileUpload(e, 'image_url')}
                    accept="image/*"
                  />
                </div>
              )}
              <div className="flex-1 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex gap-2 text-blue-400 mb-1">
                  <Info className="w-4 h-4" />
                  <span className="text-xs font-semibold">이미지 규격 가이드</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {adType === 'MAIN' 
                    ? '메인 배너: 세로형(120x600px) 권장. 좌우 고정 배치됩니다.'
                    : '서브 슬라이드: 가로형(1200x200px) 권장. 하단 슬라이더로 노출됩니다.'}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">이동 링크 URL (선택)</Label>
            <Input 
              {...register('link_url')}
              className="bg-slate-700/50 border-slate-600 text-white" 
              placeholder="https://example.com"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label className="text-slate-300">게시글 제목</Label>
            <Input 
              {...register('title', { required: adType === 'BOARD' })}
              className="bg-slate-700/50 border-slate-600 text-white" 
              placeholder="게시판에 노출될 제목"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">게시글 본문 (Rich Text)</Label>
            <Textarea 
              {...register('content')}
              className="bg-slate-700/50 border-slate-600 text-white min-h-[200px]" 
              placeholder="협력 업체 소개 내용을 입력하세요"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label className="text-slate-300">계약서 파일 (선택)</Label>
        <div className="flex items-center gap-4">
          <Input 
            type="file" 
            onChange={(e) => handleFileUpload(e, 'contract_file_url')}
            className="bg-slate-700/50 border-slate-600 text-white"
          />
          {contractPreview && (
            <Badge variant="outline" className="text-emerald-400 border-emerald-400">업로드됨</Badge>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
        >
          취소
        </Button>
        <ActionButton 
          type="submit" 
          isLoading={isUploading || addMutation.isPending || updateMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {ad ? '수정하기' : '등록하기'}
        </ActionButton>
      </div>
    </form>
  );
}
