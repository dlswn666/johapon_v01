import { NextRequest, NextResponse } from 'next/server';
import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger 문서 설정
 *
 * JSDoc 주석을 기반으로 OpenAPI 스펙을 자동 생성합니다.
 */
const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Johapon API Documentation',
            version: '1.0.0',
            description: 'Johapon 프로젝트의 API 문서입니다.',
            contact: {
                name: 'API Support',
                email: 'support@johapon.com',
            },
        },
        servers: [
            {
                url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: '에러 메시지',
                        },
                        code: {
                            type: 'string',
                            description: '에러 코드',
                        },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: '사용자 ID',
                        },
                        name: {
                            type: 'string',
                            description: '사용자 이름',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: '이메일 주소',
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: '생성 일시',
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                            description: '수정 일시',
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Users',
                description: '사용자 관리 API',
            },
            {
                name: 'Products',
                description: '상품 관리 API',
            },
        ],
    },
    apis: ['./app/api/**/*.ts', './app/api/**/*.tsx'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: API 문서 조회
 *     description: OpenAPI 스펙을 JSON 형식으로 반환합니다.
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: OpenAPI 스펙
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
    return NextResponse.json(swaggerSpec);
}
