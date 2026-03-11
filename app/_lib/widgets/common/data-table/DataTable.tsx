'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInView } from 'react-intersection-observer';
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
 * StickyHeaderTable: 커스텀 횡스크롤바를 뷰포트 하단에 fixed로 표시하는 래퍼 컴포넌트
 * macOS 오버레이 스크롤바 환경에서도 항상 횡스크롤바가 보이도록 커스텀 트랙+썸을 직접 렌더링
 * position: fixed + IntersectionObserver로 테이블이 화면에 보일 때만 표시
 */
function StickyHeaderTable({
    children,
    className,
    maxHeight,
    minWidth,
}: {
    children: React.ReactNode;
    className?: string;
    maxHeight?: string;
    minWidth?: string;
}) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const [needsScrollbar, setNeedsScrollbar] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [thumbWidth, setThumbWidth] = useState(0);
    const [thumbLeft, setThumbLeft] = useState(0);
    const [trackRect, setTrackRect] = useState({ left: 0, width: 0 });
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartScrollLeft = useRef(0);

    // 스크롤 필요 여부 + 트랙 위치/크기 계산
    useEffect(() => {
        const container = scrollContainerRef.current;
        const wrapper = wrapperRef.current;
        if (!container || !wrapper) return;

        const update = () => {
            const { scrollWidth, clientWidth } = container;
            const needs = scrollWidth > clientWidth;
            setNeedsScrollbar(needs);
            if (needs) {
                const wrapperRect = wrapper.getBoundingClientRect();
                const ratio = clientWidth / scrollWidth;
                setTrackRect({ left: wrapperRect.left, width: wrapperRect.width });
                setThumbWidth(Math.max(ratio * wrapperRect.width, 40));
            }
        };

        update();
        const observer = new ResizeObserver(update);
        observer.observe(container);
        window.addEventListener('resize', update);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    // IntersectionObserver: 테이블이 화면에 보이는지 감지
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.01 }
        );
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, []);

    // 스크롤 위치 변경 시 트랙 위치 갱신 (페이지 스크롤로 wrapper 위치 변할 수 있음)
    useEffect(() => {
        if (!needsScrollbar || !isVisible) return;
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const updateTrackPos = () => {
            const rect = wrapper.getBoundingClientRect();
            setTrackRect(prev => {
                if (prev.left !== rect.left || prev.width !== rect.width) {
                    return { left: rect.left, width: rect.width };
                }
                return prev;
            });
        };

        window.addEventListener('scroll', updateTrackPos, { passive: true });
        return () => window.removeEventListener('scroll', updateTrackPos);
    }, [needsScrollbar, isVisible]);

    // 메인 컨테이너 스크롤 → 썸 위치 동기화
    const handleMainScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || isDragging.current) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll <= 0) return;

        const ratio = scrollLeft / maxScroll;
        const maxThumbLeft = trackRect.width - thumbWidth;
        setThumbLeft(ratio * maxThumbLeft);
    }, [thumbWidth, trackRect.width]);

    // 썸 드래그 시작
    const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartScrollLeft.current = scrollContainerRef.current?.scrollLeft || 0;

        const handleMouseMove = (ev: MouseEvent) => {
            if (!isDragging.current) return;
            const container = scrollContainerRef.current;
            if (!container) return;

            const deltaX = ev.clientX - dragStartX.current;
            const maxThumbLeft = trackRect.width - thumbWidth;
            const { scrollWidth, clientWidth } = container;
            const maxScroll = scrollWidth - clientWidth;

            const scrollDelta = (deltaX / maxThumbLeft) * maxScroll;
            container.scrollLeft = dragStartScrollLeft.current + scrollDelta;
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [thumbWidth, trackRect.width]);

    // 트랙 클릭 → 해당 위치로 스크롤
    const handleTrackClick = useCallback((e: React.MouseEvent) => {
        if (e.target === thumbRef.current) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        const clickX = e.clientX - trackRect.left;
        const ratio = clickX / trackRect.width;
        const { scrollWidth, clientWidth } = container;
        container.scrollLeft = ratio * (scrollWidth - clientWidth);
    }, [trackRect]);

    const showBar = needsScrollbar && isVisible;

    return (
        <div ref={wrapperRef} className={cn('relative', className)}>
            {/* 메인 스크롤 컨테이너 */}
            <div
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-auto"
                style={{ maxHeight }}
                onScroll={handleMainScroll}
            >
                <div
                    className="[&_[data-slot=table-container]]:!overflow-visible"
                    style={{ minWidth }}
                >
                    {children}
                </div>
            </div>

            {/* 커스텀 횡스크롤바 — position: fixed로 뷰포트 하단에 항상 표시 */}
            {showBar && (
                <div
                    className="fixed bottom-0 z-50 cursor-pointer"
                    style={{
                        left: `${trackRect.left}px`,
                        width: `${trackRect.width}px`,
                        height: '20px',
                        background: '#e8e8e8',
                        borderTop: '1px solid #ccc',
                        boxShadow: '0 -2px 6px rgba(0,0,0,0.1)',
                    }}
                    onClick={handleTrackClick}
                >
                    {/* 썸 (드래그 가능한 핸들) */}
                    <div
                        ref={thumbRef}
                        className="absolute top-[4px] rounded-full cursor-grab active:cursor-grabbing"
                        style={{
                            left: `${thumbLeft}px`,
                            width: `${thumbWidth}px`,
                            height: '12px',
                            background: '#999',
                            transition: isDragging.current ? 'none' : 'left 0.05s ease-out',
                        }}
                        onMouseDown={handleThumbMouseDown}
                    />
                </div>
            )}
        </div>
    );
}

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
    pagination: _pagination,
    infiniteScroll,
    onRowClick,
    getRowClassName,
    selectable,
    actions,
    variant = 'default',
    className,
    minWidth = '800px',
    maxHeight,
    stickyHeader = false,
    renderEmpty,
    renderLoading,
}: DataTableProps<T>) {
    const styles = variantStyles[variant];

    // 무한 스크롤: Intersection Observer 설정 (50% 스크롤 시점에서 재조회)
    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0.5,
        rootMargin: '0px',
    });

    // 무한 스크롤: 하단 도달 시 자동으로 다음 페이지 로드
    useEffect(() => {
        if (infiniteScroll && inView && infiniteScroll.hasNextPage && !infiniteScroll.isFetchingNextPage) {
            infiniteScroll.fetchNextPage();
        }
    }, [inView, infiniteScroll]);

    // 전체 선택 상태 계산
    const selectableRows = selectable?.isSelectable ? data.filter((row) => selectable.isSelectable!(row)) : data;
    const allSelected =
        selectable &&
        selectableRows.length > 0 &&
        selectableRows.every((row) => selectable.selectedKeys.includes(keyExtractor(row)));
    const _someSelected =
        selectable && selectableRows.some((row) => selectable.selectedKeys.includes(keyExtractor(row)));

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

    // stickyHeader 모드: 가로 스크롤 동기화 (Ref 사용으로 리렌더링 방지)
    const fakeScrollbarRef = useRef<HTMLDivElement>(null);
    const tableWrapperRef = useRef<HTMLDivElement>(null);

    // 가짜 스크롤바 스크롤 시 테이블 이동 (Direct DOM Manipulation)
    const handleFakeScrollbarScroll = useCallback(() => {
        if (fakeScrollbarRef.current && tableWrapperRef.current) {
            const scrollLeft = fakeScrollbarRef.current.scrollLeft;
            tableWrapperRef.current.style.left = `-${scrollLeft}px`;
        }
    }, []);

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

    // stickyHeader 모드일 때의 렌더링
    // 메인 컨테이너: overflow-y auto + overflow-x hidden (세로 스크롤만)
    // 하단: 가짜 횡스크롤바를 sticky로 항상 표시
    if (stickyHeader && maxHeight) {
        return (
            <StickyHeaderTable
                className={className}
                maxHeight={maxHeight}
                minWidth={minWidth}
            >
                        <Table className="table-fixed" style={{ minWidth }}>
                            {/* 고정 헤더 - sticky로 상단 고정 */}
                            <TableHeader className={cn(styles.header, 'bg-gray-50 sticky top-0 z-10')}>
                                <TableRow className="hover:bg-transparent">
                                    {/* 체크박스 헤더 */}
                                    {selectable && (
                                        <TableHead className={cn('w-12 px-4 bg-gray-50 sticky top-0 z-10', styles.headerCell)}>
                                            <Checkbox
                                                checked={allSelected}
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
                                            className={cn('w-20 whitespace-nowrap px-4 bg-gray-50 sticky top-0 z-10', styles.headerCell)}
                                        >
                                            {actions.headerText || '관리'}
                                        </TableHead>
                                    )}

                                    {/* 컬럼 헤더 */}
                                    {columns.map((column) => (
                                        <TableHead
                                            key={column.key}
                                            className={cn(
                                                'whitespace-nowrap px-4 py-4 bg-gray-50 sticky top-0 z-10',
                                                styles.headerCell,
                                                getAlignClass(column.align),
                                                column.headerClassName
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
                                            className={cn('w-20 whitespace-nowrap px-4 bg-gray-50 sticky top-0 z-10', styles.headerCell)}
                                        >
                                            {actions.headerText || '관리'}
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>

                            {/* 테이블 바디 */}
                            <TableBody>
                                {data.map((row, rowIndex) => {
                                    const key = keyExtractor(row);
                                    const isSelected = selectable?.selectedKeys.includes(key);
                                    const isRowSelectable = selectable?.isSelectable
                                        ? selectable.isSelectable(row)
                                        : true;
                                    const customRowClassName = getRowClassName ? getRowClassName(row) : '';

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
                                                <TableCell className="px-4 w-12">
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
                                                <TableCell className="px-4 w-20" onClick={(e) => e.stopPropagation()}>
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
                                                            column.numeric && 'tabular-nums',
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
                                                <TableCell className="px-4 w-20" onClick={(e) => e.stopPropagation()}>
                                                    {actions.render(row)}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* 무한 스크롤 로딩 영역 */}
                        {infiniteScroll && (infiniteScroll.isFetchingNextPage || infiniteScroll.hasNextPage) && (
                            <div
                                ref={loadMoreRef}
                                className="flex items-center justify-center py-4 border-t border-gray-100"
                            >
                                {infiniteScroll.isFetchingNextPage ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="text-[14px]">데이터를 불러오는 중...</span>
                                    </div>
                                ) : infiniteScroll.hasNextPage ? (
                                    <div className="text-[14px] text-gray-400">스크롤하여 더 보기</div>
                                ) : null}
                            </div>
                        )}
            </StickyHeaderTable>
        );
    }

    // 기본 모드 (stickyHeader가 false이거나 maxHeight가 없을 때)
    return (
        <div className={cn('space-y-0', className)}>
            {/* 테이블 컨테이너 - 가로/세로 스크롤 */}
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: maxHeight || undefined }}>
                <Table style={{ minWidth }}>
                    <TableHeader className={styles.header}>
                        <TableRow className="hover:bg-transparent">
                            {/* 체크박스 헤더 */}
                            {selectable && (
                                <TableHead className={cn('w-12 px-4', styles.headerCell)}>
                                    <Checkbox
                                        checked={allSelected}
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
                                <TableHead className={cn('w-20 whitespace-nowrap px-4', styles.headerCell)}>
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
                                <TableHead className={cn('w-20 whitespace-nowrap px-4', styles.headerCell)}>
                                    {actions.headerText || '관리'}
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {data.map((row, rowIndex) => {
                            const key = keyExtractor(row);
                            const isSelected = selectable?.selectedKeys.includes(key);
                            const isRowSelectable = selectable?.isSelectable ? selectable.isSelectable(row) : true;
                            const customRowClassName = getRowClassName ? getRowClassName(row) : '';

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
                                        <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
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
                                                    column.numeric && 'tabular-nums',
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
                                        <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                                            {actions.render(row)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* 무한 스크롤 로딩 영역 - 로딩 중이거나 다음 페이지가 있을 때만 표시 */}
            {infiniteScroll && (infiniteScroll.isFetchingNextPage || infiniteScroll.hasNextPage) && (
                <div ref={loadMoreRef} className="flex items-center justify-center py-4 border-t border-gray-100">
                    {infiniteScroll.isFetchingNextPage ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[14px]">데이터를 불러오는 중...</span>
                        </div>
                    ) : infiniteScroll.hasNextPage ? (
                        <div className="text-[14px] text-gray-400">스크롤하여 더 보기</div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

export default DataTable;
