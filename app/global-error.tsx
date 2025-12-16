'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

/**
 * 글로벌 에러 페이지
 * Root Layout에서 에러가 발생했을 때 표시됩니다.
 * 자체적으로 html과 body 태그를 포함해야 합니다.
 *
 * 참고: global-error.tsx는 root layout이 깨졌을 때 사용되므로
 * Tailwind CSS가 작동하지 않을 수 있어 인라인 스타일을 사용합니다.
 * 조합온 디자인 시스템 색상: primary #4e8c6d
 */
/* eslint-disable @next/next/no-html-link-for-pages */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error('Global Error:', error);
    }, [error]);

    return (
        <html lang="ko">
            <body>
                <div
                    style={{
                        minHeight: '100vh',
                        background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                >
                    {/* Card */}
                    <div
                        style={{
                            width: '100%',
                            maxWidth: '28rem',
                            backgroundColor: 'rgba(30, 41, 59, 0.8)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: '1rem',
                            border: '1px solid #334155',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            padding: '2rem',
                        }}
                    >
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            {/* Icon */}
                            <div
                                style={{
                                    margin: '0 auto 1rem',
                                    width: '4rem',
                                    height: '4rem',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    borderRadius: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <svg
                                    style={{ width: '2rem', height: '2rem', color: '#f87171' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            {/* Title */}
                            <h2
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    color: 'white',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                심각한 오류가 발생했습니다
                            </h2>
                            {/* Description */}
                            <p
                                style={{
                                    color: '#94a3b8',
                                    fontSize: '0.875rem',
                                    lineHeight: '1.5',
                                }}
                            >
                                죄송합니다. 애플리케이션에서 예기치 않은 오류가 발생했습니다.
                                <br />
                                페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
                            </p>
                            {error.digest && (
                                <p
                                    style={{
                                        color: '#64748b',
                                        fontSize: '0.75rem',
                                        marginTop: '0.5rem',
                                    }}
                                >
                                    오류 코드: {error.digest}
                                </p>
                            )}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Primary Button - 조합온 primary 색상 */}
                            <button
                                onClick={reset}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    backgroundColor: '#4e8c6d',
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    fontWeight: '500',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#3d7358')}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4e8c6d')}
                            >
                                <svg
                                    style={{ width: '1rem', height: '1rem' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                다시 시도
                            </button>

                            {/* Secondary Button */}
                            <a
                                href="/"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    backgroundColor: 'transparent',
                                    color: '#cbd5e1',
                                    borderRadius: '0.5rem',
                                    fontWeight: '500',
                                    border: '1px solid #475569',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#334155';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#cbd5e1';
                                }}
                            >
                                <svg
                                    style={{ width: '1rem', height: '1rem' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                    />
                                </svg>
                                홈으로 이동
                            </a>
                        </div>

                        {/* Footer */}
                        <p
                            style={{
                                color: '#64748b',
                                fontSize: '0.75rem',
                                textAlign: 'center',
                                marginTop: '1rem',
                            }}
                        >
                            문제가 지속되면 관리자에게 문의해 주세요.
                        </p>
                    </div>
                </div>
            </body>
        </html>
    );
}
