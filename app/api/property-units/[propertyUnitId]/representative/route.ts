import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ propertyUnitId: string }>;
}

/**
 * 공동소유 물건지 대표자 변경 (관리자 전용)
 * PATCH /api/property-units/[propertyUnitId]/representative
 * Body: { new_representative_user_id: string }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { propertyUnitId } = await context.params;
    const unionId = auth.user.union_id;

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { new_representative_user_id } = body;
    if (!new_representative_user_id || typeof new_representative_user_id !== 'string') {
      return NextResponse.json({ error: 'new_representative_user_id가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 물건지가 이 조합 소속인지 확인
    const { data: propertyUnit } = await supabase
      .from('property_units')
      .select('id, union_id')
      .eq('id', propertyUnitId)
      .eq('union_id', unionId)
      .eq('is_deleted', false)
      .single();

    if (!propertyUnit) {
      return NextResponse.json({ error: '물건지를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 해당 사용자가 이 물건지의 소유자인지 확인
    const { data: ownership } = await supabase
      .from('property_ownerships')
      .select('id, ownership_type')
      .eq('property_unit_id', propertyUnitId)
      .eq('user_id', new_representative_user_id)
      .eq('is_active', true)
      .single();

    if (!ownership) {
      return NextResponse.json({ error: '해당 조합원은 이 물건지의 소유자가 아닙니다.' }, { status: 400 });
    }

    if (ownership.ownership_type !== 'CO_OWNER') {
      return NextResponse.json({ error: '공동소유자만 대표자로 지정할 수 있습니다.' }, { status: 400 });
    }

    // co_ownership_groups upsert
    const { error } = await supabase
      .from('co_ownership_groups')
      .upsert({
        property_unit_id: propertyUnitId,
        representative_user_id: new_representative_user_id,
      }, {
        onConflict: 'property_unit_id',
      });

    if (error) {
      console.error('대표자 지정 실패:', error);
      return NextResponse.json({ error: '대표자 지정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      property_unit_id: propertyUnitId,
      representative_user_id: new_representative_user_id,
    });
  } catch (error) {
    console.error('PATCH /api/property-units/[propertyUnitId]/representative error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
