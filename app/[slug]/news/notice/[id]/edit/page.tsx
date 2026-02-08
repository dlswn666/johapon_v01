'use client';

import React, { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useNotice, useUpdateNotice } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { ActionButton } from '@/app/_lib/widgets/common/button';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import useNoticeStore from '@/app/_lib/features/notice/model/useNoticeStore';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';
import { StartEndPicker } from '@/app/_lib/widgets/common/date-picker';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
    is_popup: z.boolean(),
    send_alimtalk: z.boolean().default(false),
    start_date: z.date().nullable().optional(),
    end_date: z.date().nullable().optional(),
}).refine(
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

const EditNoticePage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const noticeId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();

    const { data: notice, isLoading } = useNotice(noticeId);
    const { mutate: updateNotice, isPending } = useUpdateNotice();

    // Store cleanup actions
    const addEditorImage = useNoticeStore((state) => state.addEditorImage);
    const clearEditorImages = useNoticeStore((state) => state.clearEditorImages);
    const clearTempFiles = useFileStore((state) => state.clearTempFiles);

    // Mount/Unmount cleanup
    useEffect(() => {
        // 진입 시 초기화 (이전 작업 잔여물 제거)
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
            start_date: null,
            end_date: null,
        },
    });

    // 팝업 체크 상태 감지
    const isPopup = useWatch({ control: form.control, name: 'is_popup' });
    const startDate = useWatch({ control: form.control, name: 'start_date' });
    const endDate = useWatch({ control: form.control, name: 'end_date' });

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

    useEffect(() => {
        if (notice) {
            form.reset({
                title: notice.title,
                content: notice.content,
                is_popup: notice.is_popup,
                send_alimtalk: false, // 수정 시 기본값은 false
                start_date: notice.start_date ? new Date(notice.start_date) : null,
                end_date: notice.end_date ? new Date(notice.end_date) : null,
            });
        }
    }, [notice, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        updateNotice({
            id: noticeId,
            updates: {
                title: values.title,
                content: values.content,
                is_popup: values.is_popup,
                send_alimtalk: values.send_alimtalk,
                start_date: values.start_date ? values.start_date.toISOString() : null,
                end_date: values.end_date ? values.end_date.toISOString() : null,
            },
            updatedAt: notice?.updated_at ?? undefined,
        });
    }

    if (isUnionLoading || isLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (!notice) {
        return (
            <div className={cn('container mx-auto p-6')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-red-600">공지사항을 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-[32px] font-bold text-[#5FA37C] mb-8">공지사항 수정</h2>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-[#5FA37C]">제목</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="제목을 입력해주세요"
                                                {...field}
                                                className="h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-4">
                                <FormField
                                    control={form.control}
                                    name="is_popup"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[12px] border border-[#CCCCCC] bg-[#F5F5F5] p-6 flex-1 cursor-pointer">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-[#4E8C6D] border-[#AFAFAF] cursor-pointer"
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-[16px] text-gray-700 font-medium cursor-pointer">
                                                    팝업으로 표시
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="send_alimtalk"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[12px] border border-[#CCCCCC] bg-[#F5F5F5] p-6 flex-1 cursor-pointer">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-[#4E8C6D] border-[#AFAFAF] cursor-pointer"
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-[16px] text-gray-700 font-medium cursor-pointer">
                                                    알림톡 발송
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
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
                                        <div className={cn(
                                            'rounded-[12px] border bg-white p-6',
                                            form.formState.errors.start_date ? 'border-[#D9534F]' : 'border-[#CCCCCC]'
                                        )}>
                                            <h4 className="text-[14px] font-bold text-[#5FA37C] mb-4">팝업 표시 기간</h4>
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
                                    <FileUploader unionSlug={slug} targetType="NOTICE" targetId={String(noticeId)} />
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
                                <ActionButton
                                    buttonType="cancel"
                                    onClick={() => router.back()}
                                >
                                    취소
                                </ActionButton>
                                <ActionButton
                                    type="submit"
                                    buttonType="submit"
                                    isLoading={isPending}
                                >
                                    수정
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

export default EditNoticePage;
