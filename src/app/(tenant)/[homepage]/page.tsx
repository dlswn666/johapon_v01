import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import HomeRoot from '@/widgets/home/HomeRoot';
import { hasSupabaseEnv } from '@/shared/lib/supabase';

export default async function TenantLanding(props: any) {
    const { params } = props ?? {};
    const resolvedParams = params && typeof params.then === 'function' ? await params : params;
    const { homepage } = (resolvedParams || {}) as { homepage?: string };

    // Supabase 환경 변수 확인
    if (!hasSupabaseEnv) return notFound();

    // 미들웨어에서 이미 테넌트 검증을 완료했으므로 헤더 정보를 활용
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');

    // 미들웨어에서 테넌트 검증이 실패했거나 헤더가 없는 경우
    if (!tenantId || !tenantSlug) {
        return notFound();
    }

    // 미들웨어에서 검증된 테넌트와 URL 파라미터가 일치하는지 확인
    if (tenantSlug !== homepage) {
        console.log(`[TENANT_PAGE] Tenant slug mismatch: header=${tenantSlug}, param=${homepage}`);
        return notFound();
    }

    // DB 조회 없이 바로 렌더링 (미들웨어에서 이미 검증 완료)
    return <HomeRoot />;
}
