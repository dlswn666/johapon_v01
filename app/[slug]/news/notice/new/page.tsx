'use client';

import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAddNotice } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import useNoticeStore from '@/app/_lib/features/notice/model/useNoticeStore';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { StartEndPicker } from '@/app/_lib/widgets/common/date-picker';
import { FormInputField } from '@/app/_lib/widgets/common/form';
import { FormCheckboxField } from '@/app/_lib/widgets/common/form';
import { ActionButton } from '@/app/_lib/widgets/common/button';

const formSchema = z
    .object({
        title: z.string().min(1, '제목을 입력해주세요.'),
        content: z.string().min(1, '내용을 입력해주세요.'),
        is_popup: z.boolean(),
        send_alimtalk: z.boolean().default(false),
        alimtalk_schedule_type: z.enum(['immediate', 'scheduled']).default('immediate'),
        scheduled_at: z.date().nullable().optional(),
        start_date: z.date().nullable().optional(),
        end_date: z.date().nullable().optional(),
    })
    .refine(
        (data) => {
            // 팝업 설정 시 시작일과 종료일 모두 필수
            if (data.is_popup) {
                return data.start_date !== null && data.end_date !== null;
            }
            return true;
        },
        {
            message: '팝업 표시를 위해 시작일과 종료일을 모두 입력해주세요.',
            path: ['start_date'], // 에러를 start_date 필드에 표시
        }
    );

const NewNoticePage = () => {
    const router = useRouter();
    const { slug, union } = useSlug();
    const { user } = useAuth();
    const { mutate: addNotice, isPending } = useAddNotice();

    // Store cleanup actions
    const addEditorImage = useNoticeStore((state) => state.addEditorImage);
    const clearEditorImages = useNoticeStore((state) => state.clearEditorImages);
    const clearTempFiles = useFileStore((state) => state.clearTempFiles);

    // Mount/Unmount cleanup
    useEffect(() => {
        // 진입 시 초기화 (혹시 남아있을 수 있는 이전 상태 제거)
        clearEditorImages();
        clearTempFiles();

        return () => {
            // 이탈 시 초기화
            clearEditorImages();
            clearTempFiles();
        };
    }, [clearEditorImages, clearTempFiles]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            content: '',
            is_popup: false,
            send_alimtalk: false,
            alimtalk_schedule_type: 'immediate' as const,
            scheduled_at: null,
            start_date: null,
            end_date: null,
        },
    });

    // 팝업 체크 상태 감지
    const isPopup = useWatch({ control: form.control, name: 'is_popup' });
    const startDate = useWatch({ control: form.control, name: 'start_date' });
    const endDate = useWatch({ control: form.control, name: 'end_date' });

    // 알림톡 예약 상태 감지
    const sendAlimtalk = useWatch({ control: form.control, name: 'send_alimtalk' });
    const alimtalkScheduleType = useWatch({ control: form.control, name: 'alimtalk_schedule_type' });
    const scheduledAt = useWatch({ control: form.control, name: 'scheduled_at' });

    // 팝업 기간 선택 영역 ref (에러 시 스크롤용)
    const popupDateRef = useRef<HTMLDivElement>(null);

    // start_date 에러 발생 시 해당 영역으로 스크롤
    useEffect(() => {
        if (form.formState.errors.start_date && popupDateRef.current) {
            popupDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 첫 번째 버튼에 포커스
            const firstButton = popupDateRef.current.querySelector('button');
            if (firstButton) {
                setTimeout(() => firstButton.focus(), 300);
            }
        }
    }, [form.formState.errors.start_date]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!union || !user) return;

        // 예약 발송 시 scheduled_at 필수 체크
        if (values.send_alimtalk && values.alimtalk_schedule_type === 'scheduled' && !values.scheduled_at) {
            form.setError('scheduled_at', { message: '예약 발송 시간을 선택해주세요.' });
            return;
        }

        addNotice({
            title: values.title,
            content: values.content,
            is_popup: values.is_popup,
            send_alimtalk: values.send_alimtalk,
            alimtalk_schedule_type: values.alimtalk_schedule_type,
            scheduled_at: values.scheduled_at ? values.scheduled_at.toISOString() : null,
            start_date: values.start_date ? values.start_date.toISOString() : null,
            end_date: values.end_date ? values.end_date.toISOString() : null,
            author_id: user.id,
            views: 0,
        });
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-[32px] font-bold text-[#5FA37C] mb-8">공지사항 작성</h2>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormInputField
                                control={form.control}
                                name="title"
                                label="제목"
                                placeholder="제목을 입력해주세요"
                            />

                            <div className="flex gap-4">
                                <FormCheckboxField
                                    control={form.control}
                                    name="is_popup"
                                    label="팝업으로 표시"
                                    variant="card"
                                />

                                <FormCheckboxField
                                    control={form.control}
                                    name="send_alimtalk"
                                    label="알림톡 발송"
                                    variant="card"
                                />
                            </div>

                            {/* 알림톡 예약 설정 영역 */}
                            <div
                                className={cn(
                                    'overflow-hidden transition-all duration-300 ease-out',
                                    sendAlimtalk ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
                                )}
                            >
                                <div className="rounded-[12px] border border-[#CCCCCC] bg-white p-6">
                                    <h4 className="text-[14px] font-bold text-[#5FA37C] mb-4">
                                        알림톡 발송 설정
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={alimtalkScheduleType === 'immediate'}
                                                    onChange={() => form.setValue('alimtalk_schedule_type', 'immediate')}
                                                    className="w-4 h-4 text-[#5FA37C]"
                                                />
                                                <span className="text-sm text-gray-700">바로 발송</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={alimtalkScheduleType === 'scheduled'}
                                                    onChange={() => form.setValue('alimtalk_schedule_type', 'scheduled')}
                                                    className="w-4 h-4 text-[#5FA37C]"
                                                />
                                                <span className="text-sm text-gray-700">예약 발송</span>
                                            </label>
                                        </div>

                                        {/* 예약 시간 선택 */}
                                        <div
                                            className={cn(
                                                'overflow-hidden transition-all duration-300 ease-out',
                                                alimtalkScheduleType === 'scheduled' ? 'max-h-[100px] opacity-100' : 'max-h-0 opacity-0'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-600">예약 일시:</span>
                                                <input
                                                    type="datetime-local"
                                                    value={scheduledAt ? new Date(scheduledAt.getTime() - scheduledAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value) {
                                                            form.setValue('scheduled_at', new Date(value));
                                                            form.clearErrors('scheduled_at');
                                                        } else {
                                                            form.setValue('scheduled_at', null);
                                                        }
                                                    }}
                                                    min={new Date().toISOString().slice(0, 16)}
                                                    className={cn(
                                                        'px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#5FA37C] outline-none',
                                                        form.formState.errors.scheduled_at ? 'border-red-500' : 'border-gray-300'
                                                    )}
                                                />
                                            </div>
                                            {form.formState.errors.scheduled_at && (
                                                <p className="text-sm text-red-500 mt-1">
                                                    {form.formState.errors.scheduled_at.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 팝업 기간 선택 - 애니메이션 적용 */}
                            <FormField
                                control={form.control}
                                name="start_date"
                                render={() => (
                                    <div
                                        ref={popupDateRef}
                                        className={cn(
                                            'overflow-hidden transition-all duration-300 ease-out',
                                            isPopup ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'rounded-[12px] border bg-white p-6',
                                                form.formState.errors.start_date
                                                    ? 'border-[#D9534F]'
                                                    : 'border-[#CCCCCC]'
                                            )}
                                        >
                                            <h4 className="text-[14px] font-bold text-[#5FA37C] mb-4">
                                                팝업 표시 기간
                                            </h4>
                                            <StartEndPicker
                                                startDate={startDate ?? undefined}
                                                endDate={endDate ?? undefined}
                                                onStartDateChange={(date) => form.setValue('start_date', date ?? null)}
                                                onEndDateChange={(date) => form.setValue('end_date', date ?? null)}
                                            />
                                            <FormMessage className="mt-2" />
                                        </div>
                                    </div>
                                )}
                            />

                            {/* 파일 업로드 위젯 추가 */}
                            <FormItem>
                                <FormLabel className="text-[16px] font-bold text-[#5FA37C]">첨부파일</FormLabel>
                                <FormControl>
                                    <FileUploader
                                        unionSlug={slug}
                                        targetType="NOTICE"
                                        // targetId가 없으면 '작성 중' 모드 (임시 파일 관리)
                                    />
                                </FormControl>
                            </FormItem>

                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">내용</FormLabel>
                                        <FormControl>
                                            <TextEditor
                                                content={field.value}
                                                onChange={field.onChange}
                                                placeholder="내용을 입력해주세요"
                                                onAddImage={addEditorImage}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                                <ActionButton buttonType="cancel" onClick={() => router.push(`/${slug}/news/notice`)}>
                                    취소
                                </ActionButton>
                                <ActionButton buttonType="submit" type="submit" isLoading={isPending}>
                                    등록
                                </ActionButton>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>

            <AlertModal />
        </>
    );
};

export default NewNoticePage;
