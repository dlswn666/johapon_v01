export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '13.0.5';
    };
    public: {
        Tables: {
            advertisements: {
                Row: {
                    id: string;
                    union_id: string;
                    type: 'MAIN' | 'SUB' | 'BOARD';
                    business_name: string;
                    contract_start_date: string;
                    contract_end_date: string;
                    price: number;
                    contract_file_url: string | null;
                    is_payment_completed: boolean;
                    image_url: string | null;
                    link_url: string | null;
                    title: string | null;
                    content: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    union_id: string;
                    type: 'MAIN' | 'SUB' | 'BOARD';
                    business_name: string;
                    contract_start_date: string;
                    contract_end_date: string;
                    price?: number;
                    contract_file_url?: string | null;
                    is_payment_completed?: boolean;
                    image_url?: string | null;
                    link_url?: string | null;
                    title?: string | null;
                    content?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    union_id?: string;
                    type?: 'MAIN' | 'SUB' | 'BOARD';
                    business_name?: string;
                    contract_start_date?: string;
                    contract_end_date?: string;
                    price?: number;
                    contract_file_url?: string | null;
                    is_payment_completed?: boolean;
                    image_url?: string | null;
                    link_url?: string | null;
                    title?: string | null;
                    content?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'advertisements_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            development_stages: {
                Row: {
                    id: string;
                    business_type: string;
                    stage_name: string;
                    sort_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    business_type: string;
                    stage_name: string;
                    sort_order: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    business_type?: string;
                    stage_name?: string;
                    sort_order?: number;
                    created_at?: string;
                };
                Relationships: [];
            };
            union_land_lots: {
                Row: {
                    id: string;
                    union_id: string;
                    pnu: string;
                    address_text: string | null;
                    land_area: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    union_id: string;
                    pnu: string;
                    address_text?: string | null;
                    land_area?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    union_id?: string;
                    pnu?: string;
                    address_text?: string | null;
                    land_area?: number | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'union_land_lots_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            consent_stages: {
                Row: {
                    id: string;
                    business_type: Database['public']['Enums']['business_type_enum'];
                    stage_code: string;
                    stage_name: string;
                    required_rate: number;
                    sort_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    business_type: Database['public']['Enums']['business_type_enum'];
                    stage_code: string;
                    stage_name: string;
                    required_rate?: number;
                    sort_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    business_type?: Database['public']['Enums']['business_type_enum'];
                    stage_code?: string;
                    stage_name?: string;
                    required_rate?: number;
                    sort_order?: number;
                    created_at?: string;
                };
                Relationships: [];
            };
            land_lots: {
                Row: {
                    pnu: string;
                    address: string;
                    area: number | null;
                    official_price: number | null;
                    boundary: Json | null;
                    updated_at: string;
                };
                Insert: {
                    pnu: string;
                    address: string;
                    area?: number | null;
                    official_price?: number | null;
                    boundary?: Json | null;
                    updated_at?: string;
                };
                Update: {
                    pnu?: string;
                    address?: string;
                    area?: number | null;
                    official_price?: number | null;
                    boundary?: Json | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            buildings: {
                Row: {
                    id: string;
                    pnu: string;
                    building_type: Database['public']['Enums']['building_type_enum'];
                    building_name: string | null;
                    main_purpose: string | null;
                    floor_count: number;
                    total_unit_count: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    pnu: string;
                    building_type?: Database['public']['Enums']['building_type_enum'];
                    building_name?: string | null;
                    main_purpose?: string | null;
                    floor_count?: number;
                    total_unit_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    pnu?: string;
                    building_type?: Database['public']['Enums']['building_type_enum'];
                    building_name?: string | null;
                    main_purpose?: string | null;
                    floor_count?: number;
                    total_unit_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'buildings_pnu_fkey';
                        columns: ['pnu'];
                        isOneToOne: true;
                        referencedRelation: 'land_lots';
                        referencedColumns: ['pnu'];
                    }
                ];
            };
            building_units: {
                Row: {
                    id: string;
                    building_id: string;
                    dong: string | null;
                    ho: string | null;
                    floor: number | null;
                    area: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    building_id: string;
                    dong?: string | null;
                    ho?: string | null;
                    floor?: number | null;
                    area?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    building_id?: string;
                    dong?: string | null;
                    ho?: string | null;
                    floor?: number | null;
                    area?: number | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'building_units_building_id_fkey';
                        columns: ['building_id'];
                        isOneToOne: false;
                        referencedRelation: 'buildings';
                        referencedColumns: ['id'];
                    }
                ];
            };
            owners: {
                Row: {
                    id: string;
                    unit_id: string;
                    name: string;
                    phone: string | null;
                    share: string | null;
                    is_representative: boolean;
                    is_manual: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    unit_id: string;
                    name: string;
                    phone?: string | null;
                    share?: string | null;
                    is_representative?: boolean;
                    is_manual?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    unit_id?: string;
                    name?: string;
                    phone?: string | null;
                    share?: string | null;
                    is_representative?: boolean;
                    is_manual?: boolean;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'owners_unit_id_fkey';
                        columns: ['unit_id'];
                        isOneToOne: false;
                        referencedRelation: 'building_units';
                        referencedColumns: ['id'];
                    }
                ];
            };
            owner_consents: {
                Row: {
                    id: string;
                    owner_id: string;
                    stage_id: string;
                    status: Database['public']['Enums']['agreement_status_enum'];
                    consent_date: string | null;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    owner_id: string;
                    stage_id: string;
                    status?: Database['public']['Enums']['agreement_status_enum'];
                    consent_date?: string | null;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    owner_id?: string;
                    stage_id?: string;
                    status?: Database['public']['Enums']['agreement_status_enum'];
                    consent_date?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'owner_consents_owner_id_fkey';
                        columns: ['owner_id'];
                        isOneToOne: false;
                        referencedRelation: 'owners';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'owner_consents_stage_id_fkey';
                        columns: ['stage_id'];
                        isOneToOne: false;
                        referencedRelation: 'consent_stages';
                        referencedColumns: ['id'];
                    }
                ];
            };
            sync_jobs: {
                Row: {
                    id: string;
                    union_id: string;
                    status: Database['public']['Enums']['sync_status_enum'];
                    progress: number;
                    error_log: string | null;
                    is_published: boolean;
                    preview_data: Json | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    union_id: string;
                    status?: Database['public']['Enums']['sync_status_enum'];
                    progress?: number;
                    error_log?: string | null;
                    is_published?: boolean;
                    preview_data?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    union_id?: string;
                    status?: Database['public']['Enums']['sync_status_enum'];
                    progress?: number;
                    error_log?: string | null;
                    is_published?: boolean;
                    preview_data?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'sync_jobs_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            alimtalk_logs: {
                Row: {
                    content: string | null;
                    cost_per_msg: number;
                    fail_count: number;
                    id: number;
                    notice_id: number | null;
                    recipient_count: number;
                    sender_id: string;
                    sent_at: string;
                    success_count: number;
                    title: string;
                    // 확장 필드
                    union_id: string | null;
                    template_code: string | null;
                    template_name: string | null;
                    sender_channel_name: string;
                    kakao_success_count: number;
                    sms_success_count: number;
                    estimated_cost: number;
                    recipient_details: Json | null;
                    aligo_response: Json | null;
                };
                Insert: {
                    content?: string | null;
                    cost_per_msg?: number;
                    fail_count?: number;
                    id?: number;
                    notice_id?: number | null;
                    recipient_count?: number;
                    sender_id: string;
                    sent_at?: string;
                    success_count?: number;
                    title: string;
                    // 확장 필드
                    union_id?: string | null;
                    template_code?: string | null;
                    template_name?: string | null;
                    sender_channel_name?: string;
                    kakao_success_count?: number;
                    sms_success_count?: number;
                    estimated_cost?: number;
                    recipient_details?: Json | null;
                    aligo_response?: Json | null;
                };
                Update: {
                    content?: string | null;
                    cost_per_msg?: number;
                    fail_count?: number;
                    id?: number;
                    notice_id?: number | null;
                    recipient_count?: number;
                    sender_id?: string;
                    sent_at?: string;
                    success_count?: number;
                    title?: string;
                    // 확장 필드
                    union_id?: string | null;
                    template_code?: string | null;
                    template_name?: string | null;
                    sender_channel_name?: string;
                    kakao_success_count?: number;
                    sms_success_count?: number;
                    estimated_cost?: number;
                    recipient_details?: Json | null;
                    aligo_response?: Json | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'alimtalk_logs_notice_id_fkey';
                        columns: ['notice_id'];
                        isOneToOne: false;
                        referencedRelation: 'notices';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'alimtalk_logs_sender_id_fkey';
                        columns: ['sender_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'alimtalk_logs_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            alimtalk_templates: {
                Row: {
                    id: string;
                    template_code: string;
                    template_name: string;
                    template_content: string | null;
                    status: string | null;
                    insp_status: string | null;
                    buttons: Json | null;
                    synced_at: string | null;
                    use_failover: boolean;
                };
                Insert: {
                    id?: string;
                    template_code: string;
                    template_name: string;
                    template_content?: string | null;
                    status?: string | null;
                    insp_status?: string | null;
                    buttons?: Json | null;
                    synced_at?: string | null;
                    use_failover?: boolean;
                };
                Update: {
                    id?: string;
                    template_code?: string;
                    template_name?: string;
                    template_content?: string | null;
                    status?: string | null;
                    insp_status?: string | null;
                    buttons?: Json | null;
                    synced_at?: string | null;
                    use_failover?: boolean;
                };
                Relationships: [];
            };
            alimtalk_pricing: {
                Row: {
                    id: string;
                    message_type: string;
                    unit_price: number;
                    effective_from: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    message_type: string;
                    unit_price: number;
                    effective_from?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    message_type?: string;
                    unit_price?: number;
                    effective_from?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            comments: {
                Row: {
                    id: number;
                    entity_type: string;
                    entity_id: number;
                    parent_id: number | null;
                    author_id: string;
                    content: string;
                    union_id: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    entity_type: string;
                    entity_id: number;
                    parent_id?: number | null;
                    author_id: string;
                    content: string;
                    union_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    entity_type?: string;
                    entity_id?: number;
                    parent_id?: number | null;
                    author_id?: string;
                    content?: string;
                    union_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'comments_parent_id_fkey';
                        columns: ['parent_id'];
                        isOneToOne: false;
                        referencedRelation: 'comments';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'comments_author_id_fkey';
                        columns: ['author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'comments_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            files: {
                Row: {
                    bucket_id: string;
                    created_at: string;
                    id: string;
                    name: string;
                    attachable_type: string | null;
                    attachable_id: number | null;
                    path: string;
                    size: number;
                    type: string;
                    union_id: string | null;
                    updated_at: string;
                    uploader_id: string | null;
                };
                Insert: {
                    bucket_id: string;
                    created_at?: string;
                    id?: string;
                    name: string;
                    attachable_type?: string | null;
                    attachable_id?: number | null;
                    path: string;
                    size: number;
                    type: string;
                    union_id?: string | null;
                    updated_at?: string;
                    uploader_id?: string | null;
                };
                Update: {
                    bucket_id?: string;
                    created_at?: string;
                    id?: string;
                    name?: string;
                    attachable_type?: string | null;
                    attachable_id?: number | null;
                    path?: string;
                    size?: number;
                    type?: string;
                    union_id?: string | null;
                    updated_at?: string;
                    uploader_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'files_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'files_uploader_id_fkey';
                        columns: ['uploader_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            notices: {
                Row: {
                    author_id: string;
                    content: string;
                    created_at: string;
                    end_date: string | null;
                    start_date: string | null;
                    id: number;
                    is_popup: boolean;
                    title: string;
                    union_id: string | null;
                    updated_at: string;
                    views: number;
                };
                Insert: {
                    author_id: string;
                    content: string;
                    created_at?: string;
                    end_date?: string | null;
                    start_date?: string | null;
                    id?: number;
                    is_popup?: boolean;
                    title: string;
                    union_id?: string | null;
                    updated_at?: string;
                    views?: number;
                };
                Update: {
                    author_id?: string;
                    content?: string;
                    created_at?: string;
                    end_date?: string | null;
                    start_date?: string | null;
                    id?: number;
                    is_popup?: boolean;
                    title?: string;
                    union_id?: string | null;
                    updated_at?: string;
                    views?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'notices_author_id_fkey';
                        columns: ['author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notices_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            unions: {
                Row: {
                    created_at: string;
                    id: string;
                    name: string;
                    slug: string;
                    updated_at: string;
                    phone: string | null;
                    address: string | null;
                    email: string | null;
                    business_hours: string | null;
                    logo_url: string | null;
                    description: string | null;
                    is_active: boolean;
                    // 알림톡 관련 필드
                    kakao_channel_id: string | null;
                    vault_sender_key_id: string | null;
                    member_count: number | null;
                    area_size: number | null;
                    district_name: string | null;
                    establishment_date: string | null;
                    approval_date: string | null;
                    office_address: string | null;
                    office_phone: string | null;
                    registration_number: string | null;
                    business_type: string | null;
                    current_stage_id: string | null;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    name: string;
                    slug: string;
                    updated_at?: string;
                    phone?: string | null;
                    address?: string | null;
                    email?: string | null;
                    business_hours?: string | null;
                    logo_url?: string | null;
                    description?: string | null;
                    is_active?: boolean;
                    // 알림톡 관련 필드
                    kakao_channel_id?: string | null;
                    vault_sender_key_id?: string | null;
                    member_count?: number | null;
                    area_size?: number | null;
                    district_name?: string | null;
                    establishment_date?: string | null;
                    approval_date?: string | null;
                    office_address?: string | null;
                    office_phone?: string | null;
                    registration_number?: string | null;
                    business_type?: string | null;
                    current_stage_id?: string | null;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    name?: string;
                    slug?: string;
                    updated_at?: string;
                    phone?: string | null;
                    address?: string | null;
                    email?: string | null;
                    business_hours?: string | null;
                    logo_url?: string | null;
                    description?: string | null;
                    is_active?: boolean;
                    // 알림톡 관련 필드
                    kakao_channel_id?: string | null;
                    vault_sender_key_id?: string | null;
                    member_count?: number | null;
                    area_size?: number | null;
                    district_name?: string | null;
                    establishment_date?: string | null;
                    approval_date?: string | null;
                    office_address?: string | null;
                    office_phone?: string | null;
                    registration_number?: string | null;
                    business_type?: string | null;
                    current_stage_id?: string | null;
                };
                Relationships: [];
            };
            hero_slides: {
                Row: {
                    id: string;
                    union_id: string;
                    image_url: string;
                    link_url: string | null;
                    display_order: number;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    union_id: string;
                    image_url: string;
                    link_url?: string | null;
                    display_order?: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    union_id?: string;
                    image_url?: string;
                    link_url?: string | null;
                    display_order?: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'hero_slides_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            users: {
                Row: {
                    id: string;
                    name: string;
                    email: string;
                    phone_number: string;
                    role: 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';
                    union_id: string | null;
                    user_status: 'PRE_REGISTERED' | 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
                    birth_date: string | null;
                    property_address: string | null;
                    property_address_detail: string | null;
                    property_address_road: string | null;
                    property_address_jibun: string | null;
                    property_zonecode: string | null;
                    property_type: string | null;
                    property_dong: string | null;
                    property_ho: string | null;
                    resident_address: string | null;
                    resident_address_detail: string | null;
                    resident_address_road: string | null;
                    resident_address_jibun: string | null;
                    resident_zonecode: string | null;
                    rejected_reason: string | null;
                    approved_at: string | null;
                    rejected_at: string | null;
                    executive_title: string | null;
                    is_executive: boolean;
                    executive_sort_order: number;
                    property_pnu: string | null;
                    property_unit_id: string | null;
                    notes: string | null;
                    is_blocked: boolean;
                    blocked_at: string | null;
                    blocked_reason: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    name: string;
                    email: string;
                    phone_number: string;
                    role: 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';
                    union_id?: string | null;
                    user_status?: 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
                    birth_date?: string | null;
                    property_address?: string | null;
                    property_address_detail?: string | null;
                    property_address_road?: string | null;
                    property_address_jibun?: string | null;
                    property_zonecode?: string | null;
                    property_type?: string | null;
                    property_dong?: string | null;
                    property_ho?: string | null;
                    resident_address?: string | null;
                    resident_address_detail?: string | null;
                    resident_address_road?: string | null;
                    resident_address_jibun?: string | null;
                    resident_zonecode?: string | null;
                    rejected_reason?: string | null;
                    approved_at?: string | null;
                    rejected_at?: string | null;
                    executive_title?: string | null;
                    is_executive?: boolean;
                    executive_sort_order?: number;
                    property_pnu?: string | null;
                    property_unit_id?: string | null;
                    notes?: string | null;
                    is_blocked?: boolean;
                    blocked_at?: string | null;
                    blocked_reason?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    email?: string;
                    phone_number?: string;
                    role?: 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';
                    union_id?: string | null;
                    user_status?: 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
                    birth_date?: string | null;
                    property_address?: string | null;
                    property_address_detail?: string | null;
                    property_address_road?: string | null;
                    property_address_jibun?: string | null;
                    property_zonecode?: string | null;
                    property_type?: string | null;
                    property_dong?: string | null;
                    property_ho?: string | null;
                    resident_address?: string | null;
                    resident_address_detail?: string | null;
                    resident_address_road?: string | null;
                    resident_address_jibun?: string | null;
                    resident_zonecode?: string | null;
                    rejected_reason?: string | null;
                    approved_at?: string | null;
                    rejected_at?: string | null;
                    executive_title?: string | null;
                    is_executive?: boolean;
                    executive_sort_order?: number;
                    property_pnu?: string | null;
                    property_unit_id?: string | null;
                    notes?: string | null;
                    is_blocked?: boolean;
                    blocked_at?: string | null;
                    blocked_reason?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'users_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'users_property_unit_id_fkey';
                        columns: ['property_unit_id'];
                        isOneToOne: false;
                        referencedRelation: 'building_units';
                        referencedColumns: ['id'];
                    }
                ];
            };
            user_auth_links: {
                Row: {
                    id: string;
                    user_id: string;
                    auth_user_id: string;
                    provider: 'kakao' | 'naver' | 'email';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    auth_user_id: string;
                    provider: 'kakao' | 'naver' | 'email';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    auth_user_id?: string;
                    provider?: 'kakao' | 'naver' | 'email';
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_auth_links_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            questions: {
                Row: {
                    id: number;
                    title: string;
                    content: string;
                    author_id: string;
                    union_id: string | null;
                    is_secret: boolean;
                    answer_content: string | null;
                    answer_author_id: string | null;
                    answered_at: string | null;
                    views: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    title: string;
                    content: string;
                    author_id: string;
                    union_id?: string | null;
                    is_secret?: boolean;
                    answer_content?: string | null;
                    answer_author_id?: string | null;
                    answered_at?: string | null;
                    views?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    title?: string;
                    content?: string;
                    author_id?: string;
                    union_id?: string | null;
                    is_secret?: boolean;
                    answer_content?: string | null;
                    answer_author_id?: string | null;
                    answered_at?: string | null;
                    views?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'questions_author_id_fkey';
                        columns: ['author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'questions_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'questions_answer_author_id_fkey';
                        columns: ['answer_author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            union_info: {
                Row: {
                    id: number;
                    title: string;
                    content: string;
                    author_id: string;
                    union_id: string | null;
                    thumbnail_url: string | null;
                    has_attachments: boolean;
                    views: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    title: string;
                    content: string;
                    author_id: string;
                    union_id?: string | null;
                    thumbnail_url?: string | null;
                    has_attachments?: boolean;
                    views?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    title?: string;
                    content?: string;
                    author_id?: string;
                    union_id?: string | null;
                    thumbnail_url?: string | null;
                    has_attachments?: boolean;
                    views?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'union_info_author_id_fkey';
                        columns: ['author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'union_info_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            free_boards: {
                Row: {
                    id: number;
                    title: string;
                    content: string;
                    author_id: string;
                    union_id: string | null;
                    views: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    title: string;
                    content: string;
                    author_id: string;
                    union_id?: string | null;
                    views?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    title?: string;
                    content?: string;
                    author_id?: string;
                    union_id?: string | null;
                    views?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'free_boards_author_id_fkey';
                        columns: ['author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'free_boards_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            admin_invites: {
                Row: {
                    id: string;
                    union_id: string;
                    name: string;
                    phone_number: string;
                    email: string | null;
                    invite_token: string;
                    status: 'PENDING' | 'USED' | 'EXPIRED';
                    created_by: string;
                    expires_at: string;
                    used_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    union_id: string;
                    name: string;
                    phone_number: string;
                    email?: string | null;
                    invite_token: string;
                    status?: 'PENDING' | 'USED' | 'EXPIRED';
                    created_by: string;
                    expires_at: string;
                    used_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    union_id?: string;
                    name?: string;
                    phone_number?: string;
                    email?: string;
                    invite_token?: string;
                    status?: 'PENDING' | 'USED' | 'EXPIRED';
                    created_by?: string;
                    expires_at?: string;
                    used_at?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'admin_invites_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'admin_invites_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            member_invites: {
                Row: {
                    id: string;
                    union_id: string;
                    name: string;
                    phone_number: string;
                    property_address: string;
                    invite_token: string;
                    status: 'PENDING' | 'USED' | 'EXPIRED';
                    user_id: string | null;
                    created_by: string;
                    expires_at: string;
                    used_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    union_id: string;
                    name: string;
                    phone_number: string;
                    property_address: string;
                    invite_token: string;
                    status?: 'PENDING' | 'USED' | 'EXPIRED';
                    user_id?: string | null;
                    created_by: string;
                    expires_at: string;
                    used_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    union_id?: string;
                    name?: string;
                    phone_number?: string;
                    property_address?: string;
                    invite_token?: string;
                    status?: 'PENDING' | 'USED' | 'EXPIRED';
                    user_id?: string | null;
                    created_by?: string;
                    expires_at?: string;
                    used_at?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'member_invites_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'member_invites_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'member_invites_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            member_access_logs: {
                Row: {
                    id: string;
                    union_id: string;
                    viewer_id: string;
                    viewer_name: string;
                    access_type: 'LIST_VIEW' | 'DETAIL_VIEW' | 'MEMBER_UPDATE' | 'MEMBER_BLOCK';
                    ip_address: string | null;
                    user_agent: string | null;
                    accessed_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    union_id: string;
                    viewer_id: string;
                    viewer_name: string;
                    access_type: 'LIST_VIEW' | 'DETAIL_VIEW' | 'MEMBER_UPDATE' | 'MEMBER_BLOCK';
                    ip_address?: string | null;
                    user_agent?: string | null;
                    accessed_at?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    union_id?: string;
                    viewer_id?: string;
                    viewer_name?: string;
                    access_type?: 'LIST_VIEW' | 'DETAIL_VIEW' | 'MEMBER_UPDATE' | 'MEMBER_BLOCK';
                    ip_address?: string | null;
                    user_agent?: string | null;
                    accessed_at?: string;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'member_access_logs_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'member_access_logs_viewer_id_fkey';
                        columns: ['viewer_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
        };
        Views: {
            v_pnu_consent_status: {
                Row: {
                    pnu: string;
                    stage_id: string;
                    total_owners: number;
                    agreed_owners: number;
                    display_status: 'FULL_AGREED' | 'PARTIAL_AGREED' | 'NONE_AGREED';
                };
                Relationships: [
                    {
                        foreignKeyName: 'land_lots_pnu_fkey';
                        columns: ['pnu'];
                        isOneToOne: false;
                        referencedRelation: 'land_lots';
                        referencedColumns: ['pnu'];
                    },
                    {
                        foreignKeyName: 'consent_stages_id_fkey';
                        columns: ['stage_id'];
                        isOneToOne: false;
                        referencedRelation: 'consent_stages';
                        referencedColumns: ['id'];
                    }
                ];
            };
        };
        Functions: {
            increment_notice_views: {
                Args: { notice_id: number };
                Returns: undefined;
            };
            increment_question_views: {
                Args: { question_id: number };
                Returns: undefined;
            };
            increment_union_info_views: {
                Args: { p_union_info_id: number };
                Returns: undefined;
            };
            increment_free_board_views: {
                Args: { free_board_id: number };
                Returns: undefined;
            };
            sync_member_invites: {
                Args: {
                    p_union_id: string;
                    p_created_by: string;
                    p_expires_hours: number;
                    p_members: Json;
                };
                Returns: Json;
            };
            register_union_sender_key: {
                Args: {
                    p_union_id: string;
                    p_sender_key: string;
                    p_channel_name: string;
                };
                Returns: string;
            };
            get_current_pricing: {
                Args: Record<string, never>;
                Returns: { message_type: string; unit_price: number }[];
            };
            delete_old_access_logs: {
                Args: { months_to_keep?: number };
                Returns: number;
            };
        };
        Enums: {
            user_role: 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';
            user_status: 'PRE_REGISTERED' | 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
            auth_provider: 'kakao' | 'naver' | 'email';
            admin_invite_status: 'PENDING' | 'USED' | 'EXPIRED';
            access_type: 'LIST_VIEW' | 'DETAIL_VIEW' | 'MEMBER_UPDATE' | 'MEMBER_BLOCK';
            ad_type: 'MAIN' | 'SUB' | 'BOARD';
            business_type_enum:
                | 'REDEVELOPMENT'
                | 'RECONSTRUCTION'
                | 'HOUSING_ASSOCIATION'
                | 'STREET_HOUSING'
                | 'SMALL_RECONSTRUCTION';
            building_type_enum: 'DETACHED_HOUSE' | 'VILLA' | 'APARTMENT' | 'COMMERCIAL' | 'MIXED' | 'NONE';
            agreement_status_enum: 'AGREED' | 'DISAGREED' | 'PENDING';
            sync_status_enum: 'PROCESSING' | 'COMPLETED' | 'FAILED';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
          Row: infer R;
      }
        ? R
        : never
    : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
          Insert: infer I;
      }
        ? I
        : never
    : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
          Update: infer U;
      }
        ? U
        : never
    : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never = never
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema['CompositeTypes']
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
    public: {
        Enums: {
            user_role: ['SYSTEM_ADMIN', 'ADMIN', 'USER', 'APPLICANT'],
            user_status: ['PRE_REGISTERED', 'PENDING_PROFILE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
            auth_provider: ['kakao', 'naver', 'email'],
            admin_invite_status: ['PENDING', 'USED', 'EXPIRED'],
            member_invite_status: ['PENDING', 'USED', 'EXPIRED'],
        },
    },
} as const;

// --- Type Exports ---
export type Notice = Database['public']['Tables']['notices']['Row'];
export type NewNotice = Database['public']['Tables']['notices']['Insert'];
export type UpdateNotice = Database['public']['Tables']['notices']['Update'];

export type Union = Database['public']['Tables']['unions']['Row'];
export type NewUnion = Database['public']['Tables']['unions']['Insert'];
export type UpdateUnion = Database['public']['Tables']['unions']['Update'];

export type User = Database['public']['Tables']['users']['Row'];
export type NewUser = Database['public']['Tables']['users']['Insert'];
export type UpdateUser = Database['public']['Tables']['users']['Update'];

export type Comment = Database['public']['Tables']['comments']['Row'];
export type NewComment = Database['public']['Tables']['comments']['Insert'];
export type UpdateComment = Database['public']['Tables']['comments']['Update'];

export type HeroSlide = Database['public']['Tables']['hero_slides']['Row'];
export type NewHeroSlide = Database['public']['Tables']['hero_slides']['Insert'];
export type UpdateHeroSlide = Database['public']['Tables']['hero_slides']['Update'];

export type Question = Database['public']['Tables']['questions']['Row'];
export type NewQuestion = Database['public']['Tables']['questions']['Insert'];
export type UpdateQuestion = Database['public']['Tables']['questions']['Update'];

export type UnionInfo = Database['public']['Tables']['union_info']['Row'];
export type NewUnionInfo = Database['public']['Tables']['union_info']['Insert'];
export type UpdateUnionInfo = Database['public']['Tables']['union_info']['Update'];

export type FileMeta = Database['public']['Tables']['files']['Row'];
export type NewFileMeta = Database['public']['Tables']['files']['Insert'];
export type UpdateFileMeta = Database['public']['Tables']['files']['Update'];

export type FreeBoard = Database['public']['Tables']['free_boards']['Row'];
export type NewFreeBoard = Database['public']['Tables']['free_boards']['Insert'];
export type UpdateFreeBoard = Database['public']['Tables']['free_boards']['Update'];

export type UserAuthLink = Database['public']['Tables']['user_auth_links']['Row'];
export type NewUserAuthLink = Database['public']['Tables']['user_auth_links']['Insert'];
export type UpdateUserAuthLink = Database['public']['Tables']['user_auth_links']['Update'];

// 사용자 상태 타입
export type UserStatus = 'PRE_REGISTERED' | 'PENDING_PROFILE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type UserRole = 'SYSTEM_ADMIN' | 'ADMIN' | 'USER' | 'APPLICANT';
export type AuthProvider = 'kakao' | 'naver' | 'email';
export type AdminInviteStatus = 'PENDING' | 'USED' | 'EXPIRED';
export type AccessType = 'LIST_VIEW' | 'DETAIL_VIEW' | 'MEMBER_UPDATE' | 'MEMBER_BLOCK';

// 관리자 초대 타입
export type AdminInvite = Database['public']['Tables']['admin_invites']['Row'];
export type NewAdminInvite = Database['public']['Tables']['admin_invites']['Insert'];
export type UpdateAdminInvite = Database['public']['Tables']['admin_invites']['Update'];

// 관리자 초대 + 조합 정보 타입
export type AdminInviteWithUnion = AdminInvite & { union: { id: string; name: string; slug: string } | null };

// 조합원 초대 타입
export type MemberInvite = Database['public']['Tables']['member_invites']['Row'];
export type NewMemberInvite = Database['public']['Tables']['member_invites']['Insert'];
export type UpdateMemberInvite = Database['public']['Tables']['member_invites']['Update'];
export type MemberInviteStatus = 'PENDING' | 'USED' | 'EXPIRED';

// 조합원 초대 + 조합 정보 타입
export type MemberInviteWithUnion = MemberInvite & { union: { id: string; name: string; slug: string } | null };

// 동기화 결과 타입
export type SyncMemberInvitesResult = {
    deleted_pending: number;
    deleted_used: number;
    inserted: number;
    deleted_user_ids: string[];
    deleted_auth_user_ids: string[];
};

// 조합 타입
export type UnionInfoWithFiles = UnionInfo & { files: FileMeta[] };
export type UnionInfoWithAuthor = UnionInfo & { author: { id: string; name: string } | null };
export type FreeBoardWithAuthor = FreeBoard & { author: { id: string; name: string } | null };

// 알림톡 관련 타입
export type AlimtalkLog = Database['public']['Tables']['alimtalk_logs']['Row'];
export type NewAlimtalkLog = Database['public']['Tables']['alimtalk_logs']['Insert'];
export type UpdateAlimtalkLog = Database['public']['Tables']['alimtalk_logs']['Update'];

export type AlimtalkTemplate = Database['public']['Tables']['alimtalk_templates']['Row'];
export type NewAlimtalkTemplate = Database['public']['Tables']['alimtalk_templates']['Insert'];
export type UpdateAlimtalkTemplate = Database['public']['Tables']['alimtalk_templates']['Update'];

export type AlimtalkPricing = Database['public']['Tables']['alimtalk_pricing']['Row'];
export type NewAlimtalkPricing = Database['public']['Tables']['alimtalk_pricing']['Insert'];
export type UpdateAlimtalkPricing = Database['public']['Tables']['alimtalk_pricing']['Update'];

// 알림톡 로그 + 조합 정보 타입
export type AlimtalkLogWithUnion = AlimtalkLog & {
    union: { id: string; name: string; slug: string } | null;
};

// 알림톡 메시지 타입
export type AlimtalkMessageType = 'KAKAO' | 'SMS' | 'LMS';

// 광고 타입
export type AdType = Database['public']['Enums']['ad_type'];
export type Advertisement = Database['public']['Tables']['advertisements']['Row'];
export type NewAdvertisement = Database['public']['Tables']['advertisements']['Insert'];
export type UpdateAdvertisement = Database['public']['Tables']['advertisements']['Update'];

// GIS 관련 타입 추가
export type ConsentStage = Database['public']['Tables']['consent_stages']['Row'];
export type LandLot = Database['public']['Tables']['land_lots']['Row'];
export type Building = Database['public']['Tables']['buildings']['Row'];
export type NewBuilding = Database['public']['Tables']['buildings']['Insert'];
export type UpdateBuilding = Database['public']['Tables']['buildings']['Update'];
export type BuildingUnit = Database['public']['Tables']['building_units']['Row'];
export type NewBuildingUnit = Database['public']['Tables']['building_units']['Insert'];
export type UpdateBuildingUnit = Database['public']['Tables']['building_units']['Update'];
export type Owner = Database['public']['Tables']['owners']['Row'];
export type OwnerConsent = Database['public']['Tables']['owner_consents']['Row'];
export type SyncJob = Database['public']['Tables']['sync_jobs']['Row'];
export type PnuConsentStatus = Database['public']['Views']['v_pnu_consent_status']['Row'];

// 건물 유형 타입
export type BuildingTypeEnum = Database['public']['Enums']['building_type_enum'];

// 조합원 접속 로그 타입
export type MemberAccessLog = Database['public']['Tables']['member_access_logs']['Row'];
export type NewMemberAccessLog = Database['public']['Tables']['member_access_logs']['Insert'];
export type UpdateMemberAccessLog = Database['public']['Tables']['member_access_logs']['Update'];

// 조합원 접속 로그 + 조합 정보 타입
export type MemberAccessLogWithUnion = MemberAccessLog & { 
    union: { id: string; name: string; slug: string } | null 
};
