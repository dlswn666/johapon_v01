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
import { Checkbox } from '@/components/ui/checkbox';
import { useAddQuestion } from '@/app/_lib/features/question/api/useQuestionHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import useQuestionStore from '@/app/_lib/features/question/model/useQuestionStore';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
    is_secret: z.boolean(),
});

const NewQuestionPage = () => {
    const router = useRouter();
    const { slug, union } = useSlug();
    const { user } = useAuth();
    const { mutate: addQuestion, isPending } = useAddQuestion();
    
    // Store cleanup actions
    const clearEditorImages = useQuestionStore((state) => state.clearEditorImages);

    // Mount/Unmount cleanup
    useEffect(() => {
        clearEditorImages();
        return () => {
            clearEditorImages();
        };
    }, [clearEditorImages]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            content: '',
            is_secret: false,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!union || !user) return;

        addQuestion({
            ...values,
            author_id: user.id,
            views: 0,
        });
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-[32px] font-bold text-[#5FA37C] mb-8">질문하기</h2>

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

                            <FormField
                                control={form.control}
                                name="is_secret"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[12px] border border-[#CCCCCC] bg-[#F5F5F5] p-6 cursor-pointer">
                                        <FormControl>
                                            <Checkbox 
                                                checked={field.value} 
                                                onCheckedChange={field.onChange} 
                                                className="data-[state=checked]:bg-[#4E8C6D] border-[#AFAFAF] cursor-pointer" 
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="text-[16px] text-gray-700 font-medium cursor-pointer">비밀글로 작성</FormLabel>
                                            <p className="text-[14px] text-[#AFAFAF]">
                                                비밀글은 작성자와 관리자만 확인할 수 있습니다.
                                            </p>
                                        </div>
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
                                                placeholder="질문 내용을 입력해주세요. 이미지를 첨부할 수 있습니다."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="bg-[#FFF9E6] border border-[#F0AD4E] rounded-[12px] p-4">
                                <p className="text-[14px] text-[#8B6914]">
                                    💡 질문이 등록되면 관리자에게 알림이 발송됩니다. 답변이 등록되면 알림톡으로 안내해 드립니다.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => router.push(`/${slug}/news/qna`)}
                                    className="h-[48px] px-8 text-[16px] border-[#CCCCCC] text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    취소
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isPending}
                                    className="h-[48px] px-8 text-[16px] bg-[#4E8C6D] hover:bg-[#5FA37C] text-white cursor-pointer"
                                >
                                    {isPending ? '등록 중...' : '질문 등록'}
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

export default NewQuestionPage;

