'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableProps, TableStyles, TableVariant } from './types';

/**
 * 테마별 스타일 정의
 */
const variantStyles: Record<TableVariant, TableStyles> = {
    default: {
        container: 'bg-white',
        header: 'bg-gray-50 border-b border-gray-200',
        headerCell: 'text-gray-700 font-bold text-[14px]',
        row: 'border-b border-gray-100',
        rowHover: 'hover:bg-gray-50',
        cell: 'text-gray-900 text-[14px]',
    },
    dark: {
        container: 'bg-slate-800/50',
        header: 'bg-slate-900/50 border-b border-slate-700',
        headerCell: 'text-slate-400 font-medium',
        row: 'border-b border-slate-700',
        rowHover: 'hover:bg-slate-800/50',
        cell: 'text-white',
    },
    minimal: {
        container: 'bg-transparent',
        header: 'border-b',
        headerCell: 'text-gray-600 font-medium',
        row: 'border-b border-gray-100',
        rowHover: 'hover:bg-gray-50/50',
        cell: 'text-gray-700',
    },
};

/**
 * 공통 DataTable 컴포넌트
 * 
 * @template T - 데이터 행의 타입
 * @example
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { key: 'name', header: '이름' },
 *   { key: 'email', header: '이메일', minWidth: '200px' },
 *   { 
 *     key: 'status', 
 *     header: '상태',
 *     render: (value) => <Badge>{value}</Badge>
 *   },
 * ];
 * 
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   keyExtractor={(row) => row.id}
 *   pagination={{ currentPage: 1, totalPages: 10, ... }}
 * />
 * ```
 */
export function DataTable<T extends object>({
    data,
    columns,
    keyExtractor,
    isLoading = false,
    emptyMessage = '데이터가 없습니다.',
    emptyIcon,
    pagination,
    onRowClick,
    getRowClassName,
    selectable,
    actions,
    variant = 'default',
    className,
    minWidth = '800px',
    renderEmpty,
    renderLoading,
}: DataTableProps<T>) {
    const styles = variantStyles[variant];

    // 전체 선택 상태 계산
    const selectableRows = selectable?.isSelectable
        ? data.filter((row) => selectable.isSelectable!(row))
        : data;
    const allSelected =
        selectable &&
        selectableRows.length > 0 &&
        selectableRows.every((row) =>
            selectable.selectedKeys.includes(keyExtractor(row))
        );
    const _someSelected =
        selectable &&
        selectableRows.some((row) =>
            selectable.selectedKeys.includes(keyExtractor(row))
        );

    // 셀 값 가져오기
    const getCellValue = (row: T, key: string, accessor?: (row: T) => unknown) => {
        if (accessor) {
            return accessor(row);
        }
        return (row as Record<string, unknown>)[key];
    };

    // 정렬 클래스 반환
    const getAlignClass = (align?: 'left' | 'center' | 'right') => {
        switch (align) {
            case 'center':
                return 'text-center';
            case 'right':
                return 'text-right';
            default:
                return 'text-left';
        }
    };

    // 로딩 상태 렌더링
    if (isLoading) {
        if (renderLoading) {
            return <>{renderLoading()}</>;
        }
        return (
            <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    // 빈 상태 렌더링
    if (!data || data.length === 0) {
        if (renderEmpty) {
            return <>{renderEmpty()}</>;
        }
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                {emptyIcon || <Inbox className="w-12 h-12 mb-4 text-gray-300" />}
                <p className="text-[16px]">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-0', className)}>
            {/* 테이블 컨테이너 - 가로 스크롤 */}
            <div className="overflow-x-auto">
                <Table className={cn(`min-w-[${minWidth}]`)}>
                    <TableHeader className={styles.header}>
                        <TableRow className="hover:bg-transparent">
                            {/* 체크박스 헤더 */}
                            {selectable && (
                                <TableHead className={cn('w-12 px-4', styles.headerCell)}>
                                    <Checkbox
                                        checked={allSelected}
                                        // indeterminate 상태는 someSelected && !allSelected 일 때
                                        onCheckedChange={(checked) => {
                                            if (selectable.onSelectAll) {
                                                selectable.onSelectAll(checked as boolean);
                                            }
                                        }}
                                        className="border-gray-300"
                                        aria-label="전체 선택"
                                    />
                                </TableHead>
                            )}

                            {/* 액션 헤더 (시작 위치) */}
                            {actions && actions.position === 'start' && (
                                <TableHead
                                    className={cn(
                                        'w-20 whitespace-nowrap px-4',
                                        styles.headerCell
                                    )}
                                >
                                    {actions.headerText || '관리'}
                                </TableHead>
                            )}

                            {/* 컬럼 헤더 */}
                            {columns.map((column) => (
                                <TableHead
                                    key={column.key}
                                    className={cn(
                                        'whitespace-nowrap px-4 py-4',
                                        styles.headerCell,
                                        getAlignClass(column.align),
                                        column.headerClassName,
                                        column.minWidth && `min-w-[${column.minWidth}]`,
                                        column.width && `w-[${column.width}]`
                                    )}
                                    style={{
                                        minWidth: column.minWidth,
                                        width: column.width,
                                    }}
                                >
                                    {column.header}
                                </TableHead>
                            ))}

                            {/* 액션 헤더 (끝 위치) */}
                            {actions && actions.position !== 'start' && (
                                <TableHead
                                    className={cn(
                                        'w-20 whitespace-nowrap px-4',
                                        styles.headerCell
                                    )}
                                >
                                    {actions.headerText || '관리'}
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {data.map((row, rowIndex) => {
                            const key = keyExtractor(row);
                            const isSelected = selectable?.selectedKeys.includes(key);
                            const isRowSelectable = selectable?.isSelectable
                                ? selectable.isSelectable(row)
                                : true;
                            const customRowClassName = getRowClassName
                                ? getRowClassName(row)
                                : '';

                            return (
                                <TableRow
                                    key={key}
                                    className={cn(
                                        styles.row,
                                        styles.rowHover,
                                        onRowClick && 'cursor-pointer',
                                        isSelected && 'bg-blue-50/50',
                                        customRowClassName
                                    )}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {/* 체크박스 셀 */}
                                    {selectable && (
                                        <TableCell className="px-4">
                                            <Checkbox
                                                checked={isSelected}
                                                disabled={!isRowSelectable}
                                                onCheckedChange={(checked) => {
                                                    selectable.onSelect(key, checked as boolean);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="border-gray-300"
                                                aria-label={`행 ${rowIndex + 1} 선택`}
                                            />
                                        </TableCell>
                                    )}

                                    {/* 액션 셀 (시작 위치) */}
                                    {actions && actions.position === 'start' && (
                                        <TableCell
                                            className="px-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {actions.render(row)}
                                        </TableCell>
                                    )}

                                    {/* 데이터 셀 */}
                                    {columns.map((column) => {
                                        const value = getCellValue(row, column.key, column.accessor);

                                        return (
                                            <TableCell
                                                key={column.key}
                                                className={cn(
                                                    'px-4 py-4',
                                                    styles.cell,
                                                    !column.wrap && 'whitespace-nowrap',
                                                    getAlignClass(column.align),
                                                    column.className
                                                )}
                                                style={{
                                                    minWidth: column.minWidth,
                                                    width: column.width,
                                                }}
                                            >
                                                {column.render
                                                    ? column.render(value, row, rowIndex)
                                                    : (value as React.ReactNode) ?? '-'}
                                            </TableCell>
                                        );
                                    })}

                                    {/* 액션 셀 (끝 위치) */}
                                    {actions && actions.position !== 'start' && (
                                        <TableCell
                                            className="px-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {actions.render(row)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* 페이지네이션 */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
                    <div className="text-[14px] text-gray-600">
                        총 {pagination.totalItems}건 중{' '}
                        {(pagination.currentPage - 1) * pagination.pageSize + 1}-
                        {Math.min(
                            pagination.currentPage * pagination.pageSize,
                            pagination.totalItems
                        )}
                        건
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                pagination.onPageChange(
                                    Math.max(1, pagination.currentPage - 1)
                                )
                            }
                            disabled={pagination.currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer transition-colors"
                            aria-label="이전 페이지"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-[14px] text-gray-900 font-medium px-2">
                            {pagination.currentPage} / {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                pagination.onPageChange(
                                    Math.min(pagination.totalPages, pagination.currentPage + 1)
                                )
                            }
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer transition-colors"
                            aria-label="다음 페이지"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable;
