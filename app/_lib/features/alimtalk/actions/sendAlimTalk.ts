'use server';

import { createClient } from '@/app/_lib/shared/supabase/server';

interface SendAlimTalkParams {
    noticeId: number;
    title: string;
    content: string;
    // Add other necessary parameters like recipient list or union ID
}

export async function sendAlimTalk(params: SendAlimTalkParams) {
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
