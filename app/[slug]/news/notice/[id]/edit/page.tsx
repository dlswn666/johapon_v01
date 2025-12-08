'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useNotice, useUpdateNotice } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import useNoticeStore from '@/app/_lib/features/notice/model/useNoticeStore';
import { useFileStore } from '@/app/_lib/shared/stores/file/useFileStore';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
    is_popup: z.boolean(),
    send_alimtalk: z.boolean().default(false),
});


interface EditNoticePageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

const EditNoticePage = ({ params }: EditNoticePageProps) => {
    const router = useRouter();
    const { id, slug } = use(params);
    const noticeId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();

    const { data: notice, isLoading } = useNotice(noticeId);
    const { mutate: updateNotice, isPending } = useUpdateNotice();
    
    // Store cleanup actions
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
        },
    });

    useEffect(() => {
        if (notice) {
            form.reset({
                title: notice.title,
                content: notice.content,
                is_popup: notice.is_popup,
                send_alimtalk: false, // 수정 시 기본값은 false
            });
        }
    }, [notice, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        updateNotice({
            id: noticeId,
            updates: values,
        });
    }

    if (isUnionLoading || isLoading) {
        return (
            <div className={cn('container mx-auto p-6')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-lg text-muted-foreground">로딩 중...</p>
                </div>
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
                                            <Input placeholder="제목을 입력해주세요" {...field} className="h-[48px] text-[16px] rounded-[12px] border-[#CCCCCC]" />
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
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[#4E8C6D] border-[#AFAFAF] cursor-pointer" />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-[16px] text-gray-700 font-medium cursor-pointer">팝업으로 표시</FormLabel>
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
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[#4E8C6D] border-[#AFAFAF] cursor-pointer" />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-[16px] text-gray-700 font-medium cursor-pointer">알림톡 발송</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

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
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => router.back()}
                                    className="h-[48px] px-8 text-[16px] border-[#CCCCCC] text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    취소
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isPending}
                                    className="h-[48px] px-8 text-[16px] bg-[#4E8C6D] hover:bg-[#5FA37C] text-white cursor-pointer"
                                >
                                    {isPending ? '수정 중...' : '수정'}
                                </Button>
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

