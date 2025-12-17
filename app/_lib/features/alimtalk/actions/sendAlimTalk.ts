'use server';

import { createClient } from '@/app/_lib/shared/supabase/server';
import { SignJWT } from 'jose';

// ============================================================
// 공통 타입 정의
// ============================================================

interface SendAlimTalkParams {
    unionId: string;
    noticeId?: number;
    templateCode: string;
    templateName: string;
    title: string;
    content?: string;
    recipients: {
        phoneNumber: string;
        name: string;
        variables?: Record<string, string>;
    }[];
}

interface AdminInviteAlimTalkParams {
    unionId: string;
    unionName: string;
    adminName: string;
    phoneNumber: string;
    email: string;
    domain: string; // 도메인 (예: johapon.com)
    inviteToken: string; // 초대 토큰
    expiresAt: string;
}

interface MemberInviteAlimTalkParams {
    unionId: string;
    unionName: string;
    memberName: string;
    phoneNumber: string;
    propertyAddress: string;
    inviteUrl: string;
    expiresAt: string;
}

interface BulkMemberInviteAlimTalkParams {
    unionId: string;
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
    kakaoCount?: number;
    smsCount?: number;
    estimatedCost?: number;
    channelName?: string;
}

// 알림톡 프록시 서버 URL
const PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

// ============================================================
// JWT 토큰 생성 (프록시 서버 인증용)
// ============================================================

/**
 * 프록시 서버 인증을 위한 JWT 토큰 생성
 * @param unionId 조합 ID
 * @param userId 사용자 ID
 * @returns JWT 토큰 문자열
 */
async function generateProxyToken(unionId: string, userId: string): Promise<string> {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }

    const secret = new TextEncoder().encode(jwtSecret);

    return await new SignJWT({ unionId, userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m') // 5분 후 만료
        .sign(secret);
}

// ============================================================
// 프록시 서버 호출 헬퍼
// ============================================================

// 알림톡 버튼 인터페이스
interface AlimtalkButton {
    name: string;
    linkType: string; // WL: 웹링크, AL: 앱링크, DS: 배송조회, BK: 봇키워드, MD: 메시지전달
    linkTypeName: string; // 웹링크, 앱링크, 배송조회, 봇키워드, 메시지전달
    linkMo: string; // 모바일 웹 링크
    linkPc?: string; // PC 웹 링크
}

async function callProxyServer(payload: {
    unionId: string;
    senderId: string;
    templateCode: string;
    templateName: string;
    title: string;
    content?: string;
    noticeId?: number;
    recipients: {
        phoneNumber: string;
        name: string;
        variables?: Record<string, string>;
        failoverSubject?: string; // 대체 발송 제목 (LMS용)
        failoverMessage?: string; // 대체 발송 내용 (LMS용)
        content?: string; // 템플릿 메시지 내용 (변수 포함)
        buttons?: AlimtalkButton[]; // 버튼 정보
    }[];
}): Promise<AlimTalkResult> {
    try {
        // 동적 JWT 토큰 생성
        const token = await generateProxyToken(payload.unionId, payload.senderId);

        const response = await fetch(`${PROXY_URL}/api/alimtalk/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            return {
                success: false,
                error: result.error || '프록시 서버 호출 실패',
            };
        }

        return {
            success: true,
            message: '알림톡이 발송되었습니다.',
            sentCount: result.data.kakaoSuccessCount + result.data.smsSuccessCount,
            failCount: result.data.failCount,
            kakaoCount: result.data.kakaoSuccessCount,
            smsCount: result.data.smsSuccessCount,
            estimatedCost: result.data.estimatedCost,
            channelName: result.data.channelName,
        };
    } catch (error) {
        console.error('프록시 서버 호출 오류:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '알림톡 발송에 실패했습니다.',
        };
    }
}

// ============================================================
// 공지사항 알림톡 발송
// ============================================================

export async function sendAlimTalk(params: SendAlimTalkParams): Promise<AlimTalkResult> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    console.log('Attempting to send AlimTalk:', params);

    // 테스트 모드 체크 (환경 변수로 제어)
    const isTestMode = process.env.ALIMTALK_TEST_MODE === 'true';

    if (isTestMode) {
        console.log('\n' + '='.repeat(60));
        console.log('📱 [알림톡 발송 - 테스트 모드]');
        console.log('='.repeat(60));
        console.log('템플릿 코드:', params.templateCode);
        console.log('템플릿 이름:', params.templateName);
        console.log('제목:', params.title);
        console.log('수신자 수:', params.recipients.length);
        console.log('⚠️ 테스트 모드입니다. 실제 발송되지 않습니다.');
        console.log('='.repeat(60) + '\n');

        return {
            success: true,
            message: '알림톡 발송 (테스트 모드)',
            sentCount: params.recipients.length,
            failCount: 0,
            kakaoCount: params.recipients.length,
            smsCount: 0,
            estimatedCost: params.recipients.length * 15,
        };
    }

    // 프록시 서버 호출
    return callProxyServer({
        unionId: params.unionId,
        senderId: user.id,
        templateCode: params.templateCode,
        templateName: params.templateName,
        title: params.title,
        content: params.content,
        noticeId: params.noticeId,
        recipients: params.recipients,
    });
}

// ============================================================
// 관리자 초대 알림톡 발송
// ============================================================

export async function sendAdminInviteAlimTalk(params: AdminInviteAlimTalkParams): Promise<AlimTalkResult> {
    const { unionId, unionName, adminName, phoneNumber, email, domain, inviteToken, expiresAt } = params;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    // 초대 URL 생성
    const inviteUrl = `https://${domain}/invite/admin?token=${inviteToken}`;

    // 만료시간 포맷
    const formattedExpiresAt = new Date(expiresAt).toLocaleString('ko-KR');

    // 알림톡 템플릿 내용 (DB에 등록된 UE_1877 템플릿과 정확히 일치해야 함)
    // 변수: #{조합명}, #{이름}, #{만료시간}
    const templateContent = `[#{조합명}] 관리자 가입 안내\r\n\r\n#{이름}님, 안녕하세요. 요청하신 [#{조합명}]의 관리자 권한 등록을 위해 본인 확인이 필요합니다.\r\n\r\n아래 버튼을 눌러 계정 생성을 완료해 주세요. \r\n(본 메시지는 관리자 권한 신청에 따라 \r\n발송되었습니다.)\r\n\r\n※ 본 링크는 #{만료시간} 까지 유효합니다.`;

    // 버튼 정보 (템플릿에 등록된 버튼과 일치해야 함)
    // 변수: #{도메인}, #{초대토큰}
    const buttons: AlimtalkButton[] = [
        {
            name: '관리자 등록하기',
            linkType: 'WL',
            linkTypeName: '웹링크',
            linkMo: 'https://#{도메인}/invite/admin?token=#{초대토큰}',
            linkPc: '',
        },
    ];

    // 대체 발송 메시지 생성 (LMS)
    const failoverSubject = `[${unionName}] 관리자 등록 안내`;
    const failoverMessage = `[${unionName}] 관리자 가입 안내

${adminName}님, 안녕하세요. 요청하신 [${unionName}]의 관리자 권한 등록을 위해 본인 확인이 필요합니다.

아래 링크를 클릭하여 계정 생성을 완료해 주세요.
(본 메시지는 관리자 권한 신청에 따라 발송되었습니다.)

▶ 가입 링크: ${inviteUrl}

※ 본 링크는 ${formattedExpiresAt} 까지 유효합니다.`;

    // 테스트 모드 체크
    const isTestMode = process.env.ALIMTALK_TEST_MODE === 'true';

    if (isTestMode) {
        console.log('\n' + '='.repeat(60));
        console.log('📱 [알림톡 발송 예정] 관리자 초대 (UE_1877)');
        console.log('='.repeat(60));
        console.log('조합명:', unionName);
        console.log('수신자:', adminName);
        console.log('전화번호:', phoneNumber);
        console.log('이메일:', email);
        console.log('도메인:', domain);
        console.log('초대 토큰:', inviteToken);
        console.log('만료 시간:', formattedExpiresAt);
        console.log('-'.repeat(60));
        console.log('📝 초대 URL:', inviteUrl);
        console.log('📝 템플릿 내용:', templateContent);
        console.log('📝 버튼:', JSON.stringify(buttons, null, 2));
        console.log('-'.repeat(60));
        console.log('📝 대체 발송 메시지 (LMS):');
        console.log('제목:', failoverSubject);
        console.log('내용:', failoverMessage);
        console.log('-'.repeat(60));
        console.log('⚠️ 테스트 모드입니다. 실제 발송되지 않습니다.');
        console.log('='.repeat(60) + '\n');

        return {
            success: true,
            message: '알림톡 발송 (테스트 모드)',
            sentCount: 1,
            failCount: 0,
            kakaoCount: 1,
            smsCount: 0,
            estimatedCost: 15,
        };
    }

    // 프록시 서버 호출
    return callProxyServer({
        unionId,
        senderId: user.id,
        templateCode: 'UE_1877',
        templateName: '관리자 초대',
        title: `[${unionName}] 관리자 등록 안내`,
        recipients: [
            {
                phoneNumber,
                name: adminName,
                variables: {
                    조합명: unionName,
                    이름: adminName,
                    만료시간: formattedExpiresAt,
                    도메인: domain,
                    초대토큰: inviteToken,
                },
                content: templateContent,
                buttons,
                failoverSubject,
                failoverMessage,
            },
        ],
    });
}

// ============================================================
// 조합원 초대 알림톡 발송 (단건)
// ============================================================

export async function sendMemberInviteAlimTalk(params: MemberInviteAlimTalkParams): Promise<AlimTalkResult> {
    const { unionId, unionName, memberName, phoneNumber, propertyAddress, inviteUrl, expiresAt } = params;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    // 테스트 모드 체크
    const isTestMode = process.env.ALIMTALK_TEST_MODE === 'true';

    if (isTestMode) {
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
        console.log('⚠️ 테스트 모드입니다. 실제 발송되지 않습니다.');
        console.log('='.repeat(60) + '\n');

        return {
            success: true,
            message: '알림톡 발송 (테스트 모드)',
            sentCount: 1,
            failCount: 0,
            kakaoCount: 1,
            smsCount: 0,
            estimatedCost: 15,
        };
    }

    // 프록시 서버 호출
    return callProxyServer({
        unionId,
        senderId: user.id,
        templateCode: 'MEMBER_INVITE', // 템플릿 코드는 알리고에서 실제 등록된 코드로 변경 필요
        templateName: '조합원 초대',
        title: `[${unionName}] 조합원 가입 초대`,
        recipients: [
            {
                phoneNumber,
                name: memberName,
                variables: {
                    unionName,
                    memberName,
                    propertyAddress,
                    inviteUrl,
                    expiresAt: new Date(expiresAt).toLocaleString('ko-KR'),
                },
            },
        ],
    });
}

// ============================================================
// 조합원 초대 알림톡 일괄 발송
// ============================================================

export async function sendBulkMemberInviteAlimTalk(params: BulkMemberInviteAlimTalkParams): Promise<AlimTalkResult> {
    const { unionId, unionName, members } = params;

    if (members.length === 0) {
        return { success: false, error: '발송할 대상이 없습니다.' };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    // 테스트 모드 체크
    const isTestMode = process.env.ALIMTALK_TEST_MODE === 'true';

    if (isTestMode) {
        console.log('\n' + '='.repeat(70));
        console.log('📱 [알림톡 일괄 발송 예정] 조합원 초대');
        console.log('='.repeat(70));
        console.log('조합명:', unionName);
        console.log(`총 발송 대상: ${members.length}명`);
        console.log('-'.repeat(70));

        members.slice(0, 5).forEach((member, index) => {
            console.log(`[${index + 1}] ${member.name} (${member.phoneNumber})`);
            console.log(`    주소: ${member.propertyAddress}`);
        });

        if (members.length > 5) {
            console.log(`... 외 ${members.length - 5}명`);
        }

        console.log('-'.repeat(70));
        console.log('⚠️ 테스트 모드입니다. 실제 발송되지 않습니다.');
        console.log('='.repeat(70) + '\n');

        return {
            success: true,
            message: `알림톡 일괄 발송 (테스트 모드) - ${members.length}명 대상`,
            sentCount: members.length,
            failCount: 0,
            kakaoCount: members.length,
            smsCount: 0,
            estimatedCost: members.length * 15,
        };
    }

    // 수신자 목록 구성
    const recipients = members.map((member) => ({
        phoneNumber: member.phoneNumber,
        name: member.name,
        variables: {
            unionName,
            memberName: member.name,
            propertyAddress: member.propertyAddress,
            inviteUrl: member.inviteUrl,
            expiresAt: new Date(member.expiresAt).toLocaleString('ko-KR'),
        },
    }));

    // 프록시 서버 호출
    return callProxyServer({
        unionId,
        senderId: user.id,
        templateCode: 'MEMBER_INVITE_BULK', // 템플릿 코드는 알리고에서 실제 등록된 코드로 변경 필요
        templateName: '조합원 일괄 초대',
        title: `[${unionName}] 조합원 가입 초대`,
        recipients,
    });
}

// ============================================================
// 템플릿 동기화 함수
// ============================================================

export async function syncAlimtalkTemplates(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    data?: {
        totalFromAligo: number;
        inserted: number;
        updated: number;
        deleted: number;
        syncedAt: string;
    };
}> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: '인증되지 않은 사용자입니다.' };
        }

        // 시스템 관리자용 JWT 토큰 생성 (unionId는 'system'으로 설정)
        const token = await generateProxyToken('system', user.id);

        const response = await fetch(`${PROXY_URL}/api/alimtalk/sync-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            return {
                success: false,
                error: result.error || '템플릿 동기화 실패',
            };
        }

        return {
            success: true,
            message: '템플릿 동기화가 완료되었습니다.',
            data: result.data,
        };
    } catch (error) {
        console.error('템플릿 동기화 오류:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '템플릿 동기화에 실패했습니다.',
        };
    }
}
