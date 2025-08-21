import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/shared/lib/supabaseServer';

// 홈페이지(조합) 목록 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        const supabase = getSupabaseServerClient();

        // 기본 쿼리 구성
        let query = supabase.from('unions').select('*').order('created_at', { ascending: false });

        // 검색 조건 추가
        if (search) {
            query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,homepage.ilike.%${search}%`);
        }

        // 상태 필터는 일단 제거 (unions 테이블에 is_expired, contract_end_date 필드가 없음)

        // 페이지네이션 적용
        const { data: unions, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error('조합 목록 조회 오류:', error);
            return NextResponse.json({ error: '조합 목록을 불러오는데 실패했습니다.' }, { status: 500 });
        }

        // 통계 데이터 계산 (간단한 버전)
        const { data: allUnions } = await supabase.from('unions').select('id');

        const stats = {
            total: allUnions?.length || 0,
            active: allUnions?.length || 0, // 현재는 모든 조합을 활성으로 간주
            expired: 0,
            expiring: 0,
        };

        // 데이터 변환 (기존 필드를 홈페이지 관리에 맞게 매핑)
        const transformedUnions =
            unions?.map((union) => ({
                id: union.id,
                associationName: union.name,
                address: union.address || '',
                phone: union.phone || '',
                email: union.email || '',
                domain: union.homepage || '',
                logoUrl: union.logo_url || '',
                unionChairman: union.union_chairman || '',
                area: union.area || 0,
                unionMembers: union.union_members || 0,
                contractExpired: false, // 기본적으로 활성으로 설정
                registrationDate: new Date(union.created_at).toISOString().split('T')[0],
                expirationDate: '', // 임시로 빈 문자열
                status: 'active', // 기본적으로 활성으로 설정
                lastUpdate: new Date(union.created_at).toISOString().split('T')[0],
            })) || [];

        return NextResponse.json({
            data: transformedUnions,
            stats,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('조합 목록 조회 중 오류:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}

// 새 홈페이지(조합) 등록
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            associationName,
            address,
            phoneNumber,
            email,
            url,
            logoFile, // 실제로는 파일 업로드 후 URL이 들어옴
            unionChairman,
            area,
            unionMembers,
        } = body;

        // 필수 필드 검증
        if (
            !associationName ||
            !address ||
            !phoneNumber ||
            !email ||
            !url ||
            !unionChairman ||
            !area ||
            !unionMembers
        ) {
            return NextResponse.json({ error: '모든 필수 필드를 입력해 주세요.' }, { status: 400 });
        }

        // 숫자 필드 검증
        if (isNaN(Number(area)) || Number(area) <= 0) {
            return NextResponse.json({ error: '조합 총 면적은 0보다 큰 숫자여야 합니다.' }, { status: 400 });
        }

        if (isNaN(Number(unionMembers)) || Number(unionMembers) <= 0) {
            return NextResponse.json({ error: '조합원 총 수는 0보다 큰 숫자여야 합니다.' }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();

        // 중복 확인 (이름 또는 URL)
        const { data: existingUnion } = await supabase
            .from('unions')
            .select('id')
            .or(`name.eq.${associationName},homepage.eq.${url}`)
            .single();

        if (existingUnion) {
            return NextResponse.json({ error: '이미 등록된 조합명 또는 URL입니다.' }, { status: 409 });
        }

        // 계약 종료일 계산 (1년 후)
        const contractEndDate = new Date();
        contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);

        // 새 조합 등록
        const { data: newUnion, error } = await supabase
            .from('unions')
            .insert({
                name: associationName,
                address,
                phone: phoneNumber,
                email,
                homepage: url.startsWith('http') ? url : `https://${url}`,
                logo_url: logoFile, // 실제로는 파일 업로드 서비스를 통해 처리
                union_chairman: unionChairman,
                area: Number(area),
                union_members: Number(unionMembers),
            })
            .select()
            .single();

        if (error) {
            console.error('조합 등록 오류:', error);
            return NextResponse.json({ error: '조합 등록에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
            message: '새 홈페이지가 성공적으로 등록되었습니다.',
            data: newUnion,
        });
    } catch (error) {
        console.error('조합 등록 중 오류:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
