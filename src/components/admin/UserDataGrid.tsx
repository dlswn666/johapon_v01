'use client';

import React, { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    createColumnHelper,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table';
import { UserDisplayData } from '@/entities/user/model/types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';

interface UserDataGridProps {
    users: UserDisplayData[];
    loading?: boolean;
    onUserEdit?: (user: UserDisplayData) => void;
    onUserDelete?: (userId: string) => void;
    onPageChange?: (page: number) => void;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
}

const columnHelper = createColumnHelper<UserDisplayData>();

const UserDataGrid: React.FC<UserDataGridProps> = ({
    users,
    loading = false,
    onUserEdit,
    onUserDelete,
    onPageChange,
    currentPage = 1,
    totalPages = 1,
    pageSize = 20,
}) => {
    const columns = useMemo<ColumnDef<UserDisplayData, any>[]>(
        () => [
            columnHelper.accessor('user_id', {
                header: '사용자 ID',
                cell: (info) => info.getValue(),
                enableSorting: true,
            }),
            columnHelper.accessor('name', {
                header: '이름',
                cell: (info) => info.getValue(),
                enableSorting: true,
            }),
            columnHelper.accessor('address', {
                header: '주소',
                cell: (info) => info.getValue() || '-',
                enableSorting: false,
            }),
            columnHelper.accessor('phone', {
                header: '전화번호',
                cell: (info) => info.getValue() || '-',
                enableSorting: false,
            }),
            columnHelper.accessor('role', {
                header: '권한',
                cell: (info) => {
                    const role = info.getValue();
                    const roleMap: {
                        [key: string]: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
                    } = {
                        member: { label: '회원', variant: 'default' },
                        admin: { label: '관리자', variant: 'secondary' },
                        systemadmin: { label: '시스템관리자', variant: 'destructive' },
                    };
                    const roleInfo = roleMap[role] || { label: role, variant: 'outline' };
                    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
                },
                enableSorting: true,
            }),
            columnHelper.accessor('status', {
                header: '상태',
                cell: (info) => {
                    const status = info.getValue();
                    const statusMap: {
                        [key: string]: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
                    } = {
                        active: { label: '활성', variant: 'default' },
                        inactive: { label: '비활성', variant: 'secondary' },
                        pending: { label: '대기', variant: 'outline' },
                    };
                    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
                    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
                },
                enableSorting: true,
            }),
            columnHelper.accessor('created_at', {
                header: '등록일',
                cell: (info) => {
                    const date = new Date(info.getValue());
                    return date.toLocaleDateString('ko-KR');
                },
                enableSorting: true,
            }),
            columnHelper.display({
                id: 'actions',
                header: '작업',
                cell: (info) => (
                    <div className="flex gap-2">
                        {onUserEdit && (
                            <Button size="sm" variant="outline" onClick={() => onUserEdit(info.row.original)}>
                                수정
                            </Button>
                        )}
                        {onUserDelete && (
                            <Button size="sm" variant="destructive" onClick={() => onUserDelete(info.row.original.id)}>
                                삭제
                            </Button>
                        )}
                    </div>
                ),
            }),
        ],
        [onUserEdit, onUserDelete]
    );

    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: pageSize,
            },
        },
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* 검색 및 필터 */}
            <div className="flex items-center py-4">
                <Input
                    placeholder="이름으로 검색..."
                    value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                    onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
                    className="max-w-sm"
                />
            </div>

            {/* 테이블 */}
            <div className="rounded-md border">
                <table className="w-full">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b bg-muted/50">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                                    >
                                        {header.isPlaceholder ? null : (
                                            <div
                                                className={
                                                    header.column.getCanSort()
                                                        ? 'cursor-pointer select-none hover:bg-accent rounded p-1'
                                                        : ''
                                                }
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <span className="ml-2">
                                                        {{
                                                            asc: '🔼',
                                                            desc: '🔽',
                                                        }[header.column.getIsSorted() as string] ?? '↕️'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="p-4 align-middle">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center">
                                    데이터가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 페이지네이션 */}
            <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">총 {users.length}개 항목</div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        이전
                    </Button>
                    <div className="flex items-center gap-1">
                        <span className="text-sm">
                            페이지 {currentPage} / {totalPages}
                        </span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        다음
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UserDataGrid;
