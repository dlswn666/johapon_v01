import { NextRequest, NextResponse } from 'next/server';

// GET: 메뉴 설정에 필요한 기본 데이터 조회 (조합 목록, 역할 목록, 메뉴 항목 목록)
export async function GET(request: NextRequest) {
    try {
        // TODO: 실제 데이터베이스 쿼리로 대체
        /*
        // 1. 조합 목록 조회
        const { data: unions } = await supabase
            .from('unions')
            .select('id, name, homepage')
            .order('name');

        // 2. 역할 목록 조회
        const { data: roles } = await supabase
            .from('roles')
            .select('id, key, name')
            .eq('is_system', false) // 조합별 역할만
            .order('key');

        // 3. 메뉴 항목 목록 조회
        const { data: menuItems } = await supabase
            .from('nav_menu_items')
            .select(`
                id,
                key,
                label_default,
                path,
                depth,
                parent_id,
                display_order,
                is_admin_area
            `)
            .order('display_order');
        */

        // 임시 응답 데이터
        const unions = [
            { id: 'union1', name: '강남재개발조합', homepage: 'gangnam' },
            { id: 'union2', name: '서초재개발조합', homepage: 'seocho' },
            { id: 'union3', name: '송파재개발조합', homepage: 'songpa' },
            { id: 'union4', name: '마포재개발조합', homepage: 'mapo' },
            { id: 'union5', name: '용산재개발조합', homepage: 'yongsan' },
        ];

        const roles = [
            { id: 'role1', key: 'admin', name: '관리자' },
            { id: 'role2', key: 'officer', name: '임원' },
            { id: 'role3', key: 'member', name: '조합원' },
        ];

        const menuItems = [
            {
                id: 'menu1',
                key: 'home',
                label_default: '홈',
                path: '/',
                depth: 1,
                parent_id: null,
                display_order: 1,
                is_admin_area: false,
            },
            {
                id: 'menu2',
                key: 'announcements',
                label_default: '공지사항',
                path: '/announcements',
                depth: 1,
                parent_id: null,
                display_order: 2,
                is_admin_area: false,
            },
            {
                id: 'menu3',
                key: 'community',
                label_default: '커뮤니티',
                path: '/community',
                depth: 1,
                parent_id: null,
                display_order: 3,
                is_admin_area: false,
            },
            {
                id: 'menu4',
                key: 'qna',
                label_default: 'Q&A',
                path: '/qna',
                depth: 1,
                parent_id: null,
                display_order: 4,
                is_admin_area: false,
            },
            {
                id: 'menu5',
                key: 'chairman-greeting',
                label_default: '조합장 인사말',
                path: '/chairman-greeting',
                depth: 1,
                parent_id: null,
                display_order: 5,
                is_admin_area: false,
            },
            {
                id: 'menu6',
                key: 'organization-chart',
                label_default: '조직도',
                path: '/organization-chart',
                depth: 1,
                parent_id: null,
                display_order: 6,
                is_admin_area: false,
            },
            {
                id: 'menu7',
                key: 'office',
                label_default: '사무소 안내',
                path: '/office',
                depth: 1,
                parent_id: null,
                display_order: 7,
                is_admin_area: false,
            },
            {
                id: 'menu8',
                key: 'redevelopment',
                label_default: '재개발 현황',
                path: '/redevelopment',
                depth: 1,
                parent_id: null,
                display_order: 8,
                is_admin_area: false,
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
    } catch (error) {
        console.error('기본 데이터 조회 오류:', error);
        return NextResponse.json(
            {
                success: false,
                message: '기본 데이터 조회 중 오류가 발생했습니다.',
            },
            { status: 500 }
        );
    }
}
