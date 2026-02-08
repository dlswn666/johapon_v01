'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnionInfo, useIncrementUnionInfoViews, useDeleteUnionInfo } from '@/app/_lib/features/union-info/api/useUnionInfoHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { User, Eye, Calendar } from 'lucide-react';
import { FileUploader } from '@/app/_lib/widgets/common/file-uploader/FileUploader';
import { BoardComment } from '@/app/_lib/widgets/common/comment';
import { formatDate, formatAuthorName } from '@/app/_lib/shared/utils/commonUtil';
import { sanitizeHtml } from '@/app/_lib/shared/utils/sanitize';

const UnionInfoDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const postId = parseInt(id);
    const isInvalidId = isNaN(postId);
    const { isLoading: isUnionLoading } = useSlug();
    const { user, isAdmin } = useAuth();
    
    const { data: post, isLoading, error } = useUnionInfo(postId);
    const { mutate: incrementViews } = useIncrementUnionInfoViews();
    const { mutate: deletePost } = useDeleteUnionInfo();
    const { openConfirmModal } = useModalStore();

    // 조회수 증가 (세션당 1회)
    useEffect(() => {
        if (postId && !isUnionLoading) {
            const viewedKey = `viewed_union_info_${postId}`;
            if (!sessionStorage.getItem(viewedKey)) {
                incrementViews(postId);
                sessionStorage.setItem(viewedKey, '1');
            }
        }
    }, [postId, isUnionLoading, incrementViews]);

    const handleDelete = () => {
        openConfirmModal({
            title: '게시글 삭제',
            message: '정말로 이 게시글을 삭제하시겠습니까? 첨부된 파일도 함께 삭제됩니다.',
            onConfirm: () => deletePost(postId),
        });
    };

    const isMine = post?.author_id === user?.id;
    const canEdit = isMine || isAdmin;

    if (isUnionLoading || isLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <Skeleton className="w-full h-[600px] rounded-[24px]" />
            </div>
        );
    }

    if (isInvalidId || error || !post) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <p className="text-[18px] text-[#D9534F]">
                        {error?.message || '게시글을 찾을 수 없습니다.'}
                    </p>
                    <button
                        onClick={() => router.push(`/${slug}/communication/union-info`)}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                        목록으로
                    </button>
                </div>
            </div>
        );
    }

    const authorName = formatAuthorName((post.author as { name: string } | null)?.name);

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="space-y-8">
                    {/* 제목 영역 */}
                    <div className="flex justify-between items-start border-b border-[#CCCCCC] pb-6">
                        <h2 className="text-[24px] md:text-[32px] font-bold text-[#5FA37C] flex-1 pr-4">{post.title}</h2>
                        <div className="flex gap-2 shrink-0">
                            {canEdit && (
                                <>
                                    <Button 
                                        className="bg-white border border-[#4E8C6D] text-[#4E8C6D] hover:bg-[#F5F5F5] cursor-pointer" 
                                        onClick={() => router.push(`/${slug}/communication/union-info/${id}/edit`)}
                                    >
                                        수정
                                    </Button>
                                    <Button 
                                        className="bg-[#D9534F] text-white hover:bg-[#D9534F]/90 cursor-pointer" 
                                        onClick={handleDelete}
                                    >
                                        삭제
                                    </Button>
                                </>
                            )}
                            <Button 
                                className="bg-[#E6E6E6] text-[#5FA37C] hover:bg-[#E6E6E6]/80 cursor-pointer" 
                                onClick={() => router.push(`/${slug}/communication/union-info`)}
                            >
                                목록
                            </Button>
                        </div>
                    </div>

                    {/* 메타 정보 */}
                    <div className="flex gap-6 text-[14px] text-[#AFAFAF] pb-4">
                        <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            작성자: {authorName}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            작성일: {formatDate(post.created_at, true)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            조회수: {post.views}
                        </span>
                    </div>

                    {/* 본문 */}
                    <div 
                        className="min-h-[200px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800 bg-white rounded-[12px] border border-[#CCCCCC] p-6" 
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} 
                    />

                    {/* 첨부파일 영역 */}
                    <div className="mt-8">
                        <FileUploader
                            targetId={id}
                            targetType="UNION_INFO"
                            unionSlug={slug}
                            readOnly={true}
                        />
                    </div>

                    {/* 댓글 영역 */}
                    <div className="mt-8 bg-white rounded-[12px] p-0">
                        <BoardComment entityType="union_info" entityId={postId} />
                    </div>
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default UnionInfoDetailPage;

