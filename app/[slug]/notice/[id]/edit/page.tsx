'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useNotice, useUpdateNotice } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
    is_popup: z.boolean(),
});

interface EditNoticePageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

const EditNoticePage = ({ params }: EditNoticePageProps) => {
    const router = useRouter();
    const { id } = use(params);
    const noticeId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();
    
    const { data: notice, isLoading } = useNotice(noticeId);
    const { mutate: updateNotice, isPending } = useUpdateNotice();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            content: '',
            is_popup: false,
        },
    });

    useEffect(() => {
        if (notice) {
            form.reset({
                title: notice.title,
                content: notice.content,
                is_popup: notice.is_popup,
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
            <div className={cn('container mx-auto p-6')}>
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex justify-between items-center">
                        <UnionHeader />
                        <UnionNavigation />
                    </div>
                    <Separator />
                </div>

                <div className="max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6">공지사항 수정</h1>
                    
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>제목</FormLabel>
                                        <FormControl>
                                            <Input placeholder="제목을 입력해주세요" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>내용</FormLabel>
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

                            {/* 파일 업로드 위젯 추가 */}
                            <FormItem>
                                <FormLabel>첨부파일</FormLabel>
                                <FormControl>
                                    <FileUploader
                                        unionSlug={params.slug}
                                        targetType="NOTICE"
                                        targetId={String(noticeId)}
                                    />
                                </FormControl>
                            </FormItem>

                            <FormField
                                control={form.control}
                                name="is_popup"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                팝업으로 표시
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => router.back()}
                                >
                                    취소
                                </Button>
                                <Button type="submit" disabled={isPending}>
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

