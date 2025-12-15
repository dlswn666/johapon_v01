// Supabase Edge Function: sync-templates
// 알리고 API에서 템플릿 목록을 가져와 DB에 동기화

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// 타입 정의
interface AligoTemplate {
    templtCode: string;
    templtName: string;
    templtContent: string;
    templateType: string;
    templateEmType: string;
    templateExtra: string;
    templateAd: string;
    status: string;
    inspStatus: string;
    buttons?: Array<{
        ordering: number;
        name: string;
        linkType: string;
        linkTypeName: string;
        linkMo?: string;
        linkPc?: string;
        linkIos?: string;
        linkAnd?: string;
    }>;
}

interface AligoTemplateListResponse {
    code: string;
    message: string;
    list?: AligoTemplate[];
}

// Supabase Admin 클라이언트 생성
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// 알리고 API 설정
const ALIGO_TEMPLATE_LIST_URL = 'https://kakaoapi.aligo.in/akv10/template/list/';
const ALIGO_API_KEY = Deno.env.get('ALIGO_API_KEY') || '';
const ALIGO_USER_ID = Deno.env.get('ALIGO_USER_ID') || '';

// Vault에서 기본 Sender Key 조회
async function getDefaultSenderKey(): Promise<string> {
    const { data: defaultSecret } = await supabaseAdmin
        .from('vault.decrypted_secrets')
        .select('decrypted_secret')
        .eq('name', 'JOHAPON_DEFAULT_SENDER_KEY')
        .single();

    if (defaultSecret?.decrypted_secret) {
        return defaultSecret.decrypted_secret;
    }

    // 환경변수에서 가져오기
    return Deno.env.get('ALIGO_DEFAULT_SENDER_KEY') || '';
}

// 알리고 템플릿 목록 조회
async function fetchAligoTemplates(senderKey: string): Promise<AligoTemplate[]> {
    const formData = new FormData();
    formData.append('apikey', ALIGO_API_KEY);
    formData.append('userid', ALIGO_USER_ID);
    formData.append('senderkey', senderKey);

    const response = await fetch(ALIGO_TEMPLATE_LIST_URL, {
        method: 'POST',
        body: formData,
    });

    const result: AligoTemplateListResponse = await response.json();

    if (result.code !== '0' && result.code !== '1') {
        throw new Error(`Aligo API error: ${result.message}`);
    }

    return result.list || [];
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
        // 1. Sender Key 조회
        const senderKey = await getDefaultSenderKey();

        if (!senderKey) {
            return new Response(
                JSON.stringify({ success: false, error: 'Sender key not found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. 알리고에서 템플릿 목록 조회
        const aligoTemplates = await fetchAligoTemplates(senderKey);

        // 3. 알리고 템플릿 코드 목록
        const aligoTemplateCodes = new Set(aligoTemplates.map(t => t.templtCode));

        // 4. 기존 DB 템플릿 코드 조회
        const { data: existingTemplates } = await supabaseAdmin
            .from('alimtalk_templates')
            .select('template_code');

        const existingCodes = new Set(
            (existingTemplates || []).map((t: { template_code: string }) => t.template_code)
        );

        // 5. 알리고에 없는 템플릿 삭제 (DB에만 있는 것)
        const codesToDelete = [...existingCodes].filter(code => !aligoTemplateCodes.has(code));
        
        if (codesToDelete.length > 0) {
            const { error: deleteError } = await supabaseAdmin
                .from('alimtalk_templates')
                .delete()
                .in('template_code', codesToDelete);

            if (deleteError) {
                console.error('Failed to delete templates:', deleteError);
            }
        }

        // 6. 템플릿 UPSERT (삽입 또는 업데이트)
        const now = new Date().toISOString();
        const templatesData = aligoTemplates.map(template => ({
            template_code: template.templtCode,
            template_name: template.templtName,
            template_content: template.templtContent,
            status: template.status,
            insp_status: template.inspStatus,
            buttons: template.buttons || null,
            synced_at: now,
        }));

        let insertedCount = 0;
        let updatedCount = 0;

        for (const template of templatesData) {
            const { data, error } = await supabaseAdmin
                .from('alimtalk_templates')
                .upsert(template, {
                    onConflict: 'template_code',
                })
                .select();

            if (!error) {
                if (existingCodes.has(template.template_code)) {
                    updatedCount++;
                } else {
                    insertedCount++;
                }
            }
        }

        // 7. 응답 반환
        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    totalFromAligo: aligoTemplates.length,
                    inserted: insertedCount,
                    updated: updatedCount,
                    deleted: codesToDelete.length,
                    syncedAt: now,
                },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in sync-templates:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

