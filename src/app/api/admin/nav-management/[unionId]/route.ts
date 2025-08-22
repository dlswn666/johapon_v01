import { NextRequest, NextResponse } from 'next/server';

// GET: 특정 조합의 nav 상세 정보 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ unionId: string }> }) {
    try {
        const { unionId } = await params;

        if (!unionId) {
            return NextResponse.json(
                {
                    success: false,
                    message: '조합 ID가 필요합니다.',
                },
                { status: 400 }
            );
        }

        // TODO: 실제 데이터베이스 쿼리로 대체
        /*
        // 1. 조합 정보 조회
        const { data: union } = await supabase
            .from('unions')
            .select('id, name, homepage, address, phone, email')
            .eq('id', unionId)
            .single();

        if (!union) {
            return NextResponse.json(
                { 
                    success: false, 
                    message: '조합을 찾을 수 없습니다.' 
                },
                { status: 404 }
            );
        }

        // 2. 조합의 메뉴 설정 조회
        const { data: unionMenus } = await supabase
            .from('union_menus')
            .select(`
                menu_item_id,
                enabled,
                custom_label,
                display_order,
                nav_menu_items (
                    id,
                    key,
                    label_default,
                    path
                )
            `)
            .eq('union_id', unionId);

        // 3. 조합의 메뉴 권한 조회
        const { data: permissions } = await supabase
            .from('menu_permissions')
            .select(`
                menu_item_id,
                role_id,
                can_view,
                roles (
                    id,
                    key,
                    name
                )
            `)
            .eq('union_id', unionId);

        // 4. 기본 메뉴 항목 조회 (설정되지 않은 메뉴 포함)
        const { data: allMenuItems } = await supabase
            .from('nav_menu_items')
            .select('id, key, label_default, path, display_order')
            .order('display_order');

        // 5. 데이터 조합
        const menuDetails = allMenuItems.map(menuItem => {
            const unionMenu = unionMenus?.find(um => um.menu_item_id === menuItem.id);
            const menuPermissions = permissions?.filter(p => p.menu_item_id === menuItem.id) || [];

            return {
                id: menuItem.id,
                key: menuItem.key,
                labelDefault: menuItem.label_default,
                customLabel: unionMenu?.custom_label || null,
                path: menuItem.path,
                enabled: unionMenu?.enabled ?? true, // 기본값: true
                displayOrder: unionMenu?.display_order ?? menuItem.display_order,
                permissions: menuPermissions.map(p => ({
                    roleId: p.role_id,
                    roleName: p.roles.name,
                    canView: p.can_view
                }))
            };
        });
        */

        // 임시 응답 데이터
        const mockData = {
            union: {
                id: unionId,
                name: getUnionName(unionId),
                homepage: getHomepage(unionId),
                address: '서울시 강남구 테헤란로 123',
                phone: '02-1234-5678',
                email: `info@${getHomepage(unionId)}-union.com`,
            },
            menus: [
                {
                    id: 'menu1',
                    key: 'home',
                    labelDefault: '홈',
                    path: '/',
                    enabled: true,
                    displayOrder: 1,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: true },
                        { roleId: 'role3', roleName: '조합원', canView: true },
                    ],
                },
                {
                    id: 'menu2',
                    key: 'announcements',
                    labelDefault: '공지사항',
                    customLabel: '조합 공지',
                    path: '/announcements',
                    enabled: true,
                    displayOrder: 2,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: true },
                        { roleId: 'role3', roleName: '조합원', canView: true },
                    ],
                },
                {
                    id: 'menu3',
                    key: 'community',
                    labelDefault: '커뮤니티',
                    path: '/community',
                    enabled: true,
                    displayOrder: 3,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: true },
                        { roleId: 'role3', roleName: '조합원', canView: false },
                    ],
                },
                {
                    id: 'menu4',
                    key: 'qna',
                    labelDefault: 'Q&A',
                    path: '/qna',
                    enabled: false,
                    displayOrder: 4,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: false },
                        { roleId: 'role3', roleName: '조합원', canView: false },
                    ],
                },
                {
                    id: 'menu5',
                    key: 'chairman-greeting',
                    labelDefault: '조합장 인사말',
                    customLabel: '이사장 인사',
                    path: '/chairman-greeting',
                    enabled: true,
                    displayOrder: 5,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: true },
                        { roleId: 'role3', roleName: '조합원', canView: true },
                    ],
                },
                {
                    id: 'menu6',
                    key: 'organization-chart',
                    labelDefault: '조직도',
                    path: '/organization-chart',
                    enabled: true,
                    displayOrder: 6,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: true },
                        { roleId: 'role3', roleName: '조합원', canView: false },
                    ],
                },
                {
                    id: 'menu7',
                    key: 'office',
                    labelDefault: '사무소 안내',
                    path: '/office',
                    enabled: true,
                    displayOrder: 7,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: true },
                        { roleId: 'role3', roleName: '조합원', canView: true },
                    ],
                },
                {
                    id: 'menu8',
                    key: 'redevelopment',
                    labelDefault: '재개발 현황',
                    path: '/redevelopment',
                    enabled: false,
                    displayOrder: 8,
                    permissions: [
                        { roleId: 'role1', roleName: '관리자', canView: true },
                        { roleId: 'role2', roleName: '임원', canView: false },
                        { roleId: 'role3', roleName: '조합원', canView: false },
                    ],
                },
            ],
            stats: {
                totalMenus: 8,
                enabledMenus: 6,
                customLabels: 2,
                lastUpdated: '2024-01-15',
            },
        };

        return NextResponse.json({
            success: true,
            data: mockData,
        });
    } catch (error) {
        console.error('Nav 상세 데이터 조회 오류:', error);
        return NextResponse.json(
            {
                success: false,
                message: '상세 데이터 조회 중 오류가 발생했습니다.',
            },
            { status: 500 }
        );
    }
}

// 임시 헬퍼 함수들
function getUnionName(unionId: string): string {
    const names: Record<string, string> = {
        union1: '강남재개발조합',
        union2: '서초재개발조합',
        union3: '송파재개발조합',
        union4: '마포재개발조합',
        union5: '용산재개발조합',
    };
    return names[unionId] || '알 수 없는 조합';
}

function getHomepage(unionId: string): string {
    const homepages: Record<string, string> = {
        union1: 'gangnam',
        union2: 'seocho',
        union3: 'songpa',
        union4: 'mapo',
        union5: 'yongsan',
    };
    return homepages[unionId] || 'unknown';
}
