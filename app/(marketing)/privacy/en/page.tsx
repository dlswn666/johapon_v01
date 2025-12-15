'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Database, Clock, Users, Phone, AlertTriangle, FileText, Globe } from 'lucide-react';

/**
 * Privacy Policy Page (English)
 * Required page for Kakao Sync integration
 */
export default function PrivacyEnglishPage() {
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
                            <Shield className="w-6 h-6 text-emerald-600" />
                            <h1 className="text-xl font-bold text-slate-900">Privacy Policy</h1>
                        </div>
                    </div>
                    <Link
                        href="/privacy"
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
                    {/* Introduction */}
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-emerald-800">
                            Ratel (hereinafter &quot;Company&quot;) establishes and discloses this Privacy Policy in accordance 
                            with the Personal Information Protection Act and the Act on Promotion of Information and 
                            Communications Network Utilization and Information Protection to protect users&apos; personal 
                            information and handle related complaints promptly and smoothly.
                        </p>
                    </div>

                    {/* Collected Items */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Database className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 1 (Personal Information Collected)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>The Company collects the following personal information to provide services:</p>
                            
                            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded mr-2">
                                        Required
                                    </span>
                                    <span className="font-medium">Kakao Login</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>Kakao Account ID (unique identifier)</li>
                                        <li>Nickname</li>
                                        <li>Profile picture URL</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mr-2">
                                        Optional
                                    </span>
                                    <span className="font-medium">Kakao Login</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>Email address</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded mr-2">
                                        Required
                                    </span>
                                    <span className="font-medium">Member Registration</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>Name</li>
                                        <li>Mobile phone number</li>
                                        <li>Property address</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mr-2">
                                        Optional
                                    </span>
                                    <span className="font-medium">Member Registration</span>
                                    <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                                        <li>Date of birth</li>
                                        <li>Detailed address</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-700">
                                    <strong>Automatically Collected Information:</strong> IP address, access time, 
                                    browser information, etc. may be automatically collected during service use.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Purpose of Collection */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 2 (Purpose of Collection and Use)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <ul className="list-disc pl-6 space-y-2">
                                <li>
                                    <strong>Member Management:</strong> Identity verification, confirmation of registration intention, 
                                    identification and authentication for service use
                                </li>
                                <li>
                                    <strong>Service Provision:</strong> Member registration, notification and alert delivery, 
                                    complaint handling
                                </li>
                                <li>
                                    <strong>Notification of major events such as union general meetings</strong>
                                </li>
                                <li>
                                    <strong>Customer consultation and complaint handling</strong>
                                </li>
                                <li>
                                    <strong>Service Improvement:</strong> Service usage statistics, new service development
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Retention Period */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 3 (Retention and Use Period)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                In principle, the Company destroys personal information without delay after the purpose 
                                of collection and use has been achieved. However, if retention is required by relevant 
                                laws, it will be retained for a certain period as follows:
                            </p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">Retention Items</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">Period</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">Legal Basis</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Records on contracts or withdrawal of subscriptions</td>
                                            <td className="border border-slate-300 px-3 py-2">5 years</td>
                                            <td className="border border-slate-300 px-3 py-2">E-Commerce Act</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Records on payment and supply of goods</td>
                                            <td className="border border-slate-300 px-3 py-2">5 years</td>
                                            <td className="border border-slate-300 px-3 py-2">E-Commerce Act</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Records on consumer complaints or dispute resolution</td>
                                            <td className="border border-slate-300 px-3 py-2">3 years</td>
                                            <td className="border border-slate-300 px-3 py-2">E-Commerce Act</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Access logs</td>
                                            <td className="border border-slate-300 px-3 py-2">3 months</td>
                                            <td className="border border-slate-300 px-3 py-2">Communications Privacy Act</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* Third Party Provision */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-amber-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 4 (Provision to Third Parties)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                In principle, the Company does not provide users&apos; personal information to third parties.
                                However, the following cases are exceptions:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>When the user has given prior consent</li>
                                <li>When required by law or when requested by investigative agencies in accordance with 
                                    procedures and methods prescribed by law for investigation purposes</li>
                            </ul>
                        </div>
                    </section>

                    {/* Processing Entrustment */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Database className="w-5 h-5 text-slate-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 5 (Entrustment of Processing)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>The Company entrusts personal information processing as follows for smooth service provision:</p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">Trustee</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left font-medium">Entrusted Tasks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Supabase Inc.</td>
                                            <td className="border border-slate-300 px-3 py-2">Database hosting and management</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Vercel Inc.</td>
                                            <td className="border border-slate-300 px-3 py-2">Web service hosting</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Aligo</td>
                                            <td className="border border-slate-300 px-3 py-2">Kakao notification message delivery</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 px-3 py-2">Kakao</td>
                                            <td className="border border-slate-300 px-3 py-2">Kakao login authentication</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* User Rights */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Lock className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 6 (User Rights and How to Exercise Them)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>Users may exercise the following rights at any time:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Request to view personal information</li>
                                <li>Request to correct or delete personal information</li>
                                <li>Request to suspend processing of personal information</li>
                                <li>Withdraw consent</li>
                            </ul>
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    Rights can be exercised through the settings menu within the service or by requesting 
                                    in writing or by email to the personal information protection officer.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Security Measures */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 7 (Security Measures)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>The Company takes the following measures to ensure the security of personal information:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Administrative Measures:</strong> Establishment and implementation of internal 
                                    management plans, regular employee training</li>
                                <li><strong>Technical Measures:</strong> Access authority management for personal information 
                                    processing systems, installation of access control systems, encryption of unique 
                                    identification information, installation of security programs</li>
                                <li><strong>Physical Measures:</strong> Access control to computer rooms and data storage rooms</li>
                            </ul>
                        </div>
                    </section>

                    {/* Right to Refuse Consent */}
                    <section className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 8 (Right to Refuse Consent and Disadvantages)</h2>
                        </div>
                        <div className="pl-13 text-slate-700 space-y-4">
                            <p>
                                Users have the right to refuse consent to the collection and use of personal information.
                            </p>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                    <strong>Caution:</strong> If you refuse consent to required items, use of the service 
                                    may be restricted.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Privacy Officer */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Phone className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Article 9 (Personal Information Protection Officer)</h2>
                        </div>
                        <div className="pl-13">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700">
                                <p><strong>Personal Information Protection Officer</strong></p>
                                <p>Name: Inju Jung</p>
                                <p>Position: CEO</p>
                                <p>Email: injostar@naver.com</p>
                                <p>Phone: +82-10-3504-8164</p>
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    For inquiries, complaints, or damage relief regarding personal information processing, 
                                    please contact the personal information protection officer above.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Effective Date */}
                    <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
                        <p>This Privacy Policy is effective from January 1, 2024.</p>
                        <p className="mt-2">Last updated: December 15, 2024</p>
                    </div>
                </div>

                {/* Related Links */}
                <div className="mt-6 flex justify-center gap-4">
                    <Link
                        href="/terms/en"
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                    >
                        ← View Terms of Service
                    </Link>
                </div>
            </main>
        </div>
    );
}

