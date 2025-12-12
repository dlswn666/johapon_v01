import { NextRequest, NextResponse } from 'next/server';

/**
 * 네이버 OAuth 인증 시작
 * 네이버 인증 페이지로 리다이렉트
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') ?? '';

    const clientId = process.env.NAVER_CLIENT_ID;
    
    if (!clientId) {
        console.error('Naver OAuth: NAVER_CLIENT_ID not configured');
        return NextResponse.json({ error: 'Naver OAuth not configured' }, { status: 500 });
    }

    // 콜백 URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/auth/naver/callback`;

    // state에 slug 정보 포함 (CSRF 방지 + 리다이렉트 정보)
    const state = Buffer.from(JSON.stringify({ slug, timestamp: Date.now() })).toString('base64');

    // 네이버 인증 URL 생성
    const naverAuthUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
    naverAuthUrl.searchParams.set('response_type', 'code');
    naverAuthUrl.searchParams.set('client_id', clientId);
    naverAuthUrl.searchParams.set('redirect_uri', callbackUrl);
    naverAuthUrl.searchParams.set('state', state);

    return NextResponse.redirect(naverAuthUrl.toString());
}




