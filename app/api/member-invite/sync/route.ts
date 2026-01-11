import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SyncMemberInvitesResult } from '@/app/_lib/shared/type/database.types';

/**
 * 조합원 초대 동기화 API
 * 엑셀 데이터를 기준으로 DB와 동기화
 * - 엑셀에 있고 DB에 없음 → INSERT
 * - DB에 있고 엑셀에 없음 (PENDING) → DELETE
 * - DB에 있고 엑셀에 없음 (USED) → users, user_auth_links, auth.users 삭제
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId, createdBy, expiresHours = 24, members } = body;

        // 필수 파라미터 검증
        if (!unionId || !createdBy || !members || !Array.isArray(members)) {
            return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }

        // Supabase Admin 클라이언트 생성 (Service Role Key 사용)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
            return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // RPC 함수 호출 - 동기화 수행
        const { data: syncResult, error: syncError } = await supabaseAdmin.rpc('sync_member_invites', {
            p_union_id: unionId,
            p_created_by: createdBy,
            p_expires_hours: expiresHours,
            p_members: members,
        });

        if (syncError) {
            console.error('Sync RPC error:', syncError);
            return NextResponse.json({ error: syncError.message || '동기화에 실패했습니다.' }, { status: 500 });
        }

        const result = syncResult as SyncMemberInvitesResult;

        // auth.users 삭제 처리 (Service Role Key 필요)
        if (result.deleted_auth_user_ids && result.deleted_auth_user_ids.length > 0) {
            console.log('Deleting auth users:', result.deleted_auth_user_ids);

            for (const authUserId of result.deleted_auth_user_ids) {
                try {
                    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
                    if (deleteAuthError) {
                        console.error(`Failed to delete auth user ${authUserId}:`, deleteAuthError);
                    }
                } catch (error) {
                    console.error(`Error deleting auth user ${authUserId}:`, error);
                }
            }
        }

        console.log('Sync completed:', {
            unionId,
            inserted: result.inserted,
            deleted_pending: result.deleted_pending,
            deleted_used: result.deleted_used,
            deleted_auth_users: result.deleted_auth_user_ids?.length || 0,
        });

        // 테스트용: 생성된 초대 URL들을 콘솔에 출력
        if ((result.inserted || 0) > 0) {
            // 새로 추가된 초대들 조회
            const { data: newInvites, error: fetchError } = await supabaseAdmin
                .from('member_invites')
                .select('id, name, phone_number, property_address, invite_token, expires_at')
                .eq('union_id', unionId)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false })
                .limit(result.inserted || 0);

            if (!fetchError && newInvites && newInvites.length > 0) {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

                console.log('\n' + '='.repeat(70));
                console.log('🔗 [조합원 초대] 초대 URL 목록이 생성되었습니다');
                console.log('='.repeat(70));
                console.log(`총 ${newInvites.length}명의 초대가 생성되었습니다.\n`);

                newInvites.forEach((invite, index) => {
                    const inviteUrl = `${baseUrl}/member-invite/${invite.invite_token}`;
                    console.log(`[${index + 1}] ${invite.name} (${invite.phone_number})`);
                    console.log(`    주소: ${invite.property_address}`);
                    console.log(`    만료: ${new Date(invite.expires_at).toLocaleString('ko-KR')}`);
                    console.log(`    📌 URL: ${inviteUrl}`);
                    console.log('-'.repeat(70));
                });

                console.log('='.repeat(70) + '\n');
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Sync API error:', error);
        return NextResponse.json({ error: '동기화 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
