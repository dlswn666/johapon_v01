// Supabase Edge Function: send-alimtalk
// 알리고 API를 통한 알림톡 발송 (고정 IP 지원)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// 타입 정의
interface SendAlimtalkRequest {
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
    }[];
}

interface AligoResponse {
    result_code: string;
    message: string;
    msg_id?: string;
    success_cnt?: number;
    error_cnt?: number;
    msg_type?: string; // AT: 알림톡, SM: SMS, LM: LMS
}

interface PricingInfo {
    message_type: string;
    unit_price: number;
}

// Supabase Admin 클라이언트 생성
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// 알리고 API 설정
const ALIGO_API_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/';
const ALIGO_API_KEY = Deno.env.get('ALIGO_API_KEY') || '';
const ALIGO_USER_ID = Deno.env.get('ALIGO_USER_ID') || '';
const DEFAULT_SENDER_KEY_NAME = 'JOHAPON_DEFAULT_SENDER_KEY';

// Vault에서 Sender Key 조회
async function getSenderKey(unionId: string): Promise<{ senderKey: string; channelName: string; isDefault: boolean }> {
    // 1. 조합별 Sender Key 조회 시도
    const { data: unionData, error: unionError } = await supabaseAdmin
        .from('unions')
        .select('kakao_channel_id, vault_sender_key_id')
        .eq('id', unionId)
        .single();

    if (!unionError && unionData?.vault_sender_key_id) {
        // Vault에서 조합별 Sender Key 복호화 조회
        const { data: secretData } = await supabaseAdmin
            .from('vault.decrypted_secrets')
            .select('decrypted_secret')
            .eq('id', unionData.vault_sender_key_id)
            .single();

        if (secretData?.decrypted_secret) {
            return {
                senderKey: secretData.decrypted_secret,
                channelName: unionData.kakao_channel_id || '조합온',
                isDefault: false,
            };
        }
    }

    // 2. 기본 Sender Key 사용 (Fallback)
    const { data: defaultSecret } = await supabaseAdmin
        .from('vault.decrypted_secrets')
        .select('decrypted_secret')
        .eq('name', DEFAULT_SENDER_KEY_NAME)
        .single();

    if (defaultSecret?.decrypted_secret) {
        return {
            senderKey: defaultSecret.decrypted_secret,
            channelName: '조합온',
            isDefault: true,
        };
    }

    // 3. 환경변수에서 기본 Sender Key 사용 (최종 Fallback)
    const envSenderKey = Deno.env.get('ALIGO_DEFAULT_SENDER_KEY') || '';
    return {
        senderKey: envSenderKey,
        channelName: '조합온',
        isDefault: true,
    };
}

// 현재 단가 조회
async function getCurrentPricing(): Promise<Map<string, number>> {
    const { data, error } = await supabaseAdmin.rpc('get_current_pricing');
    
    const pricingMap = new Map<string, number>();
    pricingMap.set('KAKAO', 15); // 기본값
    pricingMap.set('SMS', 20);
    pricingMap.set('LMS', 50);

    if (!error && data) {
        for (const item of data as PricingInfo[]) {
            pricingMap.set(item.message_type, item.unit_price);
        }
    }

    return pricingMap;
}

// 알리고 API 호출
async function callAligoApi(
    senderKey: string,
    templateCode: string,
    recipients: SendAlimtalkRequest['recipients']
): Promise<AligoResponse[]> {
    const responses: AligoResponse[] = [];

    // 알리고 API는 한 번에 최대 500명까지 발송 가능
    // 각 수신자별로 개별 발송 (변수 치환을 위해)
    for (const recipient of recipients) {
        const formData = new FormData();
        formData.append('apikey', ALIGO_API_KEY);
        formData.append('userid', ALIGO_USER_ID);
        formData.append('senderkey', senderKey);
        formData.append('tpl_code', templateCode);
        formData.append('sender', ''); // 발신번호 (알림톡은 필요없음)
        formData.append('receiver_1', recipient.phoneNumber.replace(/-/g, ''));
        formData.append('recvname_1', recipient.name);

        // 템플릿 변수 치환
        if (recipient.variables) {
            let message = ''; // 템플릿 내용은 알리고에서 자동 적용
            for (const [key, value] of Object.entries(recipient.variables)) {
                formData.append(`emtitle_1`, value); // 강조 표기 제목
            }
        }

        try {
            const response = await fetch(ALIGO_API_URL, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            responses.push({
                result_code: result.code?.toString() || '-1',
                message: result.message || 'Unknown error',
                msg_id: result.msg_id,
                success_cnt: result.success_cnt || 0,
                error_cnt: result.error_cnt || 0,
                msg_type: result.msg_type || 'AT',
            });
        } catch (error) {
            responses.push({
                result_code: '-1',
                message: error instanceof Error ? error.message : 'API call failed',
                success_cnt: 0,
                error_cnt: 1,
            });
        }
    }

    return responses;
}

// 비용 계산
function calculateCost(
    kakaoCount: number,
    smsCount: number,
    pricing: Map<string, number>
): number {
    const kakaoCost = kakaoCount * (pricing.get('KAKAO') || 15);
    const smsCost = smsCount * (pricing.get('SMS') || 20);
    return kakaoCost + smsCost;
}

// 메인 핸들러
Deno.serve(async (req: Request) => {
    // CORS 헤더
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: SendAlimtalkRequest = await req.json();
        const { unionId, senderId, templateCode, templateName, title, content, noticeId, recipients } = body;

        // 유효성 검사
        if (!unionId || !senderId || !templateCode || !recipients?.length) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 1. Sender Key 조회
        const { senderKey, channelName, isDefault } = await getSenderKey(unionId);

        if (!senderKey) {
            return new Response(
                JSON.stringify({ success: false, error: 'Sender key not found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. 현재 단가 조회
        const pricing = await getCurrentPricing();

        // 3. 알리고 API 호출
        const aligoResponses = await callAligoApi(senderKey, templateCode, recipients);

        // 4. 결과 집계
        let kakaoSuccessCount = 0;
        let smsSuccessCount = 0;
        let failCount = 0;

        for (const response of aligoResponses) {
            if (response.result_code === '0' || response.result_code === '1') {
                // 메시지 타입에 따라 카운트
                if (response.msg_type === 'AT') {
                    kakaoSuccessCount += response.success_cnt || 1;
                } else if (response.msg_type === 'SM' || response.msg_type === 'LM') {
                    smsSuccessCount += response.success_cnt || 1;
                } else {
                    kakaoSuccessCount += response.success_cnt || 1;
                }
            } else {
                failCount += response.error_cnt || 1;
            }
        }

        // 5. 비용 계산
        const estimatedCost = calculateCost(kakaoSuccessCount, smsSuccessCount, pricing);

        // 6. 로그 저장
        const logData = {
            sender_id: senderId,
            title: title,
            content: content || null,
            notice_id: noticeId || null,
            recipient_count: recipients.length,
            success_count: kakaoSuccessCount + smsSuccessCount,
            fail_count: failCount,
            cost_per_msg: pricing.get('KAKAO') || 15,
            // 확장 필드
            union_id: unionId,
            template_code: templateCode,
            template_name: templateName,
            sender_channel_name: channelName,
            kakao_success_count: kakaoSuccessCount,
            sms_success_count: smsSuccessCount,
            estimated_cost: estimatedCost,
            recipient_details: recipients,
            aligo_response: aligoResponses,
        };

        const { error: logError } = await supabaseAdmin
            .from('alimtalk_logs')
            .insert(logData);

        if (logError) {
            console.error('Failed to save log:', logError);
        }

        // 7. 응답 반환
        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    totalRecipients: recipients.length,
                    kakaoSuccessCount,
                    smsSuccessCount,
                    failCount,
                    estimatedCost,
                    channelName,
                    isDefaultChannel: isDefault,
                },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in send-alimtalk:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

