import { NextRequest, NextResponse } from 'next/server';
import { sampleCommunityPosts } from '@/lib/mockData';

// GET: 특정 커뮤니티 게시글 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const { slug, id } = await params;
    try {
        const postId = parseInt(id);
        const post = sampleCommunityPosts.find((p) => p.id === postId);

        if (!post) {
            return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
        }

        // 조회수 증가 (실제로는 DB 업데이트)
        const updatedPost = {
            ...post,
            views: (post.views || 0) + 1,
        };

        return NextResponse.json({
            success: true,
            data: updatedPost,
        });
    } catch (error) {
        console.error('Error fetching community post:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch community post' }, { status: 500 });
    }
}

// PUT: 커뮤니티 게시글 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const { slug, id } = await params;
    try {
        const postId = parseInt(id);
        const body = await request.json();
        const { title, content, category, attachments } = body;

        const post = sampleCommunityPosts.find((p) => p.id === postId);
        if (!post) {
            return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
        }

        // 유효성 검사
        if (!title || !content || !category) {
            return NextResponse.json(
                { success: false, error: 'Title, content, and category are required' },
                { status: 400 }
            );
        }

        // 게시글 업데이트
        const updatedPost = {
            ...post,
            title,
            content,
            category,
            attachments: attachments || post.attachments,
            updatedAt: new Date().toISOString(),
        };

        // 실제로는 데이터베이스에서 업데이트
        console.log('Community post updated:', updatedPost);

        return NextResponse.json({
            success: true,
            data: updatedPost,
        });
    } catch (error) {
        console.error('Error updating community post:', error);
        return NextResponse.json({ success: false, error: 'Failed to update community post' }, { status: 500 });
    }
}

// DELETE: 커뮤니티 게시글 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const { slug, id } = await params;
    try {
        const postId = parseInt(id);
        const post = sampleCommunityPosts.find((p) => p.id === postId);

        if (!post) {
            return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
        }

        // 실제로는 데이터베이스에서 삭제
        console.log('Community post deleted:', postId);

        return NextResponse.json({
            success: true,
            message: 'Post deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting community post:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete community post' }, { status: 500 });
    }
}

// PATCH: 게시글 좋아요/취소
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
    const { slug, id } = await params;
    try {
        const postId = parseInt(id);
        const body = await request.json();
        const { action } = body; // 'like' or 'unlike'

        const post = sampleCommunityPosts.find((p) => p.id === postId);
        if (!post) {
            return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
        }

        let updatedPost;
        if (action === 'like') {
            updatedPost = {
                ...post,
                likes: (post.likes || 0) + 1,
                isLiked: true,
            };
        } else if (action === 'unlike') {
            updatedPost = {
                ...post,
                likes: Math.max((post.likes || 0) - 1, 0),
                isLiked: false,
            };
        } else {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }

        // 실제로는 데이터베이스에서 업데이트
        console.log('Community post like updated:', updatedPost);

        return NextResponse.json({
            success: true,
            data: updatedPost,
        });
    } catch (error) {
        console.error('Error updating post like:', error);
        return NextResponse.json({ success: false, error: 'Failed to update post like' }, { status: 500 });
    }
}
