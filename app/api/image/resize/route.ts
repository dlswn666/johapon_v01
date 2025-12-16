import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { IMAGE_CONFIGS, ImageType } from '@/app/_lib/shared/constants/imageConfig';

/**
 * 이미지 리사이징 API
 * Sharp를 사용하여 이미지를 최적 크기로 변환합니다.
 * 
 * fit: 'contain' 방식으로 이미지 전체가 보이도록 처리하고,
 * 빈 공간은 배경색으로 채웁니다.
 */

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const imageType = formData.get('imageType') as ImageType | null;
        const useHighRes = formData.get('useHighRes') === 'true';

        if (!file) {
            return NextResponse.json(
                { error: '파일이 필요합니다.' },
                { status: 400 }
            );
        }

        if (!imageType || !IMAGE_CONFIGS[imageType]) {
            return NextResponse.json(
                { error: '유효한 이미지 타입이 필요합니다.' },
                { status: 400 }
            );
        }

        const config = IMAGE_CONFIGS[imageType];

        // 파일 크기 검증
        if (file.size > config.maxFileSize) {
            return NextResponse.json(
                { 
                    error: `파일 크기가 너무 큽니다. 최대 ${Math.round(config.maxFileSize / 1024 / 1024)}MB까지 허용됩니다.` 
                },
                { status: 400 }
            );
        }

        // 파일 형식 검증
        if (!config.acceptedFormats.includes(file.type)) {
            return NextResponse.json(
                { 
                    error: `지원하지 않는 파일 형식입니다. ${config.acceptedFormats.map(f => f.replace('image/', '').toUpperCase()).join(', ')} 형식만 허용됩니다.` 
                },
                { status: 400 }
            );
        }

        // 파일을 Buffer로 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 원본 이미지 메타데이터 가져오기
        const metadata = await sharp(buffer).metadata();
        const originalWidth = metadata.width || 0;
        const originalHeight = metadata.height || 0;

        // 타겟 크기 결정 (고해상도 여부에 따라)
        const targetWidth = useHighRes ? config.width2x : config.width;
        const targetHeight = useHighRes ? config.height2x : config.height;

        // 배경색 파싱 (transparent 또는 hex color)
        let background: { r: number; g: number; b: number; alpha: number };
        if (config.backgroundColor === 'transparent') {
            background = { r: 255, g: 255, b: 255, alpha: 0 };
        } else {
            // hex color 파싱
            const hex = config.backgroundColor.replace('#', '');
            background = {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
                alpha: 1,
            };
        }

        let resizedBuffer: Buffer;
        let outputFormat: 'webp' | 'png' = 'webp';

        // 콘텐츠 이미지는 비율 자유 - 최대 크기만 제한
        if (imageType === 'content_image') {
            // 원본이 타겟보다 작으면 그대로 유지
            if (originalWidth <= targetWidth && originalHeight <= targetHeight) {
                resizedBuffer = await sharp(buffer)
                    .webp({ quality: 85 })
                    .toBuffer();
            } else {
                // 비율 유지하며 최대 크기 내로 축소
                resizedBuffer = await sharp(buffer)
                    .resize(targetWidth, targetHeight, {
                        fit: 'inside',
                        withoutEnlargement: true,
                    })
                    .webp({ quality: 85 })
                    .toBuffer();
            }
        } else {
            // 다른 이미지 타입은 contain 방식으로 리사이징
            // 배경이 투명인 경우 PNG로 출력
            if (config.backgroundColor === 'transparent') {
                outputFormat = 'png';
                resizedBuffer = await sharp(buffer)
                    .resize(targetWidth, targetHeight, {
                        fit: 'contain',
                        background,
                    })
                    .png({ quality: 85 })
                    .toBuffer();
            } else {
                resizedBuffer = await sharp(buffer)
                    .resize(targetWidth, targetHeight, {
                        fit: 'contain',
                        background,
                    })
                    .webp({ quality: 85 })
                    .toBuffer();
            }
        }

        // 리사이징된 이미지 메타데이터
        const resizedMetadata = await sharp(resizedBuffer).metadata();

        // Base64로 인코딩하여 반환 (또는 직접 업로드)
        const base64 = resizedBuffer.toString('base64');
        const mimeType = outputFormat === 'png' ? 'image/png' : 'image/webp';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return NextResponse.json({
            success: true,
            data: {
                dataUrl,
                buffer: base64,
                mimeType,
                format: outputFormat,
                originalSize: {
                    width: originalWidth,
                    height: originalHeight,
                    bytes: file.size,
                },
                resizedSize: {
                    width: resizedMetadata.width,
                    height: resizedMetadata.height,
                    bytes: resizedBuffer.length,
                },
                config: {
                    targetWidth,
                    targetHeight,
                    ratio: config.ratio,
                },
            },
        });
    } catch (error) {
        console.error('Image resize error:', error);
        return NextResponse.json(
            { error: '이미지 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

/**
 * GET: 이미지 설정 정보 반환
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageType = searchParams.get('type') as ImageType | null;

    if (imageType && IMAGE_CONFIGS[imageType]) {
        return NextResponse.json({
            success: true,
            data: IMAGE_CONFIGS[imageType],
        });
    }

    return NextResponse.json({
        success: true,
        data: IMAGE_CONFIGS,
    });
}

