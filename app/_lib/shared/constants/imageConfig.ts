/**
 * 이미지 설정 상수
 * 각 이미지 유형별 권장 크기, 비율, 최대 파일 크기 등을 정의합니다.
 */

export type ImageType = 'hero_slide' | 'popup_banner' | 'content_image' | 'logo';

export interface ImageConfig {
    /** 이미지 유형 */
    type: ImageType;
    /** 표시 이름 */
    label: string;
    /** 권장 너비 (px) */
    width: number;
    /** 권장 높이 (px) */
    height: number;
    /** 권장 비율 (예: "16:5") */
    ratio: string;
    /** 비율 값 (width / height) */
    ratioValue: number;
    /** 고해상도 너비 (2x) */
    width2x: number;
    /** 고해상도 높이 (2x) */
    height2x: number;
    /** 최대 파일 크기 (bytes) */
    maxFileSize: number;
    /** 허용 파일 형식 */
    acceptedFormats: string[];
    /** 용도 설명 */
    description: string;
    /** 배경색 (contain 모드에서 빈 공간 채우기) */
    backgroundColor: string;
}

/**
 * 이미지 유형별 설정
 */
export const IMAGE_CONFIGS: Record<ImageType, ImageConfig> = {
    hero_slide: {
        type: 'hero_slide',
        label: 'Hero 슬라이드',
        width: 1920,
        height: 600,
        ratio: '16:5',
        ratioValue: 1920 / 600, // 3.2
        width2x: 3840,
        height2x: 1200,
        maxFileSize: 15 * 1024 * 1024, // 15MB
        acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        description: '메인 배너 슬라이드에 사용됩니다.',
        backgroundColor: '#ffffff',
    },
    popup_banner: {
        type: 'popup_banner',
        label: '팝업 배너',
        width: 600,
        height: 400,
        ratio: '3:2',
        ratioValue: 600 / 400, // 1.5
        width2x: 1200,
        height2x: 800,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        acceptedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        description: '공지사항 팝업에 사용됩니다.',
        backgroundColor: '#ffffff',
    },
    content_image: {
        type: 'content_image',
        label: '콘텐츠 이미지',
        width: 1200,
        height: 800,
        ratio: '자유',
        ratioValue: 0, // 자유 비율
        width2x: 2400,
        height2x: 1600,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        acceptedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        description: '게시글 본문에 사용됩니다. 최대 크기만 제한됩니다.',
        backgroundColor: 'transparent',
    },
    logo: {
        type: 'logo',
        label: '조합 로고',
        width: 200,
        height: 200,
        ratio: '1:1',
        ratioValue: 1,
        width2x: 400,
        height2x: 400,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        acceptedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        description: '헤더/푸터 로고에 사용됩니다.',
        backgroundColor: 'transparent',
    },
};

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 이미지 비율 계산
 */
export const calculateRatio = (width: number, height: number): number => {
    return width / height;
};

/**
 * 권장 비율과의 차이 계산 (%)
 */
export const calculateRatioDifference = (
    imageWidth: number,
    imageHeight: number,
    targetConfig: ImageConfig
): number => {
    if (targetConfig.ratioValue === 0) return 0; // 자유 비율
    const imageRatio = calculateRatio(imageWidth, imageHeight);
    return Math.abs((imageRatio - targetConfig.ratioValue) / targetConfig.ratioValue) * 100;
};

/**
 * 이미지가 권장 비율에 맞는지 확인 (허용 오차 10%)
 */
export const isRecommendedRatio = (
    imageWidth: number,
    imageHeight: number,
    targetConfig: ImageConfig,
    tolerance: number = 10
): boolean => {
    if (targetConfig.ratioValue === 0) return true; // 자유 비율은 항상 true
    const difference = calculateRatioDifference(imageWidth, imageHeight, targetConfig);
    return difference <= tolerance;
};

/**
 * 권장 크기 텍스트 생성
 */
export const getRecommendedSizeText = (config: ImageConfig): string => {
    return `${config.width} x ${config.height}px (${config.ratio})`;
};

/**
 * 허용 파일 형식 텍스트 생성
 */
export const getAcceptedFormatsText = (config: ImageConfig): string => {
    return config.acceptedFormats
        .map((format) => format.replace('image/', '').toUpperCase())
        .join(', ');
};

/**
 * input accept 속성용 문자열 생성
 */
export const getAcceptString = (config: ImageConfig): string => {
    return config.acceptedFormats.join(',');
};

export default IMAGE_CONFIGS;

