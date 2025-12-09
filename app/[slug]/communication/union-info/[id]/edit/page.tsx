'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUnionInfo, useUpdateUnionInfo, useDeleteUnionInfoFile } from '@/app/_lib/features/union-info/api/useUnionInfoHook';
import useUnionInfoStore from '@/app/_lib/features/union-info/model/useUnionInfoStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { Download, Trash2, Paperclip } from 'lucide-react';
import { fileApi } from '@/app/_lib/shared/hooks/file/fileApi';

interface EditUnionInfoPageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

const formSchema = z.object({
    title: z.string().min(1, '제목을 입력해주세요.'),
    content: z.string().min(1, '내용을 입력해주세요.'),
});

const EditUnionInfoPage = ({ params }: EditUnionInfoPageProps) => {
    const router = useRouter();
    const { slug, id } = use(params);
    const postId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();
    const { mutate: updateUnionInfo, isPending } = useUpdateUnionInfo();
    const { mutate: deleteFile } = useDeleteUnionInfoFile();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);
    
    const { data: post, isLoading, error } = useUnionInfo(postId);
    const { openAlertModal } = useModalStore();
    
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

    // 데이터 로드 후 폼 값 설정
    useEffect(() => {
        if (post) {
            form.reset({
                title: post.title,
                content: post.content,
            });
        }
    }, [post, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        updateUnionInfo({
            id: postId,
            updates: values,
        });
    }

    const handleFileDownload = async (path: string, fileName: string) => {
        try {
            const url = await fileApi.getDownloadUrl(path, fileName);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Download failed', err);
            openAlertModal({
                title: '다운로드 실패',
                message: '파일 다운로드에 실패했습니다.',
                type: 'error',
            });
        }
    };

    const handleFileDelete = (fileId: string, filePath: string) => {
        openConfirmModal({
            title: '파일 삭제',
            message: '정말로 이 파일을 삭제하시겠습니까?',
            onConfirm: () => deleteFile({ fileId, filePath, postId }),
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isUnionLoading || isLoading) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-gray-400">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">
                        {error?.message || '게시글을 찾을 수 없습니다.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-[32px] font-bold text-[#5FA37C] mb-8">조합 정보 수정</h2>

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

                            {/* 기존 첨부파일 목록 */}
                            {post.files && post.files.length > 0 && (
                                <div className="border border-[#CCCCCC] rounded-[12px] p-6">
                                    <h3 className="text-[16px] font-bold text-[#5FA37C] mb-4 flex items-center gap-2">
                                        <Paperclip className="h-5 w-5" />
                                        기존 첨부파일 ({post.files.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {post.files.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between p-3 border rounded-[8px] bg-[#F5F5F5] hover:bg-[#E6E6E6] transition-colors"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <Paperclip className="h-4 w-4 text-[#5FA37C] shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate text-[14px] text-gray-800">{file.name}</p>
                                                        <p className="text-[12px] text-gray-500">
                                                            {formatFileSize(file.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 cursor-pointer"
                                                        onClick={() => handleFileDownload(file.path, file.name)}
                                                        title="다운로드"
                                                    >
                                                        <Download className="h-4 w-4 text-gray-600" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                                        onClick={() => handleFileDelete(file.id, file.path)}
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 새 파일 업로더 */}
                            <div>
                                <label className="text-[16px] font-bold text-[#5FA37C] block mb-2">새 첨부파일 추가</label>
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
                                    onClick={() => router.push(`/${slug}/communication/union-info/${id}`)}
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
            <ConfirmModal />
        </>
    );
};

export default EditUnionInfoPage;

