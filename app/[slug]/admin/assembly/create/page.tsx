'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useCreateAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { NewAssembly, ASSEMBLY_TYPE_LABELS, AssemblyType } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { DateTimePicker } from '@/app/_lib/widgets/common/date-picker/DateTimePicker';

export default function CreateAssemblyPage() {
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const createMutation = useCreateAssembly();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<NewAssembly>({
    defaultValues: {
      assembly_type: 'REGULAR',
    },
  });

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  const onSubmit = (data: NewAssembly) => {
    createMutation.mutate(data);
  };

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="w-full h-[600px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, '/admin/assembly'))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">총회 생성</h1>
          <p className="text-sm text-gray-500">새로운 총회를 생성합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {/* 총회 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            총회 제목 <span className="text-red-500">*</span>
          </label>
          <Input
            {...register('title', { required: '총회 제목을 입력해주세요.' })}
            placeholder="예: 제5차 정기총회"
          />
          {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
        </div>

        {/* 총회 유형 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">총회 유형</label>
          <select
            {...register('assembly_type')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.entries(ASSEMBLY_TYPE_LABELS) as [AssemblyType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* 일시 */}
        <div>
          <Controller
            name="scheduled_at"
            control={control}
            rules={{ required: '총회 일시를 설정해주세요.' }}
            render={({ field }) => (
              <DateTimePicker
                label="총회 일시 *"
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) => field.onChange(date?.toISOString() ?? '')}
                placeholder="총회 일시 선택"
                hasError={!!errors.scheduled_at}
              />
            )}
          />
          {errors.scheduled_at && <p className="text-sm text-red-500 mt-1">{errors.scheduled_at.message}</p>}
        </div>

        {/* 장소 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">장소 (선택)</label>
          <Input
            {...register('venue_address')}
            placeholder="예: 서울시 강남구 OO빌딩 대회의실"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">설명 (선택)</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="총회에 대한 간단한 설명을 입력하세요"
          />
        </div>

        {/* 스트림 설정 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">영상 송출</label>
          <select
            {...register('stream_type')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">미사용</option>
            <option value="ZOOM">Zoom</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="BOTH">Zoom + YouTube</option>
          </select>
        </div>

        {/* 법적 근거 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">법적 근거 (선택)</label>
          <Input
            {...register('legal_basis')}
            placeholder="예: 도시정비법 제45조"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(getUnionPath(slug, '/admin/assembly'))}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
          >
            {createMutation.isPending ? '생성 중...' : '총회 생성'}
          </Button>
        </div>
      </form>
    </div>
  );
}
