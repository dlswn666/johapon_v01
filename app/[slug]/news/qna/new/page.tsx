'use client';

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
import { ActionButton } from '@/app/_lib/widgets/common/button';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.').max(200, '제목은 200자 이내로 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.').max(50000, '내용이 너무 깁니다.'),
    is_secret: z.boolean(),
});

export default function NewQuestionPage() {
    const router = useRouter();
    const { slug, union } = useSlug();
    const { user } = useAuth();
    const { mutate: addQuestion, isPending } = useAddQuestion();
    
    // Store cleanup actions
    const addEditorImage = useQuestionStore((state) => state.addEditorImage);
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

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (form.formState.isDirty) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!union || !user || isPending) return;

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
                    <h2 className="text-[32px] font-bold text-brand-light mb-8">질문하기</h2>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[16px] font-bold text-brand-light">제목</FormLabel>
                                        <FormControl>
                                            <Input placeholder="제목을 입력해주세요" {...field} maxLength={200} className="h-[48px] text-[16px] rounded-[12px] border-subtle-border" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_secret"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[12px] border border-subtle-border bg-subtle-bg p-6 cursor-pointer">
                                        <FormControl>
                                            <Checkbox 
                                                checked={field.value} 
                                                onCheckedChange={field.onChange} 
                                                className="data-[state=checked]:bg-brand border-subtle-text cursor-pointer" 
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="text-[16px] text-gray-700 font-medium cursor-pointer">비밀글로 작성</FormLabel>
                                            <p className="text-[14px] text-subtle-text">
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
                                        <FormLabel className="text-[16px] font-bold text-brand-light">내용</FormLabel>
                                        <FormControl>
                                            <TextEditor
                                                content={field.value}
                                                onChange={field.onChange}
                                                placeholder="질문 내용을 입력해주세요. 이미지를 첨부할 수 있습니다."
                                                onAddImage={addEditorImage}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="bg-brand/10 border border-brand rounded-[12px] p-4">
                                <p className="text-[14px] text-brand">
                                    💡 질문이 등록되면 관리자에게 알림이 발송됩니다. 답변이 등록되면 알림톡으로 안내해 드립니다.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-subtle-border">
                                <ActionButton
                                    buttonType="cancel"
                                    onClick={() => {
                                        if (form.formState.isDirty) {
                                            if (window.confirm('작성 중인 내용이 있습니다. 나가시겠습니까?')) {
                                                router.push(`/${slug}/news/qna`);
                                            }
                                        } else {
                                            router.push(`/${slug}/news/qna`);
                                        }
                                    }}
                                >
                                    취소
                                </ActionButton>
                                <ActionButton 
                                    type="submit" 
                                    buttonType="submit"
                                    isLoading={isPending}
                                >
                                    질문 등록
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

