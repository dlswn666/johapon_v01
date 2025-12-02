'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddNotice } from '@/app/_lib/features/notice/api/useNoticeHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
    is_popup: z.boolean(),
});

const NewNoticePage = () => {
    const router = useRouter();
    const { slug, union } = useSlug();
    const { mutate: addNotice, isPending } = useAddNotice();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            content: '',
            is_popup: false,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!union) return;

        addNotice({
            ...values,
            author_id: 'systemAdmin', // TODO: 실제 로그인 유저 ID로 변경
            views: 0,
        });
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
                    <h1 className="text-2xl font-bold mb-6">공지사항 작성</h1>
                    
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
                                            <Textarea 
                                                placeholder="내용을 입력해주세요" 
                                                className="min-h-[300px]"
                                                {...field} 
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
                                        unionSlug={slug}
                                        targetType="NOTICE"
                                        // targetId가 없으면 '작성 중' 모드 (임시 파일 관리)
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
                                    onClick={() => router.push(`/${slug}/notice`)}
                                >
                                    취소
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? '등록 중...' : '등록'}
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

export default NewNoticePage;
