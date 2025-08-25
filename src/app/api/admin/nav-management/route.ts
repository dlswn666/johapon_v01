import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';

// 임시 인터페이스 (나중에 실제 데이터베이스 연결 시 업데이트)
interface MenuConfig {
    menuItemId: string;
    enabled: boolean;
    customLabel: string;
    displayOrder: number;
}

interface Permission {
    menuItemId: string;
    roleId: string;
    canView: boolean;
}

interface SaveRequest {
    unionId: string;
    menuConfigs: MenuConfig[];
    permissions: Permission[];
}

// GET: 조합별 nav 현황 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const sortBy = searchParams.get('sortBy') || 'unionName';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const supabase = getSupabaseClient();

        // 1. 조합 목록 조회 (검색 및 정렬 적용)
        let unionsQuery = supabase.from('unions').select('id, name, homepage, created_at');

        // 검색 조건 적용
        if (search) {
            unionsQuery = unionsQuery.or(`name.ilike.%${search}%,homepage.ilike.%${search}%`);
        }

        // 정렬 조건 적용
        switch (sortBy) {
            case 'unionName':
                unionsQuery = unionsQuery.order('name');
                break;
            case 'createdAt':
                unionsQuery = unionsQuery.order('created_at', { ascending: false });
                break;
            default:
                unionsQuery = unionsQuery.order('name');
        }

        const { data: unions, error: unionsError } = await unionsQuery;

        if (unionsError) {
            console.error('Unions query error:', unionsError);
            return NextResponse.json(
                {
                    success: false,
                    message: '조합 데이터 조회에 실패했습니다.',
                },
                { status: 500 }
            );
        }

        // 2. 데이터 변환 및 계약 상태 계산
        const unionsWithStatus =
            unions?.map((union) => {
                // 임시로 모든 조합을 운영중으로 설정 (추후 계약 관련 필드 추가 시 수정)
                const contractStatus: 'operating' | 'suspended' = 'operating';

                return {
                    id: union.id,
                    unionId: union.id,
                    unionName: union.name,
                    homepage: union.homepage,
                    lastUpdated: union.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                    contractStatus: contractStatus,
                };
            }) || [];

        // 3. 페이징 처리
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = unionsWithStatus.slice(startIndex, endIndex);

        return NextResponse.json({
            success: true,
            data: paginatedData,
            totalUnions: unionsWithStatus.length,
            pagination: {
                page,
                limit,
                total: unionsWithStatus.length,
                totalPages: Math.ceil(unionsWithStatus.length / limit),
            },
        });
    } catch (error) {
        console.error('Nav 데이터 조회 오류:', error);
        return NextResponse.json(
            {
                success: false,
                message: '데이터 조회 중 오류가 발생했습니다.',
            },
            { status: 500 }
        );
    }
}

// POST: nav 설정 저장 (기존 로직 유지)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId, menuConfigs, permissions } = body;

        // 입력 validation
        if (!unionId) {
            return NextResponse.json(
                {
                    success: false,
                    message: '조합 ID가 필요합니다.',
                },
                { status: 400 }
            );
        }

        if (!menuConfigs || !Array.isArray(menuConfigs)) {
            return NextResponse.json(
                {
                    success: false,
                    message: '메뉴 설정 데이터가 올바르지 않습니다.',
                },
                { status: 400 }
            );
        }

        if (!permissions || !Array.isArray(permissions)) {
            return NextResponse.json(
                {
                    success: false,
                    message: '권한 설정 데이터가 올바르지 않습니다.',
                },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();

        // 1. 조합 존재 여부 확인
        const { data: unionData, error: unionError } = await supabase
            .from('unions')
            .select('id')
            .eq('id', unionId)
            .single();

        if (unionError || !unionData) {
            return NextResponse.json(
                {
                    success: false,
                    message: '존재하지 않는 조합입니다.',
                },
                { status: 404 }
            );
        }

        // 2. union_menus 테이블 처리
        await Promise.all(
            menuConfigs.map(async (config) => {
                // 기존 설정이 있는지 확인
                const { data: existingConfig } = await supabase
                    .from('union_menus')
                    .select('*')
                    .eq('union_id', unionId)
                    .eq('menu_item_id', config.menuItemId)
                    .single();

                if (existingConfig) {
                    // 업데이트
                    const { error: updateError } = await supabase
                        .from('union_menus')
                        .update({
                            enabled: config.enabled,
                            custom_label: config.customLabel || null,
                            display_order: config.displayOrder,
                        })
                        .eq('union_id', unionId)
                        .eq('menu_item_id', config.menuItemId);

                    if (updateError) {
                        console.error('Union menu update error:', updateError);
                        throw new Error(`메뉴 설정 업데이트 실패: ${updateError.message}`);
                    }
                } else {
                    // 새로 생성
                    const { error: insertError } = await supabase.from('union_menus').insert({
                        union_id: unionId,
                        menu_item_id: config.menuItemId,
                        enabled: config.enabled,
                        custom_label: config.customLabel || null,
                        display_order: config.displayOrder,
                    });

                    if (insertError) {
                        console.error('Union menu insert error:', insertError);
                        throw new Error(`메뉴 설정 추가 실패: ${insertError.message}`);
                    }
                }
            })
        );

        // 3. menu_permissions 테이블 처리
        // 기존 권한 설정 삭제
        const { error: deletePermissionError } = await supabase
            .from('menu_permissions')
            .delete()
            .eq('union_id', unionId);

        if (deletePermissionError) {
            console.error('Permission delete error:', deletePermissionError);
            throw new Error(`기존 권한 삭제 실패: ${deletePermissionError.message}`);
        }

        // 새 권한 설정 추가
        const permissionInserts = permissions.map((p) => ({
            union_id: unionId,
            menu_item_id: p.menuItemId,
            role_id: p.roleId,
            can_view: p.canView,
        }));

        if (permissionInserts.length > 0) {
            const { error: insertPermissionError } = await supabase.from('menu_permissions').insert(permissionInserts);

            if (insertPermissionError) {
                console.error('Permission insert error:', insertPermissionError);
                throw new Error(`권한 설정 추가 실패: ${insertPermissionError.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: '설정이 성공적으로 저장되었습니다.',
            data: {
                unionId,
                savedMenus: menuConfigs.length,
                savedPermissions: permissions.length,
            },
        });
    } catch (error) {
        console.error('Nav 설정 저장 오류:', error);
        return NextResponse.json(
            {
                success: false,
                message: '설정 저장 중 오류가 발생했습니다.',
            },
            { status: 500 }
        );
    }
}

// PUT: nav 설정 수정 (POST와 동일한 로직)
export async function PUT(request: NextRequest) {
    return POST(request);
}
