export interface User {
    id: string;
    user_id: string;
    name: string;
    property_location?: string; // DB의 실제 컬럼명
    phone?: string;
    user_type: 'member' | 'admin' | 'systemadmin'; // DB의 실제 컬럼명
    is_approved?: boolean; // DB의 실제 컬럼명
    created_at: string;
    updated_at?: string;
}

// 화면에서 사용할 인터페이스 (변환된 데이터)
export interface UserDisplayData {
    id: string;
    user_id: string;
    name: string;
    address?: string;
    phone?: string;
    role: 'member' | 'admin' | 'systemadmin';
    status: 'active' | 'inactive' | 'pending';
    created_at: string;
    updated_at?: string;
}

export interface UserCreateInput {
    user_id: string;
    name: string;
    property_location?: string; // DB 컬럼명에 맞춤
    phone?: string;
    user_type?: 'member' | 'admin' | 'systemadmin'; // DB 컬럼명에 맞춤
    is_approved?: boolean; // DB 컬럼명에 맞춤
}

export interface UserUpdateInput {
    name?: string;
    property_location?: string; // DB 컬럼명에 맞춤
    phone?: string;
    user_type?: 'member' | 'admin' | 'systemadmin'; // DB 컬럼명에 맞춤
    is_approved?: boolean; // DB 컬럼명에 맞춤
    // 화면에서 사용하는 필드들도 추가
    address?: string;
    role?: 'member' | 'admin' | 'systemadmin';
    status?: 'active' | 'inactive' | 'pending';
}

export interface UserFilterParams {
    q?: string;
    role?: string;
    status?: string;
    page?: number;
    page_size?: number;
}

export interface UserListResponse {
    items: UserDisplayData[];
    page: number;
    page_size: number;
    total: number;
}

export interface ExcelUploadResult {
    inserted: number;
    errors?: string[];
}
