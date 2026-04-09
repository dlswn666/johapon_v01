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

export default function UnionInfoDetailPage() {
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
                <div className="space-y-8">
                    {/* 제목 + 버튼 */}
                    <div className="flex justify-between items-start border-b border-subtle-border pb-6">
                        <Skeleton className="h-9 w-3/4" />
                        <div className="flex gap-2 shrink-0">
                            <Skeleton className="h-9 w-16 rounded-md" style={{ animationDelay: '50ms' }} />
                            <Skeleton className="h-9 w-16 rounded-md" style={{ animationDelay: '75ms' }} />
                        </div>
                    </div>
                    {/* 메타 정보 */}
                    <div className="flex gap-6 pb-4">
                        <Skeleton className="h-4 w-28" style={{ animationDelay: '100ms' }} />
                        <Skeleton className="h-4 w-28" style={{ animationDelay: '125ms' }} />
                        <Skeleton className="h-4 w-20" style={{ animationDelay: '150ms' }} />
                    </div>
                    {/* 본문 */}
                    <div className="rounded-[12px] border border-subtle-border p-6 space-y-3">
                        <Skeleton className="h-4 w-full" style={{ animationDelay: '175ms' }} />
                        <Skeleton className="h-4 w-full" style={{ animationDelay: '200ms' }} />
                        <Skeleton className="h-4 w-5/6" style={{ animationDelay: '225ms' }} />
                        <Skeleton className="h-4 w-2/3" style={{ animationDelay: '250ms' }} />
                        <Skeleton className="h-32 w-full" style={{ animationDelay: '275ms' }} />
                    </div>
                    {/* 첨부파일 */}
                    <div>
                        <Skeleton className="h-4 w-20 mb-3" style={{ animationDelay: '325ms' }} />
                        <Skeleton className="h-10 w-48 rounded-[8px]" style={{ animationDelay: '350ms' }} />
                    </div>
                    {/* 댓글 */}
                    <div className="space-y-4">
                        <Skeleton className="h-5 w-24" style={{ animationDelay: '375ms' }} />
                        <Skeleton className="h-20 w-full rounded-[8px]" style={{ animationDelay: '400ms' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (isInvalidId || error || !post) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <p className="text-[18px] text-error-text">
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
                    <div className="flex justify-between items-start border-b border-subtle-border pb-6">
                        <h2 className="text-[24px] md:text-[32px] font-bold text-brand-light flex-1 pr-4">{post.title}</h2>
                        <div className="flex gap-2 shrink-0">
                            {canEdit && (
                                <>
                                    <Button 
                                        className="bg-white border border-brand text-brand hover:bg-subtle-bg cursor-pointer" 
                                        onClick={() => router.push(`/${slug}/communication/union-info/${id}/edit`)}
                                    >
                                        수정
                                    </Button>
                                    <Button 
                                        className="bg-error-text text-white hover:bg-error-text/90 cursor-pointer" 
                                        onClick={handleDelete}
                                    >
                                        삭제
                                    </Button>
                                </>
                            )}
                            <Button 
                                className="bg-subtle-bg text-brand-light hover:bg-subtle-bg/80 cursor-pointer" 
                                onClick={() => router.push(`/${slug}/communication/union-info`)}
                            >
                                목록
                            </Button>
                        </div>
                    </div>

                    {/* 메타 정보 */}
                    <div className="flex gap-6 text-[14px] text-subtle-text pb-4">
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
                        className="min-h-[200px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800 bg-white rounded-[12px] border border-subtle-border p-6" 
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


