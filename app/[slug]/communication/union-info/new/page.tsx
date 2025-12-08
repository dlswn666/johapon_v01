'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAddUnionInfo } from '@/app/_lib/features/union-info/api/useUnionInfoHook';
import useUnionInfoStore from '@/app/_lib/features/union-info/model/useUnionInfoStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
});

const NewUnionInfoPage = () => {
    const router = useRouter();
    const { slug, union } = useSlug();
    const { user } = useAuth();
    const { mutate: addUnionInfo, isPending } = useAddUnionInfo();
    
    // Store cleanup actions
    const clearEditorImages = useUnionInfoStore((state) => state.clearEditorImages);
    const clearTempFiles = useUnionInfoStore((state) => state.clearTempFiles);

    // Mount/Unmount cleanup
    useEffect(() => {
        clearEditorImages();
        clearTempFiles();
        return () => {
            clearEditorImages();
            clearTempFiles();
        };
    }, [clearEditorImages, clearTempFiles]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            content: '',
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!union || !user) return;

        addUnionInfo({
            ...values,
            author_id: user.id,
            views: 0,
        });
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-[32px] font-bold text-[#5FA37C] mb-8">조합 정보 등록</h2>

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
                                                placeholder="내용을 입력해주세요. 이미지를 첨부할 수 있습니다."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 파일 업로더 */}
                            <div>
                                <label className="text-[16px] font-bold text-[#5FA37C] block mb-2">첨부파일</label>
                                <FileUploader
                                    unionSlug={slug}
                                    targetType="UNION_INFO"
                                    readOnly={false}
                                />
                            </div>

                            <div className="bg-[#FFF9E6] border border-[#F0AD4E] rounded-[12px] p-4">
                                <p className="text-[14px] text-[#8B6914]">
                                    💡 이미지는 본문 에디터에 직접 첨부할 수 있으며, 별도 파일은 아래 파일 첨부 영역을 이용해주세요.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => router.push(`/${slug}/communication/union-info`)}
                                    className="h-[48px] px-8 text-[16px] border-[#CCCCCC] text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    취소
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isPending}
                                    className="h-[48px] px-8 text-[16px] bg-[#4E8C6D] hover:bg-[#5FA37C] text-white cursor-pointer"
                                >
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

export default NewUnionInfoPage;

