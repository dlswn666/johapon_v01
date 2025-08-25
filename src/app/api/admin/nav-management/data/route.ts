import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';

// GET: 메뉴 설정에 필요한 기본 데이터 조회 (조합 목록, 역할 목록, 메뉴 항목 목록)
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();

        // 1. 조합 목록 조회
        const { data: unions, error: unionsError } = await supabase
            .from('unions')
            .select('id, name, homepage')
            .order('name');

        if (unionsError) {
            console.error('Unions query error:', unionsError);
            throw new Error('조합 목록 조회 실패');
        }

        // 2. 역할 목록 조회 (시스템 관리자 제외)
        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('id, key, name')
            .eq('is_system', false) // 조합별 역할만
            .order('key');

        if (rolesError) {
            console.error('Roles query error:', rolesError);
            throw new Error('역할 목록 조회 실패');
        }

        // 3. MAIN_HEADER 메뉴 ID 조회
        const { data: mainHeaderMenu, error: headerError } = await supabase
            .from('nav_menus')
            .select('id')
            .eq('key', 'MAIN_HEADER')
            .single();

        if (headerError || !mainHeaderMenu) {
            console.error('Main header menu not found:', headerError);
            throw new Error('MAIN_HEADER 메뉴를 찾을 수 없습니다');
        }

        // 4. 메뉴 항목 목록 조회 (MAIN_HEADER의 모든 아이템)
        const { data: menuItems, error: menuItemsError } = await supabase
            .from('nav_menu_items')
            .select(
                `
                id,
                key,
                label_default,
                path,
                depth,
                parent_id,
                display_order,
                is_admin_area
            `
            )
            .eq('menu_id', mainHeaderMenu.id)
            .order('depth, display_order');

        if (menuItemsError) {
            console.error('Menu items query error:', menuItemsError);
            throw new Error('메뉴 항목 목록 조회 실패');
        }

        return NextResponse.json({
            success: true,
            data: {
                unions: unions || [],
                roles: roles || [],
                menuItems: menuItems || [],
            },
        });
    } catch (error) {
        console.error('기본 데이터 조회 오류:', error);

        // 개발 중일 때 임시 데이터 제공
        const unions = [
            { id: 'union1', name: '강남재개발조합', homepage: 'gangnam' },
            { id: 'union2', name: '서초재개발조합', homepage: 'seocho' },
            { id: 'union3', name: '송파재개발조합', homepage: 'songpa' },
            { id: 'union4', name: '마포재개발조합', homepage: 'mapo' },
            { id: 'union5', name: '용산재개발조합', homepage: 'yongsan' },
        ];

        const roles = [
            { id: 'role1', key: 'admin', name: '관리자' },
            { id: 'role3', key: 'member', name: '조합원' },
        ];

        // 새로운 메뉴 구조에 맞춘 임시 데이터
        const menuItems = [
            // 1차 메뉴
            {
                id: 'menu1',
                key: 'ABOUT',
                label_default: '조합 소개',
                path: null,
                depth: 1,
                parent_id: null,
                display_order: 10,
                is_admin_area: false,
            },
            {
                id: 'menu2',
                key: 'REDEV',
                label_default: '재개발 소개',
                path: null,
                depth: 1,
                parent_id: null,
                display_order: 20,
                is_admin_area: false,
            },
            {
                id: 'menu3',
                key: 'COMMUNITY',
                label_default: '커뮤니티',
                path: null,
                depth: 1,
                parent_id: null,
                display_order: 30,
                is_admin_area: false,
            },
            {
                id: 'menu4',
                key: 'ADMIN',
                label_default: '관리자',
                path: null,
                depth: 1,
                parent_id: null,
                display_order: 90,
                is_admin_area: true,
            },
            // 2차 메뉴 - 조합 소개 하위
            {
                id: 'menu5',
                key: 'ABOUT_GREETING',
                label_default: '조합장 인사',
                path: '/chairman-greeting',
                depth: 2,
                parent_id: 'menu1',
                display_order: 10,
                is_admin_area: false,
            },
            {
                id: 'menu6',
                key: 'ABOUT_ORGANIZATION',
                label_default: '조직도',
                path: '/organization-chart',
                depth: 2,
                parent_id: 'menu1',
                display_order: 20,
                is_admin_area: false,
            },
            {
                id: 'menu7',
                key: 'OFFICE',
                label_default: '사무실 안내',
                path: '/office',
                depth: 2,
                parent_id: 'menu1',
                display_order: 30,
                is_admin_area: false,
            },
            // 2차 메뉴 - 재개발 소개 하위
            {
                id: 'menu8',
                key: 'REDEV_PROCESS',
                label_default: '재개발 진행 과정',
                path: '/redevelopment',
                depth: 2,
                parent_id: 'menu2',
                display_order: 10,
                is_admin_area: false,
            },
            {
                id: 'menu9',
                key: 'REDEV_INFO',
                label_default: '재개발 정보',
                path: '/redevelopment/info',
                depth: 2,
                parent_id: 'menu2',
                display_order: 20,
                is_admin_area: false,
            },
            // 2차 메뉴 - 커뮤니티 하위
            {
                id: 'menu10',
                key: 'BOARD_NOTICE',
                label_default: '공지사항',
                path: '/announcements',
                depth: 2,
                parent_id: 'menu3',
                display_order: 10,
                is_admin_area: false,
            },
            {
                id: 'menu11',
                key: 'BOARD_QNA',
                label_default: 'Q&A',
                path: '/qna',
                depth: 2,
                parent_id: 'menu3',
                display_order: 20,
                is_admin_area: false,
            },
            {
                id: 'menu12',
                key: 'BOARD_FREE',
                label_default: '자유게시판',
                path: '/community',
                depth: 2,
                parent_id: 'menu3',
                display_order: 30,
                is_admin_area: false,
            },
            // 2차 메뉴 - 관리자 하위
            {
                id: 'menu13',
                key: 'ADMIN_USERS',
                label_default: '사용자 관리',
                path: '/admin/users',
                depth: 2,
                parent_id: 'menu4',
                display_order: 10,
                is_admin_area: true,
            },
            {
                id: 'menu14',
                key: 'ADMIN_ALRIMTALK',
                label_default: '알림톡 관리',
                path: '/admin/alrimtalk',
                depth: 2,
                parent_id: 'menu4',
                display_order: 20,
                is_admin_area: true,
            },
        ];

        return NextResponse.json({
            success: true,
            data: {
                unions,
                roles,
                menuItems,
            },
        });
    }
}
