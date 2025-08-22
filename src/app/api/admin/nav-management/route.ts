import { NextRequest, NextResponse } from 'next/server';

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
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        // TODO: 실제 데이터베이스 쿼리로 대체
        // const result = await getUnionNavData({ search, status, page, limit });

        // 임시 응답 데이터
        const mockData = [
            {
                id: '1',
                unionId: 'union1',
                unionName: '강남재개발조합',
                homepage: 'gangnam',
                totalMenus: 8,
                enabledMenus: 6,
                hasCustomLabels: true,
                lastUpdated: '2024-01-15',
                status: 'configured',
            },
            {
                id: '2',
                unionId: 'union2',
                unionName: '서초재개발조합',
                homepage: 'seocho',
                totalMenus: 8,
                enabledMenus: 8,
                hasCustomLabels: false,
                lastUpdated: '2024-01-10',
                status: 'default',
            },
            {
                id: '3',
                unionId: 'union3',
                unionName: '송파재개발조합',
                homepage: 'songpa',
                totalMenus: 8,
                enabledMenus: 4,
                hasCustomLabels: true,
                lastUpdated: '2024-01-05',
                status: 'incomplete',
            },
        ];

        // 검색 및 필터링
        let filteredData = mockData;

        if (search) {
            filteredData = filteredData.filter(
                (item) =>
                    item.unionName.toLowerCase().includes(search.toLowerCase()) ||
                    item.homepage.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (status !== 'all') {
            filteredData = filteredData.filter((item) => item.status === status);
        }

        // 페이징 처리
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        const stats = {
            totalUnions: mockData.length,
            configuredUnions: mockData.filter((item) => item.status === 'configured').length,
            defaultUnions: mockData.filter((item) => item.status === 'default').length,
            incompleteUnions: mockData.filter((item) => item.status === 'incomplete').length,
        };

        return NextResponse.json({
            success: true,
            data: paginatedData,
            stats,
            pagination: {
                page,
                limit,
                total: filteredData.length,
                totalPages: Math.ceil(filteredData.length / limit),
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

// POST: nav 설정 저장
export async function POST(request: NextRequest) {
    try {
        const body: SaveRequest = await request.json();
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

        // TODO: 실제 데이터베이스 저장 로직
        /*
        // 1. union_menus 테이블 처리
        await Promise.all(menuConfigs.map(async (config) => {
            // 기존 설정이 있는지 확인
            const existingConfig = await supabase
                .from('union_menus')
                .select('*')
                .eq('union_id', unionId)
                .eq('menu_item_id', config.menuItemId)
                .single();

            if (existingConfig.data) {
                // 업데이트
                await supabase
                    .from('union_menus')
                    .update({
                        enabled: config.enabled,
                        custom_label: config.customLabel || null,
                        display_order: config.displayOrder
                    })
                    .eq('union_id', unionId)
                    .eq('menu_item_id', config.menuItemId);
            } else {
                // 새로 생성
                await supabase
                    .from('union_menus')
                    .insert({
                        union_id: unionId,
                        menu_item_id: config.menuItemId,
                        enabled: config.enabled,
                        custom_label: config.customLabel || null,
                        display_order: config.displayOrder
                    });
            }
        }));

        // 2. menu_permissions 테이블 처리
        // 기존 권한 설정 삭제
        await supabase
            .from('menu_permissions')
            .delete()
            .eq('union_id', unionId);

        // 새 권한 설정 추가
        const permissionInserts = permissions
            .filter(p => p.canView) // 권한이 있는 것만 저장
            .map(p => ({
                union_id: unionId,
                menu_item_id: p.menuItemId,
                role_id: p.roleId,
                can_view: p.canView
            }));

        if (permissionInserts.length > 0) {
            await supabase
                .from('menu_permissions')
                .insert(permissionInserts);
        }
        */

        // 임시 성공 응답
        console.log('저장할 데이터:', { unionId, menuConfigs, permissions });

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
