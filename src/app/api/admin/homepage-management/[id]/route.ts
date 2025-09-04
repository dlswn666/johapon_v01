import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';

// 특정 홈페이지(조합) 정보 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const supabase = getSupabaseClient();

        const { data: union, error } = await supabase.from('unions').select('*').eq('id', id).single();

        if (error || !union) {
            return NextResponse.json({ error: '조합 정보를 찾을 수 없습니다.' }, { status: 404 });
        }

        // 데이터 변환
        const transformedUnion = {
            id: union.id,
            associationName: union.name,
            address: union.address || '',
            phone: union.phone || '',
            email: union.email || '',
            domain: union.homepage || '',
            logoUrl: union.logo_url || '',
            contractExpired: union.is_expired || false,
            registrationDate: new Date(union.created_at).toISOString().split('T')[0],
            expirationDate: union.contract_end_date
                ? new Date(union.contract_end_date).toISOString().split('T')[0]
                : '',
            status: union.is_expired
                ? 'expired'
                : union.contract_end_date && new Date(union.contract_end_date) <= new Date()
                ? 'expired'
                : 'active',
            lastUpdate: new Date(union.created_at).toISOString().split('T')[0],
        };

        return NextResponse.json({ data: transformedUnion });
    } catch (error) {
        console.error('조합 정보 조회 중 오류:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}

// 홈페이지(조합) 정보 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { associationName, address, phoneNumber, email, url, logoFile, contractEndDate, isExpired } = body;

        const supabase = getSupabaseClient();

        // 기존 조합 확인
        const { data: existingUnion, error: fetchError } = await supabase
            .from('unions')
            .select('id')
            .eq('id', id)
            .single();

        if (fetchError || !existingUnion) {
            return NextResponse.json({ error: '조합 정보를 찾을 수 없습니다.' }, { status: 404 });
        }

        // 중복 확인 (다른 조합과의 이름 또는 URL 중복)
        if (associationName || url) {
            const { data: duplicateUnion } = await supabase.from('unions').select('id').neq('id', id);

            if (associationName) {
                const nameCheck = await supabase
                    .from('unions')
                    .select('id')
                    .eq('name', associationName)
                    .neq('id', id)
                    .single();

                if (nameCheck.data) {
                    return NextResponse.json({ error: '이미 사용 중인 조합명입니다.' }, { status: 409 });
                }
            }

            if (url) {
                const urlCheck = await supabase
                    .from('unions')
                    .select('id')
                    .eq('homepage', url.startsWith('http') ? url : `https://${url}`)
                    .neq('id', id)
                    .single();

                if (urlCheck.data) {
                    return NextResponse.json({ error: '이미 사용 중인 URL입니다.' }, { status: 409 });
                }
            }
        }

        // 업데이트할 데이터 구성
        const updateData: any = {};

        if (associationName) updateData.name = associationName;
        if (address) updateData.address = address;
        if (phoneNumber) updateData.phone = phoneNumber;
        if (email) updateData.email = email;
        if (url) updateData.homepage = url.startsWith('http') ? url : `https://${url}`;
        if (logoFile) updateData.logo_url = logoFile;
        if (contractEndDate) updateData.contract_end_date = new Date(contractEndDate).toISOString();
        if (typeof isExpired === 'boolean') updateData.is_expired = isExpired;

        // 조합 정보 업데이트
        const { data: updatedUnion, error: updateError } = await supabase
            .from('unions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('조합 정보 수정 오류:', updateError);
            return NextResponse.json({ error: '조합 정보 수정에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
            message: '홈페이지 정보가 성공적으로 수정되었습니다.',
            data: updatedUnion,
        });
    } catch (error) {
        console.error('조합 정보 수정 중 오류:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}

// 홈페이지(조합) 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const supabase = getSupabaseClient();

        // 기존 조합 확인
        const { data: existingUnion, error: fetchError } = await supabase
            .from('unions')
            .select('id, name')
            .eq('id', id)
            .single();

        if (fetchError || !existingUnion) {
            return NextResponse.json({ error: '조합 정보를 찾을 수 없습니다.' }, { status: 404 });
        }

        // 관련 데이터 확인 (posts, users 등)
        const { data: relatedPosts } = await supabase.from('posts').select('id').eq('union_id', id).limit(1);

        const { data: relatedUsers } = await supabase.from('users').select('id').eq('union_id', id).limit(1);

        if (relatedPosts && relatedPosts.length > 0) {
            return NextResponse.json(
                { error: '해당 조합에 연결된 게시글이 있어 삭제할 수 없습니다.' },
                { status: 409 }
            );
        }

        if (relatedUsers && relatedUsers.length > 0) {
            return NextResponse.json(
                { error: '해당 조합에 소속된 사용자가 있어 삭제할 수 없습니다.' },
                { status: 409 }
            );
        }

        // 조합 삭제
        const { error: deleteError } = await supabase.from('unions').delete().eq('id', id);

        if (deleteError) {
            console.error('조합 삭제 오류:', deleteError);
            return NextResponse.json({ error: '조합 삭제에 실패했습니다.' }, { status: 500 });
        }

        return NextResponse.json({
            message: `${existingUnion.name} 조합이 성공적으로 삭제되었습니다.`,
        });
    } catch (error) {
        console.error('조합 삭제 중 오류:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
