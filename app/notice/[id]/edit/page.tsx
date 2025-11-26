'use client';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useNotice, useUpdateNotice } from '@/app/_lib/shared/hooks/notice/useNoticeHook';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';

// Zod 스키마 정의
const noticeFormSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.').max(200, '제목은 최대 200자까지 입력 가능합니다.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
    isPopup: z.boolean(),
    sendAlimtalk: z.boolean(),
    endDate: z.date().optional(),
});

type NoticeFormValues = z.infer<typeof noticeFormSchema>;

const NoticeEdit = () => {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const { data: notice, isLoading } = useNotice(id);
    const updateMutation = useUpdateNotice();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // React Hook Form 초기화
    const form = useForm<NoticeFormValues>({
        resolver: zodResolver(noticeFormSchema),
        defaultValues: {
            title: '',
            content: '',
            isPopup: false,
            sendAlimtalk: false,
            endDate: undefined,
        },
    });

    // 데이터 로드 시 폼 초기화
    useEffect(() => {
        if (notice) {
            form.reset({
                title: notice.title,
                content: notice.content,
                isPopup: notice.is_popup,
                sendAlimtalk: false,
                endDate: notice.end_date ? new Date(notice.end_date) : undefined,
            });
        }
    }, [notice, form]);

    // 폼 제출 핸들러
    const onSubmit = async (data: NoticeFormValues) => {
        openConfirmModal({
            title: '공지사항 수정',
            message: '공지사항을 수정하시겠습니까?',
            onConfirm: () => {
                updateMutation.mutate({
                    id,
                    updates: {
                        title: data.title,
                        content: data.content,
                        is_popup: data.isPopup,
                        end_date: data.endDate ? data.endDate.toISOString() : null,
                    },
                });
            },
        });
    };

    if (isLoading) {
        return (
            <div className={cn('container mx-auto p-6 max-w-4xl')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-muted-foreground">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!notice) {
        return (
            <div className={cn('container mx-auto p-6 max-w-4xl')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-red-600">공지사항을 불러오는 중 오류가 발생했습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto p-6 max-w-4xl')}>
                <div className={cn('flex justify-between items-center mb-6')}>
                    <h1 className={cn('text-3xl font-bold')}>공지사항 수정</h1>
                </div>

                <Separator className="mb-6" />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* 제목 */}
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-semibold">제목</FormLabel>
                                    <FormControl>
                                        <Input placeholder="공지사항 제목을 입력하세요" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 팝업 여부와 알림톡 발송을 가로로 배치 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 팝업 여부 */}
                            <FormField
                                control={form.control}
                                name="isPopup"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base font-semibold">팝업 여부</FormLabel>
                                            <FormDescription>메인 화면에 팝업으로 표시합니다</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* 알림톡 발송 */}
                            <FormField
                                control={form.control}
                                name="sendAlimtalk"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base font-semibold">알림톡 발송</FormLabel>
                                            <FormDescription>전체 사용자에게 알림톡을 발송합니다</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* 공지 종료일 */}
                        <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-base font-semibold">공지 종료일</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={'outline'}
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, 'PPP', { locale: ko })
                                                    ) : (
                                                        <span>종료일을 선택하세요</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date()}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>공지사항이 자동으로 종료되는 날짜입니다</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 내용 */}
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-semibold">내용</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="공지사항 내용을 입력하세요"
                                            className="min-h-[300px] resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 버튼 그룹 */}
                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                취소
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? '수정 중...' : '수정 완료'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>

            {/* 모달 컴포넌트 */}
            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default NoticeEdit;
