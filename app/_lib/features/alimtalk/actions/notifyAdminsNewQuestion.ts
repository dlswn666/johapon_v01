'use server';

import { createClient } from '@supabase/supabase-js';
import { sendAlimTalk } from './sendAlimTalk';

/**
 * 질문 게시판 등록 시 관리자에게 알림톡 발송
 * - service_role 키를 사용하여 RLS 우회 (일반 사용자가 ADMIN 조회 불가능 문제 해결)
 */
export async function notifyAdminsNewQuestion(params: {
    unionId: string;
    authorName: string;
    questionTitle: string;
    questionId: number;
    createdAt: string;
    slug: string;
}) {
    const { unionId, authorName, questionTitle, questionId, createdAt, slug } = params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 관리자 조회 (service_role이므로 RLS 우회)
    const { data: admins } = await supabase
        .from('users')
        .select('phone_number, name')
        .eq('union_id', unionId)
        .in('role', ['ADMIN', 'SYSTEM_ADMIN'])
        .eq('user_status', 'APPROVED');

    // 전화번호가 있는 관리자만 필터링
    const validAdmins = (admins || []).filter((a) => a.phone_number);
    if (validAdmins.length === 0) return;

    const createdDate = new Date(createdAt);

    await sendAlimTalk({
        unionId,
        templateCode: 'UE_3236',
        recipients: validAdmins.map((admin) => ({
            phoneNumber: admin.phone_number,
            name: admin.name,
            variables: {
                게시판명: '질문하기',
                작성자명: authorName,
                글제목: questionTitle,
                등록일시: createdDate.toLocaleString('ko-KR'),
                조합슬러그: slug,
                질문ID: String(questionId),
            },
        })),
    });
}
