'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Scale, Clock, Users, Phone, Building, Globe } from 'lucide-react';

/**
 * Terms of Service Page (English)
 * Required page for Kakao Sync integration
 */
export default function TermsEnglishPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="container mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            aria-label="Home"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-blue-600" />
                            <h1 className="text-xl font-bold text-slate-900">Terms of Service</h1>
                        </div>
                    </div>
                    <Link
                        href="/terms"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Globe className="w-4 h-4" />
                        <span>한국어</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    {/* Purpose */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Building className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 1 (Purpose)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-2">
                            <p>
                                These Terms of Service define the rights, obligations, responsibilities, and other 
                                necessary matters between Ratel (hereinafter &quot;Company&quot;) and users regarding the use of 
                                the Johapon service (hereinafter &quot;Service&quot;) provided by the Company.
                            </p>
                        </div>
                    </section>

                    {/* Definitions */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Scale className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 2 (Definitions)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-2">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>&quot;Service&quot;</strong> refers to the redevelopment/reconstruction union 
                                    management platform provided by the Company, including member management, 
                                    notification delivery, and Kakao notification services.
                                </li>
                                <li>
                                    <strong>&quot;User&quot;</strong> refers to union administrators and members who use 
                                    the Service in accordance with these Terms.
                                </li>
                                <li>
                                    <strong>&quot;Union&quot;</strong> refers to an association established for the purpose 
                                    of redevelopment/reconstruction improvement projects.
                                </li>
                                <li>
                                    <strong>&quot;Administrator&quot;</strong> refers to a person granted authority to 
                                    manage the Service for union operations.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Service Provision */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 3 (Service Provision)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>The Company provides the following services:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Member registration and management services</li>
                                <li>Notification and alert services</li>
                                <li>Kakao notification message services</li>
                                <li>Free board and Q&A services</li>
                                <li>Union information management services</li>
                                <li>Other services determined by the Company</li>
                            </ul>
                        </div>
                    </section>

                    {/* Contract Formation */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-amber-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 4 (Formation of Use Agreement)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>The use agreement is formed as follows:</p>
                            <ol className="list-decimal pl-6 space-y-2">
                                <li>Users agree to these Terms and log in with their Kakao account.</li>
                                <li>Users are registered as members through an invitation from the union administrator.</li>
                                <li>The use agreement is formed when the Company approves the use.</li>
                            </ol>
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-700">
                                    <strong>Note:</strong> This service supports easy login through Kakao accounts (Kakao Sync).
                                    When linking a Kakao account, profile information (nickname, profile picture) and email 
                                    may be collected.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* User Obligations */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <Scale className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 5 (User Obligations)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>Users shall not engage in the following activities:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Stealing others&apos; information or registering false information</li>
                                <li>Using the Service in violation of laws or public order and morals</li>
                                <li>Infringing on the intellectual property rights of the Company or third parties</li>
                                <li>Interfering with the operation of the Service or compromising its stability</li>
                                <li>Other illegal or unfair activities</li>
                            </ul>
                        </div>
                    </section>

                    {/* Service Suspension */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-slate-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 6 (Restriction and Suspension of Service)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>The Company may restrict or suspend Service use in the following cases:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>When regular or emergency maintenance, inspection, or replacement of service equipment is required</li>
                                <li>When a user violates these Terms</li>
                                <li>When other force majeure events occur</li>
                            </ul>
                        </div>
                    </section>

                    {/* Disclaimer */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 7 (Disclaimer)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    The Company shall be exempt from liability when unable to provide the Service due 
                                    to force majeure events such as natural disasters, war, terrorism, or hacking.
                                </li>
                                <li>
                                    The Company shall not be liable for damages caused by users disclosing their 
                                    personal information to others.
                                </li>
                                <li>
                                    The Company shall not intervene in or be liable for disputes between users 
                                    or between users and third parties.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Amendment of Terms */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 8 (Amendment of Terms)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                The Company may amend these Terms as necessary within the scope that does not violate 
                                applicable laws. When the Terms are amended, the Company will provide notice through 
                                announcements within the Service at least 7 days before the effective date.
                            </p>
                        </div>
                    </section>

                    {/* Contact */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Phone className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 9 (Contact Information)</h2>
                        </div>
                        <div className="pl-13">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700">
                                <p><strong>Company Name:</strong> Ratel</p>
                                <p><strong>Representative:</strong> Inju Jung</p>
                                <p><strong>Business Registration No.:</strong> 276-40-01354</p>
                                <p><strong>Address:</strong> 9, Insubong-ro 6-ga-gil, Gangbuk-gu, Seoul, Republic of Korea</p>
                                <p><strong>Email:</strong> injostar@naver.com</p>
                                <p><strong>Phone:</strong> +82-10-3504-8164</p>
                            </div>
                        </div>
                    </section>

                    {/* Effective Date */}
                    <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
                        <p>These Terms of Service are effective from January 1, 2024.</p>
                        <p className="mt-2">Last updated: December 15, 2024</p>
                    </div>
                </div>

                {/* Related Links */}
                <div className="mt-6 flex justify-center gap-4">
                    <Link
                        href="/privacy/en"
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                    >
                        View Privacy Policy →
                    </Link>
                </div>
            </main>
        </div>
    );
}

