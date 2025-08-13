import { NextRequest, NextResponse } from 'next/server';
import { sampleCommunityPosts } from '@/lib/mockData';

// GET: 커뮤니티 게시글 목록 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        let filteredPosts = [...sampleCommunityPosts];

        // 카테고리 필터링
        if (category && category !== 'all') {
            filteredPosts = filteredPosts.filter((post) => post.category === category);
        }

        // 검색 필터링
        if (search) {
            const searchLower = search.toLowerCase();
            filteredPosts = filteredPosts.filter(
                (post) =>
                    post.title.toLowerCase().includes(searchLower) ||
                    post.content.toLowerCase().includes(searchLower) ||
                    post.author.toLowerCase().includes(searchLower)
            );
        }

        // 날짜순 정렬 (최신순)
        filteredPosts.sort(
            (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
        );

        // 페이지네이션
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

        return NextResponse.json({
            success: true,
            data: {
                posts: paginatedPosts,
                pagination: {
                    current: page,
                    total: Math.ceil(filteredPosts.length / limit),
                    count: filteredPosts.length,
                    hasNext: endIndex < filteredPosts.length,
                    hasPrev: page > 1,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching community posts:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch community posts' }, { status: 500 });
    }
}

// POST: 새 커뮤니티 게시글 생성
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    try {
        const body = await request.json();
        const { title, content, category, author, attachments } = body;

        // 유효성 검사
        if (!title || !content || !category) {
            return NextResponse.json(
                { success: false, error: 'Title, content, and category are required' },
                { status: 400 }
            );
        }

        // 새 게시글 생성
        const newPost = {
            id: Date.now(), // 실제로는 DB에서 자동 생성
            title,
            content,
            category,
            author: author || '익명',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            views: 0,
            likes: 0,
            comments: 0,
            isLiked: false,
            attachments: attachments || [],
        };

        // 실제로는 데이터베이스에 저장
        console.log('New community post created:', newPost);

        return NextResponse.json(
            {
                success: true,
                data: newPost,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating community post:', error);
        return NextResponse.json({ success: false, error: 'Failed to create community post' }, { status: 500 });
    }
}
