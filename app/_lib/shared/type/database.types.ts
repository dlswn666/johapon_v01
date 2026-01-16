export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '13.0.5';
    };
    public: {
        Tables: {
            admin_invites: {
                Row: {
                    created_at: string | null;
                    created_by: string;
                    email: string | null;
                    expires_at: string;
                    id: string;
                    invite_token: string;
                    name: string;
                    phone_number: string;
                    status: string | null;
                    union_id: string;
                    used_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by: string;
                    email?: string | null;
                    expires_at: string;
                    id?: string;
                    invite_token: string;
                    name: string;
                    phone_number: string;
                    status?: string | null;
                    union_id: string;
                    used_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string;
                    email?: string | null;
                    expires_at?: string;
                    id?: string;
                    invite_token?: string;
                    name?: string;
                    phone_number?: string;
                    status?: string | null;
                    union_id?: string;
                    used_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'admin_invites_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'admin_invites_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            advertisements: {
                Row: {
                    business_name: string;
                    content: string | null;
                    contract_end_date: string;
                    contract_file_url: string | null;
                    contract_start_date: string;
                    created_at: string | null;
                    id: string;
                    image_url: string | null;
                    image_url_mobile: string | null;
                    is_payment_completed: boolean | null;
                    link_url: string | null;
                    price: number | null;
                    title: string | null;
                    type: Database['public']['Enums']['ad_type'];
                    union_id: string | null;
                };
                Insert: {
                    business_name: string;
                    content?: string | null;
                    contract_end_date: string;
                    contract_file_url?: string | null;
                    contract_start_date: string;
                    created_at?: string | null;
                    id?: string;
                    image_url?: string | null;
                    image_url_mobile?: string | null;
                    is_payment_completed?: boolean | null;
                    link_url?: string | null;
                    price?: number | null;
                    title?: string | null;
                    type: Database['public']['Enums']['ad_type'];
                    union_id?: string | null;
                };
                Update: {
                    business_name?: string;
                    content?: string | null;
                    contract_end_date?: string;
                    contract_file_url?: string | null;
                    contract_start_date?: string;
                    created_at?: string | null;
                    id?: string;
                    image_url?: string | null;
                    image_url_mobile?: string | null;
                    is_payment_completed?: boolean | null;
                    link_url?: string | null;
                    price?: number | null;
                    title?: string | null;
                    type?: Database['public']['Enums']['ad_type'];
                    union_id?: string | null;
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
            alimtalk_logs: {
                Row: {
                    aligo_response: Json | null;
                    content: string | null;
                    cost_per_msg: number;
                    estimated_cost: number | null;
                    fail_count: number;
                    id: number;
                    kakao_success_count: number | null;
                    notice_id: number | null;
                    recipient_count: number;
                    recipient_details: Json | null;
                    sender_channel_name: string | null;
                    sender_id: string;
                    sent_at: string;
                    sms_success_count: number | null;
                    success_count: number;
                    template_code: string | null;
                    template_name: string | null;
                    title: string;
                    union_id: string | null;
                };
                Insert: {
                    aligo_response?: Json | null;
                    content?: string | null;
                    cost_per_msg?: number;
                    estimated_cost?: number | null;
                    fail_count?: number;
                    id?: never;
                    kakao_success_count?: number | null;
                    notice_id?: number | null;
                    recipient_count?: number;
                    recipient_details?: Json | null;
                    sender_channel_name?: string | null;
                    sender_id: string;
                    sent_at?: string;
                    sms_success_count?: number | null;
                    success_count?: number;
                    template_code?: string | null;
                    template_name?: string | null;
                    title: string;
                    union_id?: string | null;
                };
                Update: {
                    aligo_response?: Json | null;
                    content?: string | null;
                    cost_per_msg?: number;
                    estimated_cost?: number | null;
                    fail_count?: number;
                    id?: never;
                    kakao_success_count?: number | null;
                    notice_id?: number | null;
                    recipient_count?: number;
                    recipient_details?: Json | null;
                    sender_channel_name?: string | null;
                    sender_id?: string;
                    sent_at?: string;
                    sms_success_count?: number | null;
                    success_count?: number;
                    template_code?: string | null;
                    template_name?: string | null;
                    title?: string;
                    union_id?: string | null;
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
            alimtalk_pricing: {
                Row: {
                    created_at: string;
                    effective_from: string;
                    id: string;
                    message_type: string;
                    unit_price: number;
                };
                Insert: {
                    created_at?: string;
                    effective_from?: string;
                    id?: string;
                    message_type: string;
                    unit_price: number;
                };
                Update: {
                    created_at?: string;
                    effective_from?: string;
                    id?: string;
                    message_type?: string;
                    unit_price?: number;
                };
                Relationships: [];
            };
            alimtalk_templates: {
                Row: {
                    buttons: Json | null;
                    cdate: string | null;
                    comments: string | null;
                    id: string;
                    insp_status: string | null;
                    sender_key: string | null;
                    status: string | null;
                    synced_at: string | null;
                    template_code: string;
                    template_content: string | null;
                    template_em_type: string | null;
                    template_image_name: string | null;
                    template_image_url: string | null;
                    template_name: string;
                    template_subtitle: string | null;
                    template_title: string | null;
                    template_type: string | null;
                    use_failover: boolean | null;
                };
                Insert: {
                    buttons?: Json | null;
                    cdate?: string | null;
                    comments?: string | null;
                    id?: string;
                    insp_status?: string | null;
                    sender_key?: string | null;
                    status?: string | null;
                    synced_at?: string | null;
                    template_code: string;
                    template_content?: string | null;
                    template_em_type?: string | null;
                    template_image_name?: string | null;
                    template_image_url?: string | null;
                    template_name: string;
                    template_subtitle?: string | null;
                    template_title?: string | null;
                    template_type?: string | null;
                    use_failover?: boolean | null;
                };
                Update: {
                    buttons?: Json | null;
                    cdate?: string | null;
                    comments?: string | null;
                    id?: string;
                    insp_status?: string | null;
                    sender_key?: string | null;
                    status?: string | null;
                    synced_at?: string | null;
                    template_code?: string;
                    template_content?: string | null;
                    template_em_type?: string | null;
                    template_image_name?: string | null;
                    template_image_url?: string | null;
                    template_name?: string;
                    template_subtitle?: string | null;
                    template_title?: string | null;
                    template_type?: string | null;
                    use_failover?: boolean | null;
                };
                Relationships: [];
            };
            building_land_lots: {
                Row: {
                    building_id: string;
                    created_at: string | null;
                    id: string;
                    note: string | null;
                    pnu: string;
                    previous_building_id: string | null;
                    updated_at: string | null;
                    updated_by: string | null;
                };
                Insert: {
                    building_id: string;
                    created_at?: string | null;
                    id?: string;
                    note?: string | null;
                    pnu: string;
                    previous_building_id?: string | null;
                    updated_at?: string | null;
                    updated_by?: string | null;
                };
                Update: {
                    building_id?: string;
                    created_at?: string | null;
                    id?: string;
                    note?: string | null;
                    pnu?: string;
                    previous_building_id?: string | null;
                    updated_at?: string | null;
                    updated_by?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'building_land_lots_building_id_fkey';
                        columns: ['building_id'];
                        isOneToOne: false;
                        referencedRelation: 'buildings';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'building_land_lots_pnu_fkey';
                        columns: ['pnu'];
                        isOneToOne: true;
                        referencedRelation: 'land_lots';
                        referencedColumns: ['pnu'];
                    },
                    {
                        foreignKeyName: 'building_land_lots_pnu_fkey';
                        columns: ['pnu'];
                        isOneToOne: true;
                        referencedRelation: 'v_pnu_consent_status';
                        referencedColumns: ['pnu'];
                    },
                    {
                        foreignKeyName: 'building_land_lots_previous_building_id_fkey';
                        columns: ['previous_building_id'];
                        isOneToOne: false;
                        referencedRelation: 'buildings';
                        referencedColumns: ['id'];
                    }
                ];
            };
            building_units: {
                Row: {
                    area: number | null;
                    building_id: string;
                    created_at: string | null;
                    dong: string | null;
                    floor: number | null;
                    ho: string | null;
                    id: string;
                    official_price: number | null;
                    previous_building_id: string | null;
                };
                Insert: {
                    area?: number | null;
                    building_id: string;
                    created_at?: string | null;
                    dong?: string | null;
                    floor?: number | null;
                    ho?: string | null;
                    id?: string;
                    official_price?: number | null;
                    previous_building_id?: string | null;
                };
                Update: {
                    area?: number | null;
                    building_id?: string;
                    created_at?: string | null;
                    dong?: string | null;
                    floor?: number | null;
                    ho?: string | null;
                    id?: string;
                    official_price?: number | null;
                    previous_building_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'building_units_building_id_fkey';
                        columns: ['building_id'];
                        isOneToOne: false;
                        referencedRelation: 'buildings';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'building_units_previous_building_id_fkey';
                        columns: ['previous_building_id'];
                        isOneToOne: false;
                        referencedRelation: 'buildings';
                        referencedColumns: ['id'];
                    }
                ];
            };
            buildings: {
                Row: {
                    building_name: string | null;
                    building_type: Database['public']['Enums']['building_type_enum'];
                    created_at: string | null;
                    floor_count: number | null;
                    id: string;
                    main_purpose: string | null;
                    total_unit_count: number | null;
                    updated_at: string | null;
                };
                Insert: {
                    building_name?: string | null;
                    building_type?: Database['public']['Enums']['building_type_enum'];
                    created_at?: string | null;
                    floor_count?: number | null;
                    id?: string;
                    main_purpose?: string | null;
                    total_unit_count?: number | null;
                    updated_at?: string | null;
                };
                Update: {
                    building_name?: string | null;
                    building_type?: Database['public']['Enums']['building_type_enum'];
                    created_at?: string | null;
                    floor_count?: number | null;
                    id?: string;
                    main_purpose?: string | null;
                    total_unit_count?: number | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            comments: {
                Row: {
                    author_id: string;
                    content: string;
                    created_at: string | null;
                    entity_id: number;
                    entity_type: string;
                    id: number;
                    parent_id: number | null;
                    union_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    author_id: string;
                    content: string;
                    created_at?: string | null;
                    entity_id: number;
                    entity_type: string;
                    id?: never;
                    parent_id?: number | null;
                    union_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    author_id?: string;
                    content?: string;
                    created_at?: string | null;
                    entity_id?: number;
                    entity_type?: string;
                    id?: never;
                    parent_id?: number | null;
                    union_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'comments_author_id_fkey';
                        columns: ['author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'comments_parent_id_fkey';
                        columns: ['parent_id'];
                        isOneToOne: false;
                        referencedRelation: 'comments';
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
            consent_stages: {
                Row: {
                    business_type: Database['public']['Enums']['business_type_enum'];
                    created_at: string;
                    id: string;
                    required_rate: number;
                    sort_order: number;
                    stage_code: string;
                    stage_name: string;
                };
                Insert: {
                    business_type: Database['public']['Enums']['business_type_enum'];
                    created_at?: string;
                    id?: string;
                    required_rate?: number;
                    sort_order?: number;
                    stage_code: string;
                    stage_name: string;
                };
                Update: {
                    business_type?: Database['public']['Enums']['business_type_enum'];
                    created_at?: string;
                    id?: string;
                    required_rate?: number;
                    sort_order?: number;
                    stage_code?: string;
                    stage_name?: string;
                };
                Relationships: [];
            };
            development_stages: {
                Row: {
                    business_type: string;
                    created_at: string | null;
                    id: string;
                    sort_order: number | null;
                    stage_name: string;
                };
                Insert: {
                    business_type: string;
                    created_at?: string | null;
                    id?: string;
                    sort_order?: number | null;
                    stage_name: string;
                };
                Update: {
                    business_type?: string;
                    created_at?: string | null;
                    id?: string;
                    sort_order?: number | null;
                    stage_name?: string;
                };
                Relationships: [];
            };
            files: {
                Row: {
                    attachable_id: number | null;
                    attachable_type: string | null;
                    bucket_id: string;
                    created_at: string;
                    id: string;
                    name: string;
                    path: string;
                    size: number;
                    type: string;
                    union_id: string | null;
                    updated_at: string;
                    uploader_id: string | null;
                };
                Insert: {
                    attachable_id?: number | null;
                    attachable_type?: string | null;
                    bucket_id: string;
                    created_at?: string;
                    id?: string;
                    name: string;
                    path: string;
                    size: number;
                    type: string;
                    union_id?: string | null;
                    updated_at?: string;
                    uploader_id?: string | null;
                };
                Update: {
                    attachable_id?: number | null;
                    attachable_type?: string | null;
                    bucket_id?: string;
                    created_at?: string;
                    id?: string;
                    name?: string;
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
            free_boards: {
                Row: {
                    author_id: string;
                    content: string;
                    created_at: string;
                    id: number;
                    title: string;
                    union_id: string | null;
                    updated_at: string;
                    views: number;
                };
                Insert: {
                    author_id: string;
                    content: string;
                    created_at?: string;
                    id?: never;
                    title: string;
                    union_id?: string | null;
                    updated_at?: string;
                    views?: number;
                };
                Update: {
                    author_id?: string;
                    content?: string;
                    created_at?: string;
                    id?: never;
                    title?: string;
                    union_id?: string | null;
                    updated_at?: string;
                    views?: number;
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
            hero_slides: {
                Row: {
                    created_at: string | null;
                    display_order: number | null;
                    id: string;
                    image_url: string;
                    is_active: boolean | null;
                    link_url: string | null;
                    union_id: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    display_order?: number | null;
                    id?: string;
                    image_url: string;
                    is_active?: boolean | null;
                    link_url?: string | null;
                    union_id: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    display_order?: number | null;
                    id?: string;
                    image_url?: string;
                    is_active?: boolean | null;
                    link_url?: string | null;
                    union_id?: string;
                    updated_at?: string | null;
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
            land_lots: {
                Row: {
                    address: string;
                    address_text: string | null;
                    area: number | null;
                    boundary: unknown;
                    created_at: string;
                    land_category: string | null;
                    official_price: number | null;
                    owner_count: number | null;
                    pnu: string;
                    road_address: string | null;
                    union_id: string | null;
                    updated_at: string;
                };
                Insert: {
                    address: string;
                    address_text?: string | null;
                    area?: number | null;
                    boundary?: unknown;
                    created_at?: string;
                    land_category?: string | null;
                    official_price?: number | null;
                    owner_count?: number | null;
                    pnu: string;
                    road_address?: string | null;
                    union_id?: string | null;
                    updated_at?: string;
                };
                Update: {
                    address?: string;
                    address_text?: string | null;
                    area?: number | null;
                    boundary?: unknown;
                    created_at?: string;
                    land_category?: string | null;
                    official_price?: number | null;
                    owner_count?: number | null;
                    pnu?: string;
                    road_address?: string | null;
                    union_id?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'land_lots_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
            member_access_logs: {
                Row: {
                    access_type: string;
                    accessed_at: string;
                    created_at: string;
                    id: string;
                    ip_address: string | null;
                    union_id: string;
                    user_agent: string | null;
                    viewer_id: string;
                    viewer_name: string;
                };
                Insert: {
                    access_type: string;
                    accessed_at?: string;
                    created_at?: string;
                    id?: string;
                    ip_address?: string | null;
                    union_id: string;
                    user_agent?: string | null;
                    viewer_id: string;
                    viewer_name: string;
                };
                Update: {
                    access_type?: string;
                    accessed_at?: string;
                    created_at?: string;
                    id?: string;
                    ip_address?: string | null;
                    union_id?: string;
                    user_agent?: string | null;
                    viewer_id?: string;
                    viewer_name?: string;
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
            member_invites: {
                Row: {
                    created_at: string | null;
                    created_by: string;
                    expires_at: string;
                    id: string;
                    invite_token: string;
                    name: string;
                    phone_number: string;
                    property_address: string;
                    property_pnu: string | null;
                    status: string | null;
                    union_id: string;
                    used_at: string | null;
                    user_id: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by: string;
                    expires_at: string;
                    id?: string;
                    invite_token: string;
                    name: string;
                    phone_number: string;
                    property_address: string;
                    property_pnu?: string | null;
                    status?: string | null;
                    union_id: string;
                    used_at?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string;
                    expires_at?: string;
                    id?: string;
                    invite_token?: string;
                    name?: string;
                    phone_number?: string;
                    property_address?: string;
                    property_pnu?: string | null;
                    status?: string | null;
                    union_id?: string;
                    used_at?: string | null;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'member_invites_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
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
                    }
                ];
            };
            notices: {
                Row: {
                    author_id: string;
                    content: string;
                    created_at: string;
                    end_date: string | null;
                    id: number;
                    is_popup: boolean;
                    start_date: string | null;
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
                    id?: never;
                    is_popup?: boolean;
                    start_date?: string | null;
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
                    id?: never;
                    is_popup?: boolean;
                    start_date?: string | null;
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
            questions: {
                Row: {
                    answer_author_id: string | null;
                    answer_content: string | null;
                    answered_at: string | null;
                    author_id: string;
                    content: string;
                    created_at: string | null;
                    id: number;
                    is_secret: boolean | null;
                    title: string;
                    union_id: string | null;
                    updated_at: string | null;
                    views: number | null;
                };
                Insert: {
                    answer_author_id?: string | null;
                    answer_content?: string | null;
                    answered_at?: string | null;
                    author_id: string;
                    content: string;
                    created_at?: string | null;
                    id?: never;
                    is_secret?: boolean | null;
                    title: string;
                    union_id?: string | null;
                    updated_at?: string | null;
                    views?: number | null;
                };
                Update: {
                    answer_author_id?: string | null;
                    answer_content?: string | null;
                    answered_at?: string | null;
                    author_id?: string;
                    content?: string;
                    created_at?: string | null;
                    id?: never;
                    is_secret?: boolean | null;
                    title?: string;
                    union_id?: string | null;
                    updated_at?: string | null;
                    views?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'questions_answer_author_id_fkey';
                        columns: ['answer_author_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
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
                    }
                ];
            };
            spatial_ref_sys: {
                Row: {
                    auth_name: string | null;
                    auth_srid: number | null;
                    proj4text: string | null;
                    srid: number;
                    srtext: string | null;
                };
                Insert: {
                    auth_name?: string | null;
                    auth_srid?: number | null;
                    proj4text?: string | null;
                    srid: number;
                    srtext?: string | null;
                };
                Update: {
                    auth_name?: string | null;
                    auth_srid?: number | null;
                    proj4text?: string | null;
                    srid?: number;
                    srtext?: string | null;
                };
                Relationships: [];
            };
            sync_jobs: {
                Row: {
                    created_at: string;
                    error_log: string | null;
                    id: string;
                    is_published: boolean | null;
                    job_type: Database['public']['Enums']['sync_job_type_enum'];
                    preview_data: Json | null;
                    progress: number;
                    status: Database['public']['Enums']['sync_status_enum'];
                    union_id: string | null;
                    updated_at: string;
                };
                Insert: {
                    created_at?: string;
                    error_log?: string | null;
                    id?: string;
                    is_published?: boolean | null;
                    job_type?: Database['public']['Enums']['sync_job_type_enum'];
                    preview_data?: Json | null;
                    progress?: number;
                    status?: Database['public']['Enums']['sync_status_enum'];
                    union_id?: string | null;
                    updated_at?: string;
                };
                Update: {
                    created_at?: string;
                    error_log?: string | null;
                    id?: string;
                    is_published?: boolean | null;
                    job_type?: Database['public']['Enums']['sync_job_type_enum'];
                    preview_data?: Json | null;
                    progress?: number;
                    status?: Database['public']['Enums']['sync_status_enum'];
                    union_id?: string | null;
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
            union_info: {
                Row: {
                    author_id: string;
                    content: string;
                    created_at: string;
                    has_attachments: boolean;
                    id: number;
                    thumbnail_url: string | null;
                    title: string;
                    union_id: string | null;
                    updated_at: string;
                    views: number;
                };
                Insert: {
                    author_id: string;
                    content: string;
                    created_at?: string;
                    has_attachments?: boolean;
                    id?: never;
                    thumbnail_url?: string | null;
                    title: string;
                    union_id?: string | null;
                    updated_at?: string;
                    views?: number;
                };
                Update: {
                    author_id?: string;
                    content?: string;
                    created_at?: string;
                    has_attachments?: boolean;
                    id?: never;
                    thumbnail_url?: string | null;
                    title?: string;
                    union_id?: string | null;
                    updated_at?: string;
                    views?: number;
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
            unions: {
                Row: {
                    address: string | null;
                    approval_date: string | null;
                    area_size: number | null;
                    business_hours: string | null;
                    business_type: Database['public']['Enums']['business_type_enum'] | null;
                    created_at: string;
                    current_stage_id: string | null;
                    description: string | null;
                    district_name: string | null;
                    email: string | null;
                    establishment_date: string | null;
                    id: string;
                    is_active: boolean;
                    kakao_channel_id: string | null;
                    logo_url: string | null;
                    member_count: number | null;
                    name: string;
                    office_address: string | null;
                    office_phone: string | null;
                    phone: string | null;
                    registration_number: string | null;
                    slug: string;
                    updated_at: string;
                    vault_sender_key_id: string | null;
                };
                Insert: {
                    address?: string | null;
                    approval_date?: string | null;
                    area_size?: number | null;
                    business_hours?: string | null;
                    business_type?: Database['public']['Enums']['business_type_enum'] | null;
                    created_at?: string;
                    current_stage_id?: string | null;
                    description?: string | null;
                    district_name?: string | null;
                    email?: string | null;
                    establishment_date?: string | null;
                    id?: string;
                    is_active?: boolean;
                    kakao_channel_id?: string | null;
                    logo_url?: string | null;
                    member_count?: number | null;
                    name: string;
                    office_address?: string | null;
                    office_phone?: string | null;
                    phone?: string | null;
                    registration_number?: string | null;
                    slug: string;
                    updated_at?: string;
                    vault_sender_key_id?: string | null;
                };
                Update: {
                    address?: string | null;
                    approval_date?: string | null;
                    area_size?: number | null;
                    business_hours?: string | null;
                    business_type?: Database['public']['Enums']['business_type_enum'] | null;
                    created_at?: string;
                    current_stage_id?: string | null;
                    description?: string | null;
                    district_name?: string | null;
                    email?: string | null;
                    establishment_date?: string | null;
                    id?: string;
                    is_active?: boolean;
                    kakao_channel_id?: string | null;
                    logo_url?: string | null;
                    member_count?: number | null;
                    name?: string;
                    office_address?: string | null;
                    office_phone?: string | null;
                    phone?: string | null;
                    registration_number?: string | null;
                    slug?: string;
                    updated_at?: string;
                    vault_sender_key_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'unions_current_stage_id_fkey';
                        columns: ['current_stage_id'];
                        isOneToOne: false;
                        referencedRelation: 'development_stages';
                        referencedColumns: ['id'];
                    }
                ];
            };
            user_auth_links: {
                Row: {
                    auth_user_id: string;
                    created_at: string | null;
                    id: string;
                    provider: string;
                    user_id: string;
                };
                Insert: {
                    auth_user_id: string;
                    created_at?: string | null;
                    id?: string;
                    provider: string;
                    user_id: string;
                };
                Update: {
                    auth_user_id?: string;
                    created_at?: string | null;
                    id?: string;
                    provider?: string;
                    user_id?: string;
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
            user_consents: {
                Row: {
                    consent_date: string | null;
                    id: string;
                    stage_id: string;
                    status: Database['public']['Enums']['agreement_status_enum'];
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    consent_date?: string | null;
                    id?: string;
                    stage_id: string;
                    status?: Database['public']['Enums']['agreement_status_enum'];
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    consent_date?: string | null;
                    id?: string;
                    stage_id?: string;
                    status?: Database['public']['Enums']['agreement_status_enum'];
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_consents_stage_id_fkey';
                        columns: ['stage_id'];
                        isOneToOne: false;
                        referencedRelation: 'consent_stages';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'user_consents_stage_id_fkey';
                        columns: ['stage_id'];
                        isOneToOne: false;
                        referencedRelation: 'v_pnu_consent_status';
                        referencedColumns: ['stage_id'];
                    },
                    {
                        foreignKeyName: 'user_consents_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            user_property_units: {
                Row: {
                    building_area: number | null;
                    building_name: string | null;
                    building_ownership_ratio: number | null;
                    building_unit_id: string | null;
                    created_at: string | null;
                    dong: string | null;
                    ho: string | null;
                    id: string;
                    is_primary: boolean | null;
                    land_area: number | null;
                    land_ownership_ratio: number | null;
                    notes: string | null;
                    ownership_type: string | null;
                    pnu: string | null;
                    previous_pnu: string | null;
                    property_address_jibun: string | null;
                    property_address_road: string | null;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    building_area?: number | null;
                    building_name?: string | null;
                    building_ownership_ratio?: number | null;
                    building_unit_id?: string | null;
                    created_at?: string | null;
                    dong?: string | null;
                    ho?: string | null;
                    id?: string;
                    is_primary?: boolean | null;
                    land_area?: number | null;
                    land_ownership_ratio?: number | null;
                    notes?: string | null;
                    ownership_type?: string | null;
                    pnu?: string | null;
                    previous_pnu?: string | null;
                    property_address_jibun?: string | null;
                    property_address_road?: string | null;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    building_area?: number | null;
                    building_name?: string | null;
                    building_ownership_ratio?: number | null;
                    building_unit_id?: string | null;
                    created_at?: string | null;
                    dong?: string | null;
                    ho?: string | null;
                    id?: string;
                    is_primary?: boolean | null;
                    land_area?: number | null;
                    land_ownership_ratio?: number | null;
                    notes?: string | null;
                    ownership_type?: string | null;
                    pnu?: string | null;
                    previous_pnu?: string | null;
                    property_address_jibun?: string | null;
                    property_address_road?: string | null;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_property_units_building_unit_id_fkey';
                        columns: ['building_unit_id'];
                        isOneToOne: false;
                        referencedRelation: 'building_units';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'user_property_units_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    }
                ];
            };
            users: {
                Row: {
                    approved_at: string | null;
                    birth_date: string | null;
                    blocked_at: string | null;
                    blocked_reason: string | null;
                    created_at: string;
                    email: string | null;
                    executive_sort_order: number | null;
                    executive_title: string | null;
                    id: string;
                    is_blocked: boolean | null;
                    is_executive: boolean | null;
                    name: string;
                    notes: string | null;
                    phone_number: string | null;
                    property_address: string | null;
                    property_address_detail: string | null;
                    property_type: string | null;
                    property_zonecode: string | null;
                    rejected_at: string | null;
                    rejected_reason: string | null;
                    resident_address: string | null;
                    resident_address_detail: string | null;
                    resident_address_jibun: string | null;
                    resident_address_road: string | null;
                    resident_zonecode: string | null;
                    role: string;
                    union_id: string | null;
                    updated_at: string | null;
                    user_status: string | null;
                };
                Insert: {
                    approved_at?: string | null;
                    birth_date?: string | null;
                    blocked_at?: string | null;
                    blocked_reason?: string | null;
                    created_at?: string;
                    email?: string | null;
                    executive_sort_order?: number | null;
                    executive_title?: string | null;
                    id: string;
                    is_blocked?: boolean | null;
                    is_executive?: boolean | null;
                    name: string;
                    notes?: string | null;
                    phone_number?: string | null;
                    property_address?: string | null;
                    property_address_detail?: string | null;
                    property_type?: string | null;
                    property_zonecode?: string | null;
                    rejected_at?: string | null;
                    rejected_reason?: string | null;
                    resident_address?: string | null;
                    resident_address_detail?: string | null;
                    resident_address_jibun?: string | null;
                    resident_address_road?: string | null;
                    resident_zonecode?: string | null;
                    role?: string;
                    union_id?: string | null;
                    updated_at?: string | null;
                    user_status?: string | null;
                };
                Update: {
                    approved_at?: string | null;
                    birth_date?: string | null;
                    blocked_at?: string | null;
                    blocked_reason?: string | null;
                    created_at?: string;
                    email?: string | null;
                    executive_sort_order?: number | null;
                    executive_title?: string | null;
                    id?: string;
                    is_blocked?: boolean | null;
                    is_executive?: boolean | null;
                    name?: string;
                    notes?: string | null;
                    phone_number?: string | null;
                    property_address?: string | null;
                    property_address_detail?: string | null;
                    property_type?: string | null;
                    property_zonecode?: string | null;
                    rejected_at?: string | null;
                    rejected_reason?: string | null;
                    resident_address?: string | null;
                    resident_address_detail?: string | null;
                    resident_address_jibun?: string | null;
                    resident_address_road?: string | null;
                    resident_zonecode?: string | null;
                    role?: string;
                    union_id?: string | null;
                    updated_at?: string | null;
                    user_status?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'users_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
        };
        Views: {
            geography_columns: {
                Row: {
                    coord_dimension: number | null;
                    f_geography_column: unknown;
                    f_table_catalog: unknown;
                    f_table_name: unknown;
                    f_table_schema: unknown;
                    srid: number | null;
                    type: string | null;
                };
                Relationships: [];
            };
            geometry_columns: {
                Row: {
                    coord_dimension: number | null;
                    f_geometry_column: unknown;
                    f_table_catalog: string | null;
                    f_table_name: unknown;
                    f_table_schema: unknown;
                    srid: number | null;
                    type: string | null;
                };
                Insert: {
                    coord_dimension?: number | null;
                    f_geometry_column?: unknown;
                    f_table_catalog?: string | null;
                    f_table_name?: unknown;
                    f_table_schema?: unknown;
                    srid?: number | null;
                    type?: string | null;
                };
                Update: {
                    coord_dimension?: number | null;
                    f_geometry_column?: unknown;
                    f_table_catalog?: string | null;
                    f_table_name?: unknown;
                    f_table_schema?: unknown;
                    srid?: number | null;
                    type?: string | null;
                };
                Relationships: [];
            };
            v_pnu_consent_status: {
                Row: {
                    address: string | null;
                    agreed_count: number | null;
                    consent_status: string | null;
                    pnu: string | null;
                    required_rate: number | null;
                    stage_id: string | null;
                    stage_name: string | null;
                    total_owners: number | null;
                    union_id: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'land_lots_union_id_fkey';
                        columns: ['union_id'];
                        isOneToOne: false;
                        referencedRelation: 'unions';
                        referencedColumns: ['id'];
                    }
                ];
            };
        };
        Functions: {
            get_union_consent_rate: {
                Args: { p_stage_id: string; p_union_id: string };
                Returns: {
                    agreed_owner_count: number;
                    area_rate: number;
                    owner_rate: number;
                    required_rate: number;
                    total_owner_count: number;
                }[];
            };
            get_union_registration_rate: {
                Args: { p_union_id: string };
                Returns: {
                    member_count: number;
                    registered_lots: number;
                    registration_rate: number;
                    total_lots: number;
                }[];
            };
        };
        Enums: {
            ad_type: 'MAIN' | 'SUB' | 'BOARD';
            agreement_status_enum: 'AGREED' | 'DISAGREED' | 'PENDING';
            building_type_enum: 'DETACHED_HOUSE' | 'VILLA' | 'APARTMENT' | 'COMMERCIAL' | 'MIXED' | 'NONE';
            business_type_enum:
                | 'REDEVELOPMENT'
                | 'RECONSTRUCTION'
                | 'HOUSING_ASSOCIATION'
                | 'STREET_HOUSING'
                | 'SMALL_RECONSTRUCTION';
            sync_job_type_enum: 'GIS_MAP' | 'CONSENT_UPLOAD' | 'MEMBER_UPLOAD' | 'MEMBER_INVITE';
            sync_status_enum: 'PROCESSING' | 'COMPLETED' | 'FAILED';
        };
        CompositeTypes: {
            geometry_dump: {
                path: number[] | null;
                geom: unknown;
            };
            valid_detail: {
                valid: boolean | null;
                reason: string | null;
                location: unknown;
            };
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
            ad_type: ['MAIN', 'SUB', 'BOARD'],
            agreement_status_enum: ['AGREED', 'DISAGREED', 'PENDING'],
            building_type_enum: ['DETACHED_HOUSE', 'VILLA', 'APARTMENT', 'COMMERCIAL', 'MIXED', 'NONE'],
            business_type_enum: [
                'REDEVELOPMENT',
                'RECONSTRUCTION',
                'HOUSING_ASSOCIATION',
                'STREET_HOUSING',
                'SMALL_RECONSTRUCTION',
            ],
            sync_status_enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
        },
    },
} as const;

// 소유권 유형
export type OwnershipType = 'OWNER' | 'CO_OWNER' | 'FAMILY';

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
    OWNER: '소유주',
    CO_OWNER: '공동소유',
    FAMILY: '소유주 가족',
};

export const OWNERSHIP_TYPE_STYLES: Record<OwnershipType, string> = {
    OWNER: 'bg-blue-100 text-blue-800',
    CO_OWNER: 'bg-purple-100 text-purple-800',
    FAMILY: 'bg-green-100 text-green-800',
};

// ============================================
// 커스텀 타입 정의
// ============================================

// 사용자 관련
export type User = Database['public']['Tables']['users']['Row'];
export type NewUser = Database['public']['Tables']['users']['Insert'];
export type UpdateUser = Database['public']['Tables']['users']['Update'];

// 사용자 상태
export type UserStatus =
    | 'APPROVED'
    | 'REJECTED'
    | 'PRE_REGISTERED'
    | 'PENDING_PROFILE'
    | 'PENDING_APPROVAL'
    | 'APPLICANT';

// 물건지 정보
export interface MemberPropertyUnitInfo {
    id: string;
    pnu: string | null;
    dong: string | null;
    ho: string | null;
    ownership_type: OwnershipType | null;
    is_primary: boolean | null;
    land_area: number | null;
    building_area: number | null;
    land_ownership_ratio: number | null;
    building_ownership_ratio: number | null;
    property_address_jibun: string | null;
    property_address_road: string | null;
    notes: string | null;
    building_unit_id: string | null;
    building_name: string | null;
    // UI 표시용 추가 필드
    area?: number | null;
    official_price?: number | null;
    address?: string | null;
}

// 물건지와 함께 조회되는 조합원 정보
export interface MemberWithProperties extends User {
    property_units: MemberPropertyUnitInfo[];
    isPnuMatched: boolean;
    grouped_user_ids?: string[];
    total_property_count?: number;
    total_land_area?: number | null;
    total_building_area?: number | null;
}

// 조합원 초대
export type MemberInvite = Database['public']['Tables']['member_invites']['Row'];
export type NewMemberInvite = Database['public']['Tables']['member_invites']['Insert'];
export type UpdateMemberInvite = Database['public']['Tables']['member_invites']['Update'];
export type MemberInviteWithUnion = MemberInvite & {
    union: {
        id: string;
        name: string;
        slug: string;
    } | null;
};
export type SyncMemberInvitesResult = {
    inserted: number;
    deleted_pending: number;
    deleted_used: number;
    deleted_auth_user_ids?: string[];
};

// 공지사항
export type Notice = Database['public']['Tables']['notices']['Row'];
export type NewNotice = Database['public']['Tables']['notices']['Insert'];
export type UpdateNotice = Database['public']['Tables']['notices']['Update'];

// 자유게시판
export type FreeBoard = Database['public']['Tables']['free_boards']['Row'];
export type NewFreeBoard = Database['public']['Tables']['free_boards']['Insert'];
export type UpdateFreeBoard = Database['public']['Tables']['free_boards']['Update'];

// 광고
export type AdType = Database['public']['Enums']['ad_type'];
export type Advertisement = Database['public']['Tables']['advertisements']['Row'];
export type NewAdvertisement = Database['public']['Tables']['advertisements']['Insert'];
export type UpdateAdvertisement = Database['public']['Tables']['advertisements']['Update'];

// QnA 게시판
export type Question = Database['public']['Tables']['questions']['Row'];
export type NewQuestion = Database['public']['Tables']['questions']['Insert'];
export type UpdateQuestion = Database['public']['Tables']['questions']['Update'];

// 조합 정보 (게시판)
export type UnionInfo = Database['public']['Tables']['union_info']['Row'];
export type NewUnionInfo = Database['public']['Tables']['union_info']['Insert'];
export type UpdateUnionInfo = Database['public']['Tables']['union_info']['Update'];
// UnionInfo에 추가되는 타입들
export interface UnionInfoWithFiles extends UnionInfo {
    files: Database['public']['Tables']['files']['Row'][];
}
export interface UnionInfoWithAuthor extends UnionInfo {
    author: {
        id: string;
        name: string;
    } | null;
}

// 알림톡 로그 (조합 정보 포함)
export interface AlimtalkLogWithUnion {
    id: number;
    sender_id: string;
    union_id: string | null;
    title: string;
    content: string | null;
    template_code: string | null;
    template_name: string | null;
    recipient_count: number;
    success_count: number;
    fail_count: number;
    kakao_success_count: number | null;
    sms_success_count: number | null;
    cost_per_msg: number;
    estimated_cost: number | null;
    sent_at: string;
    sender_channel_name: string | null;
    notice_id: number | null;
    aligo_response: Json | null;
    recipient_details: Json | null;
    union?: {
        id: string;
        name: string;
        slug: string;
    } | null;
    sender?: {
        id: string;
        name: string;
    } | null;
}

// 조합 관련
export type Union = Database['public']['Tables']['unions']['Row'];
export type NewUnion = Database['public']['Tables']['unions']['Insert'];
export type UpdateUnion = Database['public']['Tables']['unions']['Update'];

// 히어로 슬라이드
export type HeroSlide = Database['public']['Tables']['hero_slides']['Row'];
export type NewHeroSlide = Database['public']['Tables']['hero_slides']['Insert'];
export type UpdateHeroSlide = Database['public']['Tables']['hero_slides']['Update'];

// 사용자 관련 (타입 정의가 누락된 경우를 대비하여 추가)
export type UserRole = 'USER' | 'ADMIN' | 'SYSTEM_ADMIN';

// 관리자 초대 관련
export type AdminInvite = Database['public']['Tables']['admin_invites']['Row'];
export type NewAdminInvite = Database['public']['Tables']['admin_invites']['Insert'];
export type UpdateAdminInvite = Database['public']['Tables']['admin_invites']['Update'];
export type AdminInviteWithUnion = AdminInvite & {
    union: {
        id: string;
        name: string;
        slug: string;
    } | null;
};

// 알림톡 단가 관련
export type AlimtalkPricing = Database['public']['Tables']['alimtalk_pricing']['Row'];
export type NewAlimtalkPricing = Database['public']['Tables']['alimtalk_pricing']['Insert'];
export type UpdateAlimtalkPricing = Database['public']['Tables']['alimtalk_pricing']['Update'];

// 알림톡 템플릿 관련
export type AlimtalkTemplate = Database['public']['Tables']['alimtalk_templates']['Row'];
export type NewAlimtalkTemplate = Database['public']['Tables']['alimtalk_templates']['Insert'];
export type UpdateAlimtalkTemplate = Database['public']['Tables']['alimtalk_templates']['Update'];

// 댓글 관련
export type Comment = Database['public']['Tables']['comments']['Row'];
export type NewComment = Database['public']['Tables']['comments']['Insert'];
export type UpdateComment = Database['public']['Tables']['comments']['Update'];

// 조합원 접속 로그
export type AccessType = 'LIST_VIEW' | 'DETAIL_VIEW' | 'MEMBER_UPDATE' | 'MEMBER_BLOCK';
export type MemberAccessLog = Database['public']['Tables']['member_access_logs']['Row'];
export type NewMemberAccessLog = Database['public']['Tables']['member_access_logs']['Insert'];
export type UpdateMemberAccessLog = Database['public']['Tables']['member_access_logs']['Update'];
