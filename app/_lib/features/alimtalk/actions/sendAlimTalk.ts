'use server';

import { createClient } from '@/app/_lib/shared/supabase/server';

// ============================================================
// 공통 타입 정의
// ============================================================

interface SendAlimTalkParams {
    noticeId: number;
    title: string;
    content: string;
    // Add other necessary parameters like recipient list or union ID
}

interface AdminInviteAlimTalkParams {
    unionName: string;
    adminName: string;
    phoneNumber: string;
    email: string;
    inviteUrl: string;
    expiresAt: string;
}

interface MemberInviteAlimTalkParams {
    unionName: string;
    memberName: string;
    phoneNumber: string;
    propertyAddress: string;
    inviteUrl: string;
    expiresAt: string;
}

interface BulkMemberInviteAlimTalkParams {
    unionName: string;
    members: {
        name: string;
        phoneNumber: string;
        propertyAddress: string;
        inviteUrl: string;
        expiresAt: string;
    }[];
}

interface AlimTalkResult {
    success: boolean;
    message?: string;
    error?: string;
    sentCount?: number;
    failCount?: number;
}

// ============================================================
// 공지사항 알림톡 발송 (기존 기능)
// ============================================================

export async function sendAlimTalk(params: SendAlimTalkParams): Promise<AlimTalkResult> {
    const supabase = await createClient();

    console.log('Attempting to send AlimTalk:', params);

    // TODO: Implement actual AlimTalk sending logic here.
    // 1. Fetch recipients (e.g., all union members)
    // 2. Call external AlimTalk provider API (e.g., Kakao, BizMsg)
    // 3. Log result to `alimtalk_logs` table

    try {
        // Mock success for now
        const { error } = await supabase.from('alimtalk_logs').insert({
            notice_id: params.noticeId,
            title: params.title,
            content: params.content,
            sender_id: 'system', // Replace with actual sender ID if available
            recipient_count: 0,
            success_count: 0,
            fail_count: 0,
            cost_per_msg: 0,
            sent_at: new Date().toISOString(),
        });

        if (error) {
            console.error('Failed to log AlimTalk attempt:', error);
            return { success: false, error: error.message };
        }

        return { success: true, message: 'AlimTalk sent (mock)' };
    } catch (error) {
        console.error('Error sending AlimTalk:', error);
        return { success: false, error: 'Internal Server Error' };
    }
}

// ============================================================
// 관리자 초대 알림톡 발송
// ============================================================

/**
 * 관리자 초대 알림톡 발송
 * 
 * @param params - 관리자 초대 정보
 * @returns 발송 결과
 * 
 * @example
 * const result = await sendAdminInviteAlimTalk({
 *     unionName: '행복조합',
 *     adminName: '홍길동',
 *     phoneNumber: '010-1234-5678',
 *     email: 'admin@example.com',
 *     inviteUrl: 'https://example.com/invite/abc123',
 *     expiresAt: '2024-12-15T12:00:00Z'
 * });
 */
export async function sendAdminInviteAlimTalk(params: AdminInviteAlimTalkParams): Promise<AlimTalkResult> {
    const { unionName, adminName, phoneNumber, email, inviteUrl, expiresAt } = params;

    // 테스트용: 발송 예정 정보를 콘솔에 출력
    console.log('\n' + '='.repeat(60));
    console.log('📱 [알림톡 발송 예정] 관리자 초대');
    console.log('='.repeat(60));
    console.log('조합명:', unionName);
    console.log('수신자:', adminName);
    console.log('전화번호:', phoneNumber);
    console.log('이메일:', email);
    console.log('만료 시간:', new Date(expiresAt).toLocaleString('ko-KR'));
    console.log('-'.repeat(60));
    console.log('📝 메시지 내용 (예시):');
    console.log(`[${unionName}] 관리자 초대`);
    console.log(`${adminName}님, ${unionName} 조합의 관리자로 초대되었습니다.`);
    console.log(`아래 링크를 통해 가입을 완료해 주세요.`);
    console.log(`${inviteUrl}`);
    console.log('-'.repeat(60));
    console.log('⚠️ 알림톡은 현재 비활성화 상태입니다. (테스트 모드)');
    console.log('='.repeat(60) + '\n');

    /*
    // ============================================================
    // TODO: 실제 알림톡 발송 로직 (추후 활성화)
    // ============================================================
    
    try {
        // 1. 알림톡 템플릿 메시지 구성
        const templateCode = 'ADMIN_INVITE'; // 카카오 비즈메시지 템플릿 코드
        const message = {
            to: phoneNumber.replace(/-/g, ''), // 하이픈 제거
            templateCode,
            templateParams: {
                unionName,
                adminName,
                inviteUrl,
                expiresAt: new Date(expiresAt).toLocaleString('ko-KR'),
            },
        };

        // 2. 알림톡 API 호출 (예: Kakao BizMsg, NHN Cloud 등)
        // const response = await fetch('https://alimtalk-api.example.com/send', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${process.env.ALIMTALK_API_KEY}`,
        //     },
        //     body: JSON.stringify(message),
        // });
        // 
        // if (!response.ok) {
        //     throw new Error('알림톡 발송 실패');
        // }

        // 3. 발송 로그 저장
        const supabase = await createClient();
        await supabase.from('alimtalk_logs').insert({
            type: 'ADMIN_INVITE',
            recipient_phone: phoneNumber,
            recipient_name: adminName,
            template_code: templateCode,
            status: 'SENT',
            sent_at: new Date().toISOString(),
        });

        return { success: true, message: '알림톡이 발송되었습니다.' };
    } catch (error) {
        console.error('알림톡 발송 오류:', error);
        return { success: false, error: '알림톡 발송에 실패했습니다.' };
    }
    */

    // 테스트 모드: 항상 성공 반환
    return { 
        success: true, 
        message: '알림톡 발송 (테스트 모드 - 실제 발송되지 않음)' 
    };
}

// ============================================================
// 조합원 초대 알림톡 발송 (단건)
// ============================================================

/**
 * 조합원 초대 알림톡 발송 (단건)
 * 
 * @param params - 조합원 초대 정보
 * @returns 발송 결과
 * 
 * @example
 * const result = await sendMemberInviteAlimTalk({
 *     unionName: '행복조합',
 *     memberName: '김철수',
 *     phoneNumber: '010-9876-5432',
 *     propertyAddress: '서울시 강남구 역삼동 123-45',
 *     inviteUrl: 'https://example.com/member-invite/xyz789',
 *     expiresAt: '2025-12-14T12:00:00Z'
 * });
 */
export async function sendMemberInviteAlimTalk(params: MemberInviteAlimTalkParams): Promise<AlimTalkResult> {
    const { unionName, memberName, phoneNumber, propertyAddress, inviteUrl, expiresAt } = params;

    // 테스트용: 발송 예정 정보를 콘솔에 출력
    console.log('\n' + '='.repeat(60));
    console.log('📱 [알림톡 발송 예정] 조합원 초대');
    console.log('='.repeat(60));
    console.log('조합명:', unionName);
    console.log('수신자:', memberName);
    console.log('전화번호:', phoneNumber);
    console.log('물건지 주소:', propertyAddress);
    console.log('만료 시간:', new Date(expiresAt).toLocaleString('ko-KR'));
    console.log('-'.repeat(60));
    console.log('📝 메시지 내용 (예시):');
    console.log(`[${unionName}] 조합원 가입 초대`);
    console.log(`${memberName}님, ${unionName} 조합의 예비 조합원으로 초대되었습니다.`);
    console.log(`물건지: ${propertyAddress}`);
    console.log(`아래 링크를 통해 가입을 완료해 주세요.`);
    console.log(`${inviteUrl}`);
    console.log('-'.repeat(60));
    console.log('⚠️ 알림톡은 현재 비활성화 상태입니다. (테스트 모드)');
    console.log('='.repeat(60) + '\n');

    /*
    // ============================================================
    // TODO: 실제 알림톡 발송 로직 (추후 활성화)
    // ============================================================
    
    try {
        // 1. 알림톡 템플릿 메시지 구성
        const templateCode = 'MEMBER_INVITE'; // 카카오 비즈메시지 템플릿 코드
        const message = {
            to: phoneNumber.replace(/-/g, ''), // 하이픈 제거
            templateCode,
            templateParams: {
                unionName,
                memberName,
                propertyAddress,
                inviteUrl,
                expiresAt: new Date(expiresAt).toLocaleString('ko-KR'),
            },
        };

        // 2. 알림톡 API 호출
        // const response = await fetch('https://alimtalk-api.example.com/send', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${process.env.ALIMTALK_API_KEY}`,
        //     },
        //     body: JSON.stringify(message),
        // });
        // 
        // if (!response.ok) {
        //     throw new Error('알림톡 발송 실패');
        // }

        // 3. 발송 로그 저장
        const supabase = await createClient();
        await supabase.from('alimtalk_logs').insert({
            type: 'MEMBER_INVITE',
            recipient_phone: phoneNumber,
            recipient_name: memberName,
            template_code: templateCode,
            status: 'SENT',
            sent_at: new Date().toISOString(),
        });

        return { success: true, message: '알림톡이 발송되었습니다.' };
    } catch (error) {
        console.error('알림톡 발송 오류:', error);
        return { success: false, error: '알림톡 발송에 실패했습니다.' };
    }
    */

    // 테스트 모드: 항상 성공 반환
    return { 
        success: true, 
        message: '알림톡 발송 (테스트 모드 - 실제 발송되지 않음)' 
    };
}

// ============================================================
// 조합원 초대 알림톡 일괄 발송
// ============================================================

/**
 * 조합원 초대 알림톡 일괄 발송
 * 
 * @param params - 일괄 발송할 조합원 초대 정보
 * @returns 발송 결과
 * 
 * @example
 * const result = await sendBulkMemberInviteAlimTalk({
 *     unionName: '행복조합',
 *     members: [
 *         { name: '김철수', phoneNumber: '010-1234-5678', propertyAddress: '...', inviteUrl: '...', expiresAt: '...' },
 *         { name: '이영희', phoneNumber: '010-9876-5432', propertyAddress: '...', inviteUrl: '...', expiresAt: '...' },
 *     ]
 * });
 */
export async function sendBulkMemberInviteAlimTalk(params: BulkMemberInviteAlimTalkParams): Promise<AlimTalkResult> {
    const { unionName, members } = params;

    if (members.length === 0) {
        return { success: false, error: '발송할 대상이 없습니다.' };
    }

    // 테스트용: 발송 예정 정보를 콘솔에 출력
    console.log('\n' + '='.repeat(70));
    console.log('📱 [알림톡 일괄 발송 예정] 조합원 초대');
    console.log('='.repeat(70));
    console.log('조합명:', unionName);
    console.log(`총 발송 대상: ${members.length}명`);
    console.log('-'.repeat(70));
    
    members.forEach((member, index) => {
        console.log(`[${index + 1}] ${member.name} (${member.phoneNumber})`);
        console.log(`    주소: ${member.propertyAddress}`);
        console.log(`    URL: ${member.inviteUrl}`);
    });
    
    console.log('-'.repeat(70));
    console.log('⚠️ 알림톡은 현재 비활성화 상태입니다. (테스트 모드)');
    console.log('='.repeat(70) + '\n');

    /*
    // ============================================================
    // TODO: 실제 알림톡 일괄 발송 로직 (추후 활성화)
    // ============================================================
    
    let sentCount = 0;
    let failCount = 0;
    const supabase = await createClient();

    for (const member of members) {
        try {
            // 1. 알림톡 템플릿 메시지 구성
            const templateCode = 'MEMBER_INVITE';
            const message = {
                to: member.phoneNumber.replace(/-/g, ''),
                templateCode,
                templateParams: {
                    unionName,
                    memberName: member.name,
                    propertyAddress: member.propertyAddress,
                    inviteUrl: member.inviteUrl,
                    expiresAt: new Date(member.expiresAt).toLocaleString('ko-KR'),
                },
            };

            // 2. 알림톡 API 호출
            // const response = await fetch('https://alimtalk-api.example.com/send', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${process.env.ALIMTALK_API_KEY}`,
            //     },
            //     body: JSON.stringify(message),
            // });
            // 
            // if (response.ok) {
            //     sentCount++;
            // } else {
            //     failCount++;
            // }

            // 3. 발송 로그 저장
            await supabase.from('alimtalk_logs').insert({
                type: 'MEMBER_INVITE_BULK',
                recipient_phone: member.phoneNumber,
                recipient_name: member.name,
                template_code: templateCode,
                status: 'SENT',
                sent_at: new Date().toISOString(),
            });

            sentCount++;
        } catch (error) {
            console.error(`알림톡 발송 실패 (${member.name}):`, error);
            failCount++;
        }
    }

    return {
        success: failCount === 0,
        message: `총 ${members.length}명 중 ${sentCount}명 발송 성공, ${failCount}명 실패`,
        sentCount,
        failCount,
    };
    */

    // 테스트 모드: 모두 성공으로 반환
    return { 
        success: true, 
        message: `알림톡 일괄 발송 (테스트 모드 - 실제 발송되지 않음) - ${members.length}명 대상`,
        sentCount: members.length,
        failCount: 0,
    };
}
