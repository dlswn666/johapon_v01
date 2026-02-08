'use client';

import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuestion, useUpdateQuestion } from '@/app/_lib/features/question/api/useQuestionHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import useQuestionStore from '@/app/_lib/features/question/model/useQuestionStore';
import { ActionButton } from '@/app/_lib/widgets/common/button';

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
    is_secret: z.boolean(),
});

const EditQuestionPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const questionId = parseInt(id);
    const { union, isLoading: isUnionLoading } = useSlug();
    const { user } = useAuth();
    
    const { data: question, isLoading: isQuestionLoading } = useQuestion(questionId);
    const { mutate: updateQuestion, isPending } = useUpdateQuestion();
    
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

    // 데이터 로드 시 폼 값 설정
    useEffect(() => {
        if (question) {
            form.reset({
                title: question.title,
                content: question.content,
                is_secret: question.is_secret ?? false,
            });
        }
    }, [question, form]);

    // 권한 체크
    const canEdit = question && (question.author_id === user?.id);

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!union || !canEdit) return;

        updateQuestion({
            id: questionId,
            updates: values,
            updatedAt: question?.updated_at ?? undefined,
        });
    }

    if (isUnionLoading || isQuestionLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (!question) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">질문을 찾을 수 없습니다.</p>
                </div>
            </div>
        );
    }

    if (!canEdit) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">수정 권한이 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-[32px] font-bold text-[#5FA37C] mb-8">질문 수정</h2>

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
                                    onClick={() => router.push(`/${slug}/news/qna/${id}`)}
                                >
                                    취소
                                </ActionButton>
                                <ActionButton 
                                    type="submit" 
                                    buttonType="submit"
                                    isLoading={isPending}
                                >
                                    수정 완료
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

export default EditQuestionPage;
