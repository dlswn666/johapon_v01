'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import useUserStore from '@/shared/store/userStore';
import UserDataGrid from '@/components/admin/UserDataGrid';
import UserExcelUpload from '@/components/admin/UserExcelUpload';
import { UserDisplayData } from '@/entities/user/model/types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

const UserManagementPage: React.FC = () => {
    const params = useParams();
    const homepage = params.homepage as string;

    const {
        users,
        loading,
        error,
        totalCount,
        currentPage,
        pageSize,
        filters,
        fetchUsers,
        setFilters,
        clearFilters,
        updateUser,
        deleteUser,
    } = useUserStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // 컴포넌트 마운트 시 사용자 목록 로드
    useEffect(() => {
        if (homepage) {
            fetchUsers(homepage);
        }
    }, [homepage, fetchUsers]);

    // 필터 적용
    const handleSearch = () => {
        const newFilters = {
            q: searchQuery || undefined,
            role: roleFilter === 'all' ? undefined : roleFilter,
            status: statusFilter === 'all' ? undefined : statusFilter,
        };
        setFilters(newFilters);
        if (homepage) {
            fetchUsers(homepage, newFilters);
        }
    };

    // 필터 초기화
    const handleClearFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
        setStatusFilter('all');
        clearFilters();
        if (homepage) {
            fetchUsers(homepage, {});
        }
    };

    // 사용자 수정 (간단한 인라인 수정)
    const handleUserEdit = async (user: UserDisplayData) => {
        // 실제로는 모달이나 별도 페이지에서 수정하겠지만,
        // 여기서는 간단히 상태 토글로 예시
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        try {
            if (homepage) {
                await updateUser(homepage, user.id, { status: newStatus });
                alert(`${user.name} 사용자의 상태가 ${newStatus}로 변경되었습니다.`);
            }
        } catch (error) {
            alert('사용자 수정에 실패했습니다.');
        }
    };

    // 사용자 삭제
    const handleUserDelete = async (userId: string) => {
        const user = users.find((u) => u.id === userId);
        if (!user) return;

        if (confirm(`${user.name} 사용자를 삭제하시겠습니까?`)) {
            try {
                if (homepage) {
                    await deleteUser(homepage, userId);
                    alert('사용자가 삭제되었습니다.');
                }
            } catch (error) {
                alert('사용자 삭제에 실패했습니다.');
            }
        }
    };

    // 엑셀 업로드 성공 처리
    const handleUploadSuccess = (result: { inserted: number }) => {
        alert(`${result.inserted}명의 사용자가 성공적으로 등록되었습니다.`);
        if (homepage) {
            fetchUsers(homepage); // 목록 새로고침
        }
    };

    // 엑셀 업로드 에러 처리
    const handleUploadError = (error: string) => {
        alert(`업로드 실패: ${error}`);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">사용자 관리</h1>
                    <p className="text-muted-foreground">시스템 사용자를 관리하고 일괄 등록할 수 있습니다.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                    <p className="text-destructive">{error}</p>
                </div>
            )}

            <Tabs defaultValue="list" className="w-full">
                <TabsList>
                    <TabsTrigger value="list">사용자 목록</TabsTrigger>
                    <TabsTrigger value="upload">일괄 등록</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>검색 및 필터</CardTitle>
                            <CardDescription>사용자를 검색하고 필터링할 수 있습니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">이름 검색</label>
                                    <Input
                                        placeholder="사용자 이름"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">권한</label>
                                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="권한 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">전체</SelectItem>
                                            <SelectItem value="member">회원</SelectItem>
                                            <SelectItem value="admin">관리자</SelectItem>
                                            <SelectItem value="systemadmin">시스템관리자</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">상태</label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="상태 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">전체</SelectItem>
                                            <SelectItem value="active">활성</SelectItem>
                                            <SelectItem value="inactive">비활성</SelectItem>
                                            <SelectItem value="pending">대기</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">&nbsp;</label>
                                    <div className="flex gap-2">
                                        <Button onClick={handleSearch} className="flex-1">
                                            검색
                                        </Button>
                                        <Button variant="outline" onClick={handleClearFilters} className="flex-1">
                                            초기화
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>사용자 목록 ({totalCount}명)</CardTitle>
                            <CardDescription>등록된 사용자 목록을 확인하고 관리할 수 있습니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserDataGrid
                                users={users}
                                loading={loading}
                                onUserEdit={handleUserEdit}
                                onUserDelete={handleUserDelete}
                                currentPage={currentPage}
                                totalPages={Math.ceil(totalCount / pageSize)}
                                pageSize={pageSize}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>사용자 일괄 등록</CardTitle>
                            <CardDescription>
                                엑셀 파일을 업로드하여 여러 사용자를 한번에 등록할 수 있습니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserExcelUpload
                                slug={homepage}
                                onUploadSuccess={handleUploadSuccess}
                                onUploadError={handleUploadError}
                                loading={loading}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default UserManagementPage;
