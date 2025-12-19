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
    domain: string; // 도메인 (예: johapon.kr)
    inviteToken: string;
    expiresAt: string;
}

interface BulkMemberInviteAlimTalkParams {
    unionId: string;
    unionName: string;
    domain: string; // 도메인 (예: johapon.kr)
    members: {
        name: string;
        phoneNumber: string;
        inviteToken: string;
        expiresAt: string;
    }[];
}

interface BulkSendProgress {
    totalBatches: number;
    completedBatches: number;
    totalRecipients: number;
    sentCount: number;
    failCount: number;
    kakaoCount: number;
    smsCount: number;
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
        emtitle?: string; // 강조표기형 알림톡 서브타이틀
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
    // 참고: 강조표기형 서브타이틀(emtitle)은 서버에서 템플릿 정보를 조회하여 자동 적용됨
    const templateContent = `[#{조합명}] 관리자 가입 안내\r\n\r\n#{이름}님, 안녕하세요. 요청하신 [#{조합명}]의 관리자 권한 등록을 위해 본인 확인이 필요합니다.\r\n\r\n아래 버튼을 눌러 계정 생성을 완료해 주세요. \r\n(본 메시지는 관리자 권한 신청에 따라 \r\n발송되었습니다.)\r\n\r\n※ 본 링크는 #{만료시간} 까지 유효합니다.`;

    // 버튼 정보 (템플릿에 등록된 버튼과 일치해야 함)
    // 변수: #{도메인}, #{초대토큰}
    // 참고: 버튼 정보가 없으면 서버에서 템플릿의 버튼 정보를 사용
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
        console.log('📝 서브타이틀 (emtitle): 서버에서 템플릿 정보로 자동 적용');
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
    // 참고: emtitle(강조표기형 서브타이틀)은 서버에서 템플릿 정보(template_em_type, template_title)를 조회하여 자동 적용
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
// 조합원 초대 알림톡 발송 (단건) - UE_1876 템플릿 사용
// ============================================================

export async function sendMemberInviteAlimTalk(params: MemberInviteAlimTalkParams): Promise<AlimTalkResult> {
    const { unionId, unionName, memberName, phoneNumber, domain, inviteToken, expiresAt } = params;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    // 만료시간 포맷
    const formattedExpiresAt = new Date(expiresAt).toLocaleString('ko-KR');

    // 초대 URL 생성
    const inviteUrl = `https://${domain}/member-invite/${inviteToken}`;

    // 알림톡 템플릿 내용 (UE_1876 템플릿과 정확히 일치해야 함)
    // 변수: #{조합명}, #{이름}, #{만료시간}, #{도메인}, #{초대토큰}
    const templateContent = `[#{조합명}] 조합원 본인 확인 안내\r\n\r\n#{이름}님, 안녕하세요.\r\n#{조합명} 홈페이지를 통해 요청하신 소유주 본인 확인 및 정보 등록 인증 메시지입니다.\r\n\r\n아래 버튼을 눌러 본인 인증 및 가입 절차를 완료해 주세요.\r\n\r\n[인증 안내]\r\n* 본 메시지는 고객님의 본인 인증 요청에 따라 발송되었습니다.\r\n* 타인의 요청이거나 본인이 요청하지 않은 경우 무시하시기 바랍니다.\r\n\r\n유효 시간: #{만료시간} 까지`;

    // 버튼 정보 (UE_1876 템플릿)
    const buttons: AlimtalkButton[] = [
        {
            name: '가입하기',
            linkType: 'WL',
            linkTypeName: '웹링크',
            linkMo: 'https://#{도메인}/member-invite/#{초대토큰}',
            linkPc: '',
        },
    ];

    // 대체 발송 메시지 생성 (LMS)
    const failoverSubject = `[${unionName}] 조합원 본인 확인 안내`;
    const failoverMessage = `[${unionName}] 조합원 본인 확인 안내

${memberName}님, 안녕하세요.
${unionName} 홈페이지를 통해 요청하신 소유주 본인 확인 및 정보 등록 인증 메시지입니다.

아래 링크를 통해 본인 인증 및 가입 절차를 완료해 주세요.

▶ 가입 링크: ${inviteUrl}

[인증 안내]
* 본 메시지는 고객님의 본인 인증 요청에 따라 발송되었습니다.
* 타인의 요청이거나 본인이 요청하지 않은 경우 무시하시기 바랍니다.

유효 시간: ${formattedExpiresAt} 까지`;

    // 테스트 모드 체크
    const isTestMode = process.env.ALIMTALK_TEST_MODE === 'true';

    if (isTestMode) {
        console.log('\n' + '='.repeat(60));
        console.log('📱 [알림톡 발송 예정] 조합원 본인 확인 안내 (UE_1876)');
        console.log('='.repeat(60));
        console.log('조합명:', unionName);
        console.log('수신자:', memberName);
        console.log('전화번호:', phoneNumber);
        console.log('도메인:', domain);
        console.log('초대 토큰:', inviteToken.substring(0, 20) + '...');
        console.log('만료 시간:', formattedExpiresAt);
        console.log('-'.repeat(60));
        console.log('📝 템플릿 내용:', templateContent);
        console.log('📝 초대 URL:', inviteUrl);
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
        templateCode: 'UE_1876',
        templateName: '조합원 본인 확인 안내',
        title: `[${unionName}] 조합원 본인 확인 안내`,
        recipients: [
            {
                phoneNumber,
                name: memberName,
                variables: {
                    조합명: unionName,
                    이름: memberName,
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
// 조합원 초대 알림톡 일괄 발송 (UE_1876 템플릿 사용, 500건씩 배치 처리)
// ============================================================

const BATCH_SIZE = 500; // 배치당 최대 발송 건수

export async function sendBulkMemberInviteAlimTalk(
    params: BulkMemberInviteAlimTalkParams,
    onProgress?: (progress: BulkSendProgress) => void
): Promise<AlimTalkResult> {
    const { unionId, unionName, domain, members } = params;

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
        console.log('📱 [알림톡 일괄 발송 예정] 조합원 본인 확인 안내 (UE_1876)');
        console.log('='.repeat(70));
        console.log('조합명:', unionName);
        console.log('도메인:', domain);
        console.log(`총 발송 대상: ${members.length}명`);
        console.log(`배치 수: ${Math.ceil(members.length / BATCH_SIZE)}개 (${BATCH_SIZE}건씩)`);
        console.log('-'.repeat(70));

        members.slice(0, 5).forEach((member, index) => {
            console.log(`[${index + 1}] ${member.name} (${member.phoneNumber})`);
            console.log(`    토큰: ${member.inviteToken.substring(0, 20)}...`);
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

    // 500건씩 배치로 분리
    const batches: typeof members[] = [];
    for (let i = 0; i < members.length; i += BATCH_SIZE) {
        batches.push(members.slice(i, i + BATCH_SIZE));
    }

    console.log(`알림톡 일괄 발송 시작: 총 ${members.length}명, ${batches.length}개 배치`);

    // 결과 집계
    let totalSentCount = 0;
    let totalFailCount = 0;
    let totalKakaoCount = 0;
    let totalSmsCount = 0;
    let totalEstimatedCost = 0;

    // 배치별 순차 발송
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`배치 ${batchIndex + 1}/${batches.length} 발송 중... (${batch.length}명)`);

        // UE_1876 템플릿에 맞게 수신자 목록 구성
        // 템플릿 변수: #{조합명}, #{이름}, #{만료시간}, #{도메인}, #{초대토큰}
        const templateContent = `[#{조합명}] 조합원 본인 확인 안내\r\n\r\n#{이름}님, 안녕하세요.\r\n#{조합명} 홈페이지를 통해 요청하신 소유주 본인 확인 및 정보 등록 인증 메시지입니다.\r\n\r\n아래 버튼을 눌러 본인 인증 및 가입 절차를 완료해 주세요.\r\n\r\n[인증 안내]\r\n* 본 메시지는 고객님의 본인 인증 요청에 따라 발송되었습니다.\r\n* 타인의 요청이거나 본인이 요청하지 않은 경우 무시하시기 바랍니다.\r\n\r\n유효 시간: #{만료시간} 까지`;

        // 버튼 정보 (UE_1876 템플릿)
        const buttons: AlimtalkButton[] = [
            {
                name: '가입하기',
                linkType: 'WL',
                linkTypeName: '웹링크',
                linkMo: 'https://#{도메인}/member-invite/#{초대토큰}',
                linkPc: '',
            },
        ];

        const recipients = batch.map((member) => {
            const formattedExpiresAt = new Date(member.expiresAt).toLocaleString('ko-KR');
            
            // 대체 발송 메시지 (LMS)
            const failoverSubject = `[${unionName}] 조합원 본인 확인 안내`;
            const failoverMessage = `[${unionName}] 조합원 본인 확인 안내

${member.name}님, 안녕하세요.
${unionName} 홈페이지를 통해 요청하신 소유주 본인 확인 및 정보 등록 인증 메시지입니다.

아래 링크를 통해 본인 인증 및 가입 절차를 완료해 주세요.

▶ 가입 링크: https://${domain}/member-invite/${member.inviteToken}

[인증 안내]
* 본 메시지는 고객님의 본인 인증 요청에 따라 발송되었습니다.
* 타인의 요청이거나 본인이 요청하지 않은 경우 무시하시기 바랍니다.

유효 시간: ${formattedExpiresAt} 까지`;

            return {
                phoneNumber: member.phoneNumber,
                name: member.name,
                variables: {
                    조합명: unionName,
                    이름: member.name,
                    만료시간: formattedExpiresAt,
                    도메인: domain,
                    초대토큰: member.inviteToken,
                },
                content: templateContent,
                buttons,
                failoverSubject,
                failoverMessage,
            };
        });

        // 프록시 서버 호출
        const result = await callProxyServer({
            unionId,
            senderId: user.id,
            templateCode: 'UE_1876',
            templateName: '조합원 본인 확인 안내',
            title: `[${unionName}] 조합원 본인 확인 안내`,
            recipients,
        });

        // 결과 집계
        if (result.success) {
            totalSentCount += result.sentCount || 0;
            totalFailCount += result.failCount || 0;
            totalKakaoCount += result.kakaoCount || 0;
            totalSmsCount += result.smsCount || 0;
            totalEstimatedCost += result.estimatedCost || 0;
        } else {
            // 배치 실패 시 해당 배치 전체를 실패로 카운트
            totalFailCount += batch.length;
            console.error(`배치 ${batchIndex + 1} 발송 실패:`, result.error);
        }

        // 진행 상황 콜백
        if (onProgress) {
            onProgress({
                totalBatches: batches.length,
                completedBatches: batchIndex + 1,
                totalRecipients: members.length,
                sentCount: totalSentCount,
                failCount: totalFailCount,
                kakaoCount: totalKakaoCount,
                smsCount: totalSmsCount,
            });
        }

        // 배치 간 딜레이 (API 과부하 방지)
        if (batchIndex < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
        }
    }

    console.log(`알림톡 일괄 발송 완료: 성공 ${totalSentCount}, 실패 ${totalFailCount}, 비용 ${totalEstimatedCost}원`);

    return {
        success: totalSentCount > 0,
        message: `알림톡 일괄 발송 완료 - 성공: ${totalSentCount}명, 실패: ${totalFailCount}명`,
        sentCount: totalSentCount,
        failCount: totalFailCount,
        kakaoCount: totalKakaoCount,
        smsCount: totalSmsCount,
        estimatedCost: totalEstimatedCost,
        channelName: '조합온',
    };
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
