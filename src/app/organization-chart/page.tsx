import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Crown, Phone, Mail, User, Users, Briefcase, UserCircle } from 'lucide-react';
import { organizationData } from '@/lib/mockData';
import type { OrgMember } from '@/lib/types';

function getIcon(level: number) {
    switch (level) {
        case 1:
            return Crown;
        case 2:
            return Briefcase;
        case 3:
            return User;
        default:
            return UserCircle;
    }
}

function getColor(level: number) {
    switch (level) {
        case 1:
            return {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                text: 'text-yellow-700',
                icon: 'text-yellow-600',
            };
        case 2:
            return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' };
        case 3:
            return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' };
        default:
            return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-600' };
    }
}

function PersonCard({ member, showConnector = false }: { member: OrgMember; showConnector?: boolean }) {
    const Icon = getIcon(member.level);
    const colors = getColor(member.level);
    return (
        <div className="relative">
            {showConnector && member.level > 1 && (
                <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-300 -translate-x-1/2" />
            )}
            <Card className={`${colors.bg} ${colors.border} border-2 hover:shadow-lg transition-shadow`}>
                <CardContent className="p-6 text-center">
                    <div className="mb-4">
                        <Icon className={`h-12 w-12 mx-auto ${colors.icon}`} />
                    </div>
                    <h3 className={`text-lg mb-2 ${colors.text}`}>{member.name}</h3>
                    <Badge variant="outline" className={`mb-3 ${colors.text} ${colors.border}`}>
                        {member.position}
                    </Badge>
                    {member.department && <p className="text-sm text-gray-600 mb-3">{member.department}</p>}
                </CardContent>
            </Card>
        </div>
    );
}

export default function OrganizationChartPage() {
    const chairman = organizationData.find((m) => m.level === 1);
    const staff = organizationData.filter((m) => m.level === 2);
    const employees = organizationData.filter((m) => m.level === 3);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-6">
                    <div className="flex items-center space-x-4">
                        <div>
                            <h1 className="text-3xl text-gray-900">조직도</h1>
                            <p className="text-gray-600 mt-1">작전현대아파트구역 주택재개발정비사업조합 조직 구성</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - 1:3:1 Layout */}
            <div className="max-w-none mx-auto px-6 sm:px-10 lg:px-32 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Sidebar */}
                    <div className="lg:col-span-1 space-y-6" />

                    {/* Center Content */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Organization Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    <span>조합 조직 개요</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                        <div className="text-2xl text-yellow-600 mb-2">{chairman ? 1 : 0}</div>
                                        <div className="text-sm text-gray-700">조합장</div>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl text-blue-600 mb-2">{staff.length}</div>
                                        <div className="text-sm text-gray-700">사무원</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl text-green-600 mb-2">{employees.length}</div>
                                        <div className="text-sm text-gray-700">일반 사원</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Organization Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="h-5 w-5 text-green-600" />
                                    <span>조직 구성도</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="space-y-12">
                                    {/* Level 1 - 조합장 */}
                                    {chairman && (
                                        <div className="flex justify-center">
                                            <div className="w-80">
                                                <PersonCard member={chairman} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Connector Line to Staff Level */}
                                    <div className="flex justify-center">
                                        <div className="w-0.5 h-8 bg-gray-300"></div>
                                    </div>

                                    {/* Level 2 - 사무원들 */}
                                    <div className="relative">
                                        <div
                                            className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-gray-300"
                                            style={{ width: '66%' }}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                                            {staff.map((member) => (
                                                <PersonCard key={member.id} member={member} showConnector />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Connectors to Employees */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="flex justify-center">
                                            <div className="w-0.5 h-8 bg-gray-300"></div>
                                        </div>
                                        <div className="flex justify-center">
                                            <div className="w-0.5 h-8 bg-gray-300"></div>
                                        </div>
                                        <div></div>
                                    </div>

                                    {/* Level 3 - 일반 사원들 */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {/* Staff 1 하위 사원들 */}
                                        <div className="space-y-6">
                                            <div className="relative">
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-0.5 bg-gray-300 w-full" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    {employees
                                                        .filter((e) => e.parentId === staff[0]?.id)
                                                        .map((member) => (
                                                            <PersonCard key={member.id} member={member} showConnector />
                                                        ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Staff 2 하위 사원 */}
                                        <div>
                                            {employees
                                                .filter((e) => e.parentId === staff[1]?.id)
                                                .map((member) => (
                                                    <PersonCard key={member.id} member={member} showConnector />
                                                ))}
                                        </div>

                                        {/* Staff 3 - Placeholder */}
                                        <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
                                            <p className="text-gray-500 text-sm">향후 추가 예정</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Phone className="h-5 w-5 text-purple-600" />
                                    <span>연락처 정보</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-gray-900 mb-3">조합 사무실</h4>
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <Phone className="h-4 w-4" />
                                                <span>대표전화: 032-123-4567</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Mail className="h-4 w-4" />
                                                <span>이메일: info@jakjeon-redevelopment.co.kr</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-gray-900 mb-3">업무 시간</h4>
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div>평일: 09:00 - 18:00</div>
                                            <div>토요일: 09:00 - 13:00</div>
                                            <div>일요일 및 공휴일: 휴무</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Sidebar */}
                    <div className="lg:col-span-1 space-y-6" />
                </div>
            </div>
        </div>
    );
}
