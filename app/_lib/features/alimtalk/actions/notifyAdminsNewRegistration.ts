'use server';

import { createClient } from '@supabase/supabase-js';
import { sendAlimTalk } from './sendAlimTalk';

/**
 * 신규 조합원 가입 시 관리자에게 알림톡 발송
 * - service_role 키를 사용하여 RLS 우회 (APPLICANT가 ADMIN 조회 불가능 문제 해결)
 */
export async function notifyAdminsNewRegistration(params: {
    unionId: string;
    applicantName: string;
    slug: string;
}) {
    const { unionId, applicantName, slug } = params;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 관리자 조회 (service_role이므로 RLS 우회)
    const { data: admins } = await supabase
        .from('users')
        .select('phone_number, name')
        .eq('union_id', unionId)
        .eq('role', 'ADMIN')
        .eq('user_status', 'APPROVED');

    // 전화번호가 있는 관리자만 필터링
    const validAdmins = (admins || []).filter((a) => a.phone_number);
    if (validAdmins.length === 0) return;

    // 조합명 조회
    const { data: unionData } = await supabase
        .from('unions')
        .select('name')
        .eq('id', unionId)
        .single();

    await sendAlimTalk({
        unionId,
        templateCode: 'UE_3805',
        recipients: validAdmins.map((admin) => ({
            phoneNumber: admin.phone_number,
            name: admin.name,
            variables: {
                조합명: unionData?.name || '',
                신청자명: applicantName,
                신청일시: new Date().toLocaleString('ko-KR'),
                조합슬러그: slug || '',
            },
        })),
    });
}
