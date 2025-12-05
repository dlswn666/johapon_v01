'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestion, useIncrementQuestionViews, useDeleteQuestion, useAnswerQuestion } from '@/app/_lib/features/question/api/useQuestionHook';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import ConfirmModal from '@/app/_lib/widgets/modal/ConfirmModal';
import AlertModal from '@/app/_lib/widgets/modal/AlertModal';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import UnionNavigation from '@/app/_lib/widgets/union/navigation/Navigation';
import UnionHeader from '@/app/_lib/widgets/union/header/UnionHeader';
import { TextEditor } from '@/app/_lib/widgets/common/text-editor';
import { Lock, CheckCircle, User } from 'lucide-react';

interface QuestionDetailPageProps {
    params: Promise<{
        slug: string;
        id: string;
    }>;
}

const QuestionDetailPage = ({ params }: QuestionDetailPageProps) => {
    const router = useRouter();
    const { slug, id } = use(params);
    const questionId = parseInt(id);
    const { isLoading: isUnionLoading } = useSlug();
    const { user, isAdmin } = useAuth();
    
    const { data: question, isLoading, error } = useQuestion(questionId);
    const { mutate: incrementViews } = useIncrementQuestionViews();
    const { mutate: deleteQuestion } = useDeleteQuestion();
    const { mutate: answerQuestion, isPending: isAnswering } = useAnswerQuestion();
    const openConfirmModal = useModalStore((state) => state.openConfirmModal);

    // 답변 작성 모드
    const [isAnswerMode, setIsAnswerMode] = useState(false);
    const [answerContent, setAnswerContent] = useState('');

    // 조회수 증가 (컴포넌트 마운트 시 1회)
    React.useEffect(() => {
        if (questionId) {
            incrementViews(questionId);
        }
    }, [questionId, incrementViews]);

    const handleDelete = () => {
        openConfirmModal({
            title: '질문 삭제',
            message: '정말로 이 질문을 삭제하시겠습니까?',
            onConfirm: () => deleteQuestion(questionId),
        });
    };

    const handleSubmitAnswer = () => {
        if (!answerContent.trim()) {
            return;
        }
        answerQuestion({
            questionId,
            answerContent,
        });
        setIsAnswerMode(false);
        setAnswerContent('');
    };

    const isMine = question?.author_id === user?.id;
    const canEdit = isMine || isAdmin;
    const canAnswer = isAdmin && !question?.answered_at;

    if (isUnionLoading || isLoading) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-gray-400">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !question) {
        return (
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex justify-center items-center h-64">
                    <p className="text-[18px] text-[#D9534F]">
                        {error?.message || '질문을 찾을 수 없습니다.'}
                    </p>
                </div>
            </div>
        );
    }

    const authorName = (question.author as { name: string } | null)?.name || question.author_id;
    const answerAuthorName = (question.answer_author as { name: string } | null)?.name || question.answer_author_id;

    return (
        <>
            <div className={cn('container mx-auto max-w-[1280px] px-4 py-8')}>
                <div className="flex flex-col gap-6 mb-[80px]">
                    <div className="flex justify-between items-center">
                        <UnionHeader />
                        <UnionNavigation />
                    </div>
                    <Separator className="bg-[#CCCCCC]" />
                </div>

                <div className="space-y-8">
                    {/* 제목 영역 */}
                    <div className="flex justify-between items-start border-b border-[#CCCCCC] pb-6">
                        <div className="flex items-center gap-3">
                            {question.is_secret && (
                                <Lock className="h-6 w-6 text-[#AFAFAF]" />
                            )}
                            <h2 className="text-[32px] font-bold text-[#5FA37C]">{question.title}</h2>
                            {question.answered_at && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#4E8C6D] text-white text-[14px] rounded-full">
                                    <CheckCircle className="h-4 w-4" />
                                    답변완료
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {canEdit && (
                                <>
                                    <Button 
                                        className="bg-white border border-[#4E8C6D] text-[#4E8C6D] hover:bg-[#F5F5F5] cursor-pointer" 
                                        onClick={() => router.push(`/${slug}/qna/${id}/edit`)}
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
                                onClick={() => router.push(`/${slug}/qna`)}
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
                        <span>작성일: {new Date(question.created_at).toLocaleDateString('ko-KR')}</span>
                        <span>조회수: {question.views}</span>
                        {question.is_secret && (
                            <span className="text-[#F0AD4E]">🔒 비밀글</span>
                        )}
                    </div>

                    {/* 질문 본문 */}
                    <div className="min-h-[200px] whitespace-pre-wrap py-4 prose prose-lg max-w-none text-[18px] leading-relaxed text-gray-800 bg-white rounded-[12px] border border-[#CCCCCC] p-6" 
                        dangerouslySetInnerHTML={{ __html: question.content }} 
                    />

                    {/* 답변 영역 */}
                    <div className="mt-8 border-t-2 border-[#4E8C6D] pt-6">
                        <h3 className="text-[24px] font-bold text-[#4E8C6D] mb-4 flex items-center gap-2">
                            💬 관리자 답변
                        </h3>

                        {question.answered_at && question.answer_content ? (
                            <div className="bg-[#F0F7F4] rounded-[12px] p-6">
                                <div className="flex items-center gap-4 mb-4 text-[14px] text-[#5FA37C]">
                                    <span className="font-medium">답변자: {answerAuthorName}</span>
                                    <span>답변일: {new Date(question.answered_at).toLocaleDateString('ko-KR')}</span>
                                </div>
                                <div 
                                    className="prose prose-lg max-w-none text-[16px] leading-relaxed text-gray-800"
                                    dangerouslySetInnerHTML={{ __html: question.answer_content }}
                                />
                            </div>
                        ) : (
                            <>
                                {!isAnswerMode ? (
                                    <div className="bg-[#F5F5F5] rounded-[12px] p-6 text-center">
                                        <p className="text-[#AFAFAF] text-[16px] mb-4">아직 답변이 등록되지 않았습니다.</p>
                                        {canAnswer && (
                                            <Button
                                                onClick={() => setIsAnswerMode(true)}
                                                className="bg-[#4E8C6D] hover:bg-[#5FA37C] text-white cursor-pointer"
                                            >
                                                답변 작성하기
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-[#F5F5F5] rounded-[12px] p-6 space-y-4">
                                        <TextEditor
                                            content={answerContent}
                                            onChange={setAnswerContent}
                                            placeholder="답변 내용을 입력해주세요. 이미지를 첨부할 수 있습니다."
                                        />
                                        <div className="flex justify-end gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setIsAnswerMode(false);
                                                    setAnswerContent('');
                                                }}
                                                className="border-[#CCCCCC] text-gray-600 hover:bg-gray-50 cursor-pointer"
                                            >
                                                취소
                                            </Button>
                                            <Button
                                                onClick={handleSubmitAnswer}
                                                disabled={isAnswering || !answerContent.trim()}
                                                className="bg-[#4E8C6D] hover:bg-[#5FA37C] text-white cursor-pointer"
                                            >
                                                {isAnswering ? '등록 중...' : '답변 등록'}
                                            </Button>
                                        </div>
                                        <div className="bg-[#FFF9E6] border border-[#F0AD4E] rounded-[8px] p-3">
                                            <p className="text-[12px] text-[#8B6914]">
                                                💡 답변이 등록되면 질문자에게 알림톡이 발송됩니다.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal />
            <AlertModal />
        </>
    );
};

export default QuestionDetailPage;

