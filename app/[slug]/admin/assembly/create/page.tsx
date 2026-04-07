'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useCreateAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { NewAssembly, ASSEMBLY_TYPE_LABELS, AssemblyType } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Form } from '@/components/ui/form';
import { ArrowLeft } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { DateTimePicker } from '@/app/_lib/widgets/common/date-picker/DateTimePicker';
import { FormInputField, FormSelectField, FormTextareaField } from '@/app/_lib/widgets/common/form';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';

/** 총회 유형 옵션 */
const assemblyTypeOptions = (Object.entries(ASSEMBLY_TYPE_LABELS) as [AssemblyType, string][]).map(
  ([value, label]) => ({ value, label })
);

/** 영상 송출 옵션 */
const streamTypeOptions = [
  { value: 'NONE', label: '미사용' },
  { value: 'YOUTUBE', label: 'YouTube' },
];

export default function CreateAssemblyPage() {
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const createMutation = useCreateAssembly();

  const form = useForm<NewAssembly>({
    defaultValues: {
      title: '',
      assembly_type: 'REGULAR',
      scheduled_at: '',
      venue_address: '',
      description: '',
      stream_type: 'NONE',
      legal_basis: '',
    },
  });

  const { handleSubmit, control, formState: { isSubmitting } } = form;

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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex items-baseline gap-3">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-36" style={{ animationDelay: '50ms' }} />
          </div>
        </div>
        {/* 폼 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          {/* 총회 제목 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" style={{ animationDelay: '100ms' }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '120ms' }} />
          </div>
          {/* 총회 유형 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" style={{ animationDelay: '160ms' }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '180ms' }} />
          </div>
          {/* 일시 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" style={{ animationDelay: '220ms' }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '240ms' }} />
          </div>
          {/* 장소 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-10" style={{ animationDelay: '280ms' }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '300ms' }} />
          </div>
          {/* 설명 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-10" style={{ animationDelay: '340ms' }} />
            <Skeleton className="h-20 w-full rounded-md" style={{ animationDelay: '360ms' }} />
          </div>
          {/* 영상 송출 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" style={{ animationDelay: '400ms' }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '420ms' }} />
          </div>
          {/* 법적 근거 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" style={{ animationDelay: '460ms' }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '480ms' }} />
          </div>
          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Skeleton className="h-9 w-16 rounded-md" style={{ animationDelay: '520ms' }} />
            <Skeleton className="h-9 w-24 rounded-md" style={{ animationDelay: '550ms' }} />
          </div>
        </div>
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
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-gray-900">총회 생성</h1>
          <p className="text-sm text-gray-400">새로운 총회를 생성합니다</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          {/* 총회 제목 */}
          <FormInputField
            control={control}
            name="title"
            label="총회 제목"
            placeholder="예: 제5차 정기총회"
            required
          />

          {/* 총회 유형 */}
          <FormSelectField
            control={control}
            name="assembly_type"
            label="총회 유형"
            options={assemblyTypeOptions}
          />

          {/* 일시 */}
          <FormField
            control={control}
            name="scheduled_at"
            rules={{ required: '총회 일시를 설정해주세요.' }}
            render={({ field }) => (
              <FormItem>
                <DateTimePicker
                  label="총회 일시 *"
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(date?.toISOString() ?? '')}
                  placeholder="총회 일시 선택"
                  hasError={!!form.formState.errors.scheduled_at}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 장소 */}
          <FormInputField
            control={control}
            name="venue_address"
            label="장소"
            placeholder="예: 서울시 강남구 OO빌딩 대회의실"
          />

          {/* 설명 */}
          <FormTextareaField
            control={control}
            name="description"
            label="설명"
            placeholder="총회에 대한 간단한 설명을 입력하세요"
            rows={3}
          />

          {/* 영상 송출 */}
          <FormSelectField
            control={control}
            name="stream_type"
            label="영상 송출"
            options={streamTypeOptions}
          />

          {/* 법적 근거 */}
          <FormInputField
            control={control}
            name="legal_basis"
            label="법적 근거"
            placeholder="예: 도시정비법 제45조"
          />

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
      </Form>
    </div>
  );
}
