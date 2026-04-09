'use client';

import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import { useQuestion, useIncrementQuestionViews, useDeleteQuestion, useAnswerQuestion, useDeleteAnswer } from '@/app/_lib/features/question/api/useQuestionHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import useQuestionStore from '@/app/_lib/features/question/model/useQuestionStore';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import { Lock, CheckCircle, User } from 'lucide-react';
import { ActionButton } from '@/app/_lib/widgets/common/button';
import { formatDate, formatAuthorName } from '@/app/_lib/shared/utils/commonUtil';
import { sanitizeHtml } from '@/app/_lib/shared/utils/sanitize';

export default function QuestionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;
    const questionId = parseInt(id);
    const isInvalidId = isNaN(questionId);
    const { isLoading: isUnionLoading } = useSlug();
    const { user, isAdmin } = useAuth();
    
    const { data: question, isLoading, error } = useQuestion(questionId);
    const { mutate: incrementViews } = useIncrementQuestionViews();
    const { mutate: deleteQuestion } = useDeleteQuestion();
    const { mutate: answerQuestion, isPending: isAnswering } = useAnswerQuestion();
    const { mutate: deleteAnswer } = useDeleteAnswer();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // 답변 에디터 이미지 관리
    const addAnswerEditorImage = useQuestionStore((state) => state.addAnswerEditorImage);
    const clearAnswerEditorImages = useQuestionStore((state) => state.clearAnswerEditorImages);

    // 컴포넌트 마운트/언마운트 시 이미지 Store 정리
    useEffect(() => {
        clearAnswerEditorImages();
        return () => {
            clearAnswerEditorImages();
        };
    }, [clearAnswerEditorImages]);

    // 답변 작성 모드
    const [isAnswerMode, setIsAnswerMode] = useState(false);
    const [answerContent, setAnswerContent] = useState('');

    // 조회수 증가 (세션당 1회, union 로드 완료 후)
    React.useEffect(() => {
        if (questionId && !isUnionLoading) {
            const viewedKey = `viewed_question_${questionId}`;
            if (!sessionStorage.getItem(viewedKey)) {
                incrementViews(questionId);
                sessionStorage.setItem(viewedKey, '1');
            }
        }
    }, [questionId, isUnionLoading, incrementViews]);

    const handleDelete = () => {
        openConfirmModal({
            title: '질문 삭제',
            message: '정말로 이 질문을 삭제하시겠습니까?',
            onConfirm: () => deleteQuestion(questionId),
        });
    };

    const handleSubmitAnswer = async () => {
        if (!answerContent.trim()) {
            return;
        }
        
        // mutateAsync를 사용하여 처리가 완료될 때까지 대기
        await answerQuestion({
            questionId,
            answerContent,
        }, {
            onSuccess: () => {
                setIsAnswerMode(false);
                setAnswerContent('');
            }
        });
    };

    const handleEditAnswer = () => {
        setAnswerContent(question?.answer_content || '');
        setIsAnswerMode(true);
    };

    const handleDeleteAnswer = () => {
        openConfirmModal({
            title: '답변 삭제',
            message: '정말로 답변을 삭제하시겠습니까?',
            onConfirm: () => deleteAnswer(questionId),
        });
    };

    const isMine = question?.author_id === user?.id;
    const canEdit = isMine;
    const canAnswer = isAdmin && !question?.answered_at;

    if (isUnionLoading || isLoading) {
        return (
            <div className="container mx-auto max-w-[1280px] px-4 py-8">
                <div className="space-y-8">
                    {/* 제목 영역 */}
                    <div className="border-b border-subtle-border pb-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-3/4" />
                            <Skeleton className="h-7 w-20 rounded-full" style={{ animationDelay: '50ms' }} />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex gap-6">
                                <Skeleton className="h-4 w-28" style={{ animationDelay: '100ms' }} />
                                <Skeleton className="h-4 w-28" style={{ animationDelay: '125ms' }} />
                                <Skeleton className="h-4 w-20" style={{ animationDelay: '150ms' }} />
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-[40px] w-16 rounded-lg" style={{ animationDelay: '175ms' }} />
                                <Skeleton className="h-[40px] w-16 rounded-lg" style={{ animationDelay: '200ms' }} />
                            </div>
                        </div>
                    </div>
                    {/* 질문 본문 */}
                    <div className="rounded-[12px] border border-subtle-border p-6 space-y-3">
                        <Skeleton className="h-4 w-full" style={{ animationDelay: '225ms' }} />
                        <Skeleton className="h-4 w-full" style={{ animationDelay: '250ms' }} />
                        <Skeleton className="h-4 w-5/6" style={{ animationDelay: '275ms' }} />
                        <Skeleton className="h-4 w-2/3" style={{ animationDelay: '300ms' }} />
                    </div>
                    {/* 답변 영역 */}
                    <div className="border-t-2 border-brand pt-6 space-y-4">
                        <Skeleton className="h-7 w-32" style={{ animationDelay: '350ms' }} />
                        <Skeleton className="h-24 w-full rounded-[12px]" style={{ animationDelay: '375ms' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (isInvalidId || error || !question) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col justify-center items-center h-64 gap-4">
                    <p className="text-[18px] text-error-text">
                        {error?.message || '질문을 찾을 수 없습니다.'}
                    </p>
                    <button
                        onClick={() => router.push(`/${slug}/news/qna`)}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                        목록으로
                    </button>
                </div>
            </div>
        );
    }

    const authorName = formatAuthorName((question.author as { name: string } | null)?.name);
    const answerAuthorName = formatAuthorName((question.answer_author as { name: string } | null)?.name);

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="space-y-8">
                    {/* 제목 영역 */}
                    <div className="border-b border-subtle-border pb-6 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            {question.is_secret && (
                                <Lock className="h-6 w-6 text-subtle-text" />
                            )}
                            <h2 className="text-[24px] md:text-[32px] font-bold text-brand-light">{question.title}</h2>
                            {question.answered_at && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand text-white text-[14px] rounded-full">
                                    <CheckCircle className="h-4 w-4" />
                                    답변완료
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-6 text-[14px] text-subtle-text">
                                <span className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    작성자: {authorName}
                                </span>
                                <span>작성일: {question.created_at ? formatDate(question.created_at, true) : '-'}</span>
                                <span>조회수: {question.views}</span>
                                {question.is_secret && (
                                    <span className="text-warning">비밀글</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {canEdit && (
                                    <>
                                        <ActionButton
                                            variant="outline"
                                            onClick={() => router.push(`/${slug}/news/qna/${id}/edit`)}
                                            className="h-[40px] px-4 border-brand text-brand hover:bg-subtle-bg"
                                        >
                                            수정
                                        </ActionButton>
                                        <ActionButton
                                            variant="destructive"
                                            onClick={handleDelete}
                                            className="h-[40px] px-4"
                                        >
                                            삭제
                                        </ActionButton>
                                    </>
                                )}
                                <ActionButton
                                    buttonType="cancel"
                                    onClick={() => router.push(`/${slug}/news/qna`)}
                                    className="h-[40px] px-4"
                                >
                                    목록
                                </ActionButton>
                            </div>
                        </div>
                    </div>

                    {/* 질문 본문 */}
                    <div className="min-h-[200px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800 bg-white rounded-[12px] border border-subtle-border p-6" 
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.content) }} 
                    />

                    {/* 답변 영역 */}
                    <div className="mt-8 border-t-2 border-brand pt-6">
                        <h3 className="text-[24px] font-bold text-brand mb-4 flex items-center gap-2">
                            💬 관리자 답변
                        </h3>

                        {isAnswerMode ? (
                            <div className="bg-subtle-bg rounded-[12px] p-6 space-y-4">
                                <TextEditor
                                    content={answerContent}
                                    onChange={setAnswerContent}
                                    placeholder="답변 내용을 입력해주세요. 이미지를 첨부할 수 있습니다."
                                    onAddImage={addAnswerEditorImage}
                                />
                                <div className="flex justify-end gap-3">
                                    <ActionButton
                                        buttonType="cancel"
                                        onClick={() => {
                                            setIsAnswerMode(false);
                                            setAnswerContent('');
                                        }}
                                    >
                                        취소
                                    </ActionButton>
                                    <ActionButton
                                        buttonType="submit"
                                        onClick={handleSubmitAnswer}
                                        isLoading={isAnswering}
                                        disabled={!answerContent.trim()}
                                    >
                                        답변 등록
                                    </ActionButton>
                                </div>
                                <div className="bg-brand/10 border border-brand rounded-[8px] p-3">
                                    <p className="text-[12px] text-brand">
                                        💡 답변이 등록되면 질문자에게 알림톡이 발송됩니다.
                                    </p>
                                </div>
                            </div>
                        ) : question.answered_at && question.answer_content ? (
                            <div className="bg-brand/5 rounded-[12px] p-6 relative group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4 text-[14px] text-brand-light">
                                        <span className="font-medium">답변자: {answerAuthorName}</span>
                                        <span>답변일: {formatDate(question.answered_at, true)}</span>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={handleEditAnswer}
                                                className="text-[14px] font-medium text-brand hover:underline cursor-pointer"
                                            >
                                                수정
                                            </button>
                                            <button 
                                                onClick={handleDeleteAnswer}
                                                className="text-[14px] font-medium text-error-text hover:underline cursor-pointer"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div 
                                    className="prose prose-lg max-w-none text-[16px] leading-relaxed text-gray-800"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.answer_content) }}
                                />
                            </div>
                        ) : (
                            <div className="bg-subtle-bg rounded-[12px] p-6 text-center">
                                <p className="text-subtle-text text-[16px] mb-4">아직 답변이 등록되지 않았습니다.</p>
                                {canAnswer && (
                                    <ActionButton
                                        buttonType="submit"
                                        onClick={() => setIsAnswerMode(true)}
                                    >
                                        답변 작성하기
                                    </ActionButton>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

