import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SyncMemberInvitesResult } from '@/app/_lib/shared/type/database.types';
import { authenticateApiRequest, AuthResult } from '@/app/_lib/shared/api/auth';

/**
 * 조합원 초대 동기화 API
 * 엑셀 데이터를 기준으로 DB와 동기화
 * - 엑셀에 있고 DB에 없음 → INSERT
 * - DB에 있고 엑셀에 없음 (PENDING) → DELETE
 * - DB에 있고 엑셀에 없음 (USED) → users, user_auth_links, auth.users 삭제
 *
 * TASK-S002: auth.users 삭제 트랜잭션 안전화 (부분 실패 추적, 재시도 가능)
 */
export async function POST(request: NextRequest) {
    const batchId = crypto.randomUUID();
    const startTime = Date.now();
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 초기화: catch 블록에서 사용 가능하도록
    let auth: AuthResult | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseAdmin: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = null;

    try {
        body = await request.json();
        const { unionId, expiresHours = 24, members } = body;

        // ========== SECURITY: 인증 검사 ==========
        auth = await authenticateApiRequest({
            requireAdmin: true,
            requireUnionId: true,
            unionId: unionId,
        });

        if (!auth.authenticated) {
            return auth.response;
        }

        // createdBy를 인증된 사용자로 강제 설정 (위조 방지)
        const createdBy = auth.user.id;

        console.log(`[Member Invite Sync] Batch ${batchId} - User ${auth.user.id} (${auth.user.name}) syncing ${members.length} member invites`);
        // ==========================================

        // 필수 파라미터 검증
        if (!unionId || !members || !Array.isArray(members)) {
            return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }

        // Supabase Admin 클라이언트 생성 (Service Role Key 사용)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
            return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 });
        }

        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // ✅ TASK-S004: 시작 로그 기록
        await supabaseAdmin.from('member_access_logs').insert({
            union_id: unionId,
            user_id: createdBy,
            action: 'BULK_INVITE_START',
            action_type: 'WRITE',
            batch_id: batchId,
            metadata: {
                total_count: members.length,
                expires_hours: expiresHours
            },
            ip_address: clientIp,
            user_agent: userAgent,
            status: 'IN_PROGRESS'
        }).catch((err: unknown) => {
            console.error('[감사 로그 기록 오류] START:', err);
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

            // ✅ TASK-S004: 실패 로그 기록
            const durationMs = Date.now() - startTime;
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: unionId,
                user_id: createdBy,
                action: 'BULK_INVITE_FAILED',
                action_type: 'WRITE',
                batch_id: batchId,
                metadata: {
                    error_message: syncError.message,
                    error_type: 'RPC_ERROR'
                },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: durationMs
            }).catch((err: unknown) => {
                console.error('[감사 로그 기록 오류] FAILED:', err);
            });

            return NextResponse.json(
                { error: syncError.message || '동기화에 실패했습니다.', batchId },
                { status: 500 }
            );
        }

        const result = syncResult as SyncMemberInvitesResult;

        // ✅ TASK-S002: auth.users 삭제 트랜잭션 안전화
        // 상태 추적 변수: 성공/실패 분리
        const deletedAuthUserIds: string[] = [];
        const failedAuthUserIds: { userId: string; error: string }[] = [];

        if (result.deleted_auth_user_ids && result.deleted_auth_user_ids.length > 0) {
            console.log(`[Member Invite Sync] Batch ${batchId} - Deleting ${result.deleted_auth_user_ids.length} auth users`);

            for (const authUserId of result.deleted_auth_user_ids) {
                try {
                    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

                    if (deleteAuthError) {
                        console.error(`[Member Invite Sync] Batch ${batchId} - Failed to delete auth user ${authUserId}:`, deleteAuthError);
                        failedAuthUserIds.push({
                            userId: authUserId,
                            error: deleteAuthError.message || 'Unknown error'
                        });
                    } else {
                        deletedAuthUserIds.push(authUserId);
                        console.log(`[Member Invite Sync] Batch ${batchId} - Successfully deleted auth user ${authUserId}`);
                    }
                } catch (error) {
                    console.error(`[Member Invite Sync] Batch ${batchId} - Error deleting auth user ${authUserId}:`, error);
                    failedAuthUserIds.push({
                        userId: authUserId,
                        error: String(error)
                    });
                }
            }
        }

        // ✅ TASK-S004: 완료 로그 기록
        const durationMs = Date.now() - startTime;
        const logStatus = failedAuthUserIds.length > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS';
        const action = failedAuthUserIds.length > 0 ? 'BULK_INVITE_PARTIAL_FAILURE' : 'BULK_INVITE_COMPLETE';

        await supabaseAdmin.from('member_access_logs').insert({
            union_id: unionId,
            user_id: createdBy,
            action: action,
            action_type: 'WRITE',
            batch_id: batchId,
            metadata: {
                total_count: members.length,
                inserted: result.inserted,
                deleted_pending: result.deleted_pending,
                deleted_used: result.deleted_used,
                deleted_auth_users: deletedAuthUserIds.length,
                failed_auth_users: failedAuthUserIds.length,
                failed_auth_user_details: failedAuthUserIds.slice(0, 10) // 처음 10개만 로깅
            },
            ip_address: clientIp,
            user_agent: userAgent,
            status: logStatus,
            duration_ms: durationMs,
            request_size: JSON.stringify(members).length
        }).catch((err: unknown) => {
            console.error('[감사 로그 기록 오류] COMPLETE:', err);
        });

        console.log(`[Member Invite Sync] Batch ${batchId} completed:`, {
            unionId,
            inserted: result.inserted,
            deleted_pending: result.deleted_pending,
            deleted_used: result.deleted_used,
            deleted_auth_users_success: deletedAuthUserIds.length,
            deleted_auth_users_failed: failedAuthUserIds.length,
            duration_ms: durationMs
        });

        // 부분 실패 처리: 207 Multi-Status 반환
        if (failedAuthUserIds.length > 0) {
            console.warn(`[Member Invite Sync] Batch ${batchId} - Partial failure: ${failedAuthUserIds.length} auth users failed to delete`);
            return NextResponse.json({
                success: false,
                error: 'auth.users 삭제 중 부분 실패',
                details: {
                    inserted: result.inserted,
                    deleted_auth_users: deletedAuthUserIds.length,
                    failed_auth_users: failedAuthUserIds.length,
                    failedUserIds: failedAuthUserIds.map(f => f.userId),
                    failedDetails: failedAuthUserIds
                },
                batchId
            }, { status: 207 }); // 207: Multi-Status
        }

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
                console.log('Generated Invitation URLs for Batch:', batchId);
                console.log('='.repeat(70));
                console.log(`Total ${newInvites.length} invitations created.\n`);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                newInvites.forEach((invite: any, index: number) => {
                    const inviteUrl = `${baseUrl}/member-invite/${invite.invite_token}`;
                    console.log(`[${index + 1}] ${invite.name} (${invite.phone_number})`);
                    console.log(`    Address: ${invite.property_address}`);
                    console.log(`    Expires: ${new Date(invite.expires_at).toLocaleString('ko-KR')}`);
                    console.log(`    URL: ${inviteUrl}`);
                    console.log('-'.repeat(70));
                });

                console.log('='.repeat(70) + '\n');
            }
        }

        return NextResponse.json({
            success: true,
            inserted: result.inserted,
            deleted_pending: result.deleted_pending,
            deleted_used: result.deleted_used,
            deleted_auth_users: deletedAuthUserIds.length,
            batchId,
            duration_ms: durationMs
        });

    } catch (error) {
        console.error('[Member Invite Sync] API error:', error);

        // ✅ TASK-S004: 예외 로그 기록
        const durationMs = Date.now() - startTime;
        if (supabaseAdmin) {
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: body?.unionId as string | undefined,
                user_id: auth && auth.authenticated ? auth.user.id : undefined,
                action: 'BULK_INVITE_FAILED',
                action_type: 'WRITE',
                batch_id: batchId,
                metadata: {
                    error_message: String(error),
                    error_type: error instanceof Error ? error.name : 'UnknownError'
                },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: durationMs
            }).catch((err: unknown) => {
                console.error('[감사 로그 기록 오류] EXCEPTION:', err);
            });
        } else {
            console.error('[감사 로그 기록 불가] supabaseAdmin 미초기화');
        }

        return NextResponse.json(
            { error: '동기화 처리 중 오류가 발생했습니다.', batchId },
            { status: 500 }
        );
    }
}
