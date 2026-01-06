import React from 'react';

/**
 * 컬럼 정의 인터페이스
 * @template T - 데이터 행의 타입
 */
export interface ColumnDef<T> {
    /** 컬럼 고유 키 */
    key: string;
    /** 헤더 텍스트 또는 React 노드 */
    header: string | React.ReactNode;
    /** 데이터 접근자 함수 (key로 자동 접근하지 않을 때 사용) */
    accessor?: (row: T) => unknown;
    /** 셀 커스텀 렌더링 함수 */
    render?: (value: unknown, row: T, index: number) => React.ReactNode;
    /** 셀 className */
    className?: string;
    /** 헤더 className */
    headerClassName?: string;
    /** 텍스트 정렬 */
    align?: 'left' | 'center' | 'right';
    /** 텍스트 줄바꿈 허용 여부 (기본값: false = nowrap) */
    wrap?: boolean;
    /** 최소 너비 (예: '120px', '10rem') */
    minWidth?: string;
    /** 너비 (예: '200px', '20%') */
    width?: string;
}

/**
 * 페이지네이션 Props (레거시 - 하위 호환성 유지)
 * @deprecated 무한 스크롤(InfiniteScrollProps)을 사용하세요
 */
export interface PaginationProps {
    /** 현재 페이지 (1부터 시작) */
    currentPage: number;
    /** 전체 페이지 수 */
    totalPages: number;
    /** 전체 아이템 수 */
    totalItems: number;
    /** 페이지당 아이템 수 */
    pageSize: number;
    /** 페이지 변경 핸들러 */
    onPageChange: (page: number) => void;
}

/**
 * 무한 스크롤 Props
 */
export interface InfiniteScrollProps {
    /** 다음 페이지 존재 여부 */
    hasNextPage: boolean;
    /** 다음 페이지 로딩 중 여부 */
    isFetchingNextPage: boolean;
    /** 다음 페이지 로드 함수 */
    fetchNextPage: () => void;
    /** 전체 아이템 수 (선택적, 표시용) */
    totalItems?: number;
}

/**
 * 체크박스 선택 Props
 */
export interface SelectableProps {
    /** 선택된 키 배열 */
    selectedKeys: (string | number)[];
    /** 개별 선택 핸들러 */
    onSelect: (key: string | number, selected: boolean) => void;
    /** 전체 선택 핸들러 */
    onSelectAll?: (selected: boolean) => void;
    /** 선택 가능 여부 판단 함수 */
    isSelectable?: (row: unknown) => boolean;
}

/**
 * 액션 컬럼 Props
 */
export interface ActionsProps<T> {
    /** 액션 렌더링 함수 */
    render: (row: T) => React.ReactNode;
    /** 액션 컬럼 위치 (기본값: 'end') */
    position?: 'start' | 'end';
    /** 액션 컬럼 헤더 텍스트 */
    headerText?: string;
}

/**
 * 테이블 테마 variant
 */
export type TableVariant = 'default' | 'dark' | 'minimal';

/**
 * DataTable 메인 Props
 * @template T - 데이터 행의 타입
 */
export interface DataTableProps<T> {
    // === 데이터 ===
    /** 테이블 데이터 배열 */
    data: T[];
    /** 컬럼 정의 배열 */
    columns: ColumnDef<T>[];
    /** 행의 고유 키 추출 함수 */
    keyExtractor: (row: T) => string | number;

    // === 상태 ===
    /** 로딩 상태 */
    isLoading?: boolean;
    /** 빈 상태 메시지 */
    emptyMessage?: string;
    /** 빈 상태 아이콘 */
    emptyIcon?: React.ReactNode;

    // === 페이지네이션 / 무한 스크롤 ===
    /** 페이지네이션 설정 (레거시, 무한 스크롤 권장) */
    pagination?: PaginationProps;
    /** 무한 스크롤 설정 (권장) */
    infiniteScroll?: InfiniteScrollProps;

    // === 행 동작 ===
    /** 행 클릭 핸들러 */
    onRowClick?: (row: T) => void;
    /** 행 className 동적 지정 */
    getRowClassName?: (row: T) => string;

    // === 체크박스 선택 ===
    /** 체크박스 선택 설정 (없으면 체크박스 미표시) */
    selectable?: SelectableProps;

    // === 액션 컬럼 ===
    /** 액션 컬럼 설정 */
    actions?: ActionsProps<T>;

    // === 스타일 ===
    /** 테이블 테마 */
    variant?: TableVariant;
    /** 테이블 컨테이너 className */
    className?: string;
    /** 테이블 최소 너비 (기본값: '800px') */
    minWidth?: string;

    // === 커스텀 렌더링 ===
    /** 커스텀 빈 상태 렌더링 */
    renderEmpty?: () => React.ReactNode;
    /** 커스텀 로딩 상태 렌더링 */
    renderLoading?: () => React.ReactNode;
}

/**
 * 테마별 스타일 정의
 */
export interface TableStyles {
    header: string;
    headerCell: string;
    row: string;
    rowHover: string;
    cell: string;
    container: string;
}
