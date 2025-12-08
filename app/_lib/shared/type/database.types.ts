export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '13.0.5';
    };
    public: {
        Tables: {
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
                    }
                ];
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
                    created_at: string;
                    email: string;
                    id: string;
                    name: string;
                    phone_number: string;
                    role: string;
                    union_id: string | null;
                };
                Insert: {
                    created_at?: string;
                    email: string;
                    id: string;
                    name: string;
                    phone_number: string;
                    role: string;
                    union_id?: string | null;
                };
                Update: {
                    created_at?: string;
                    email?: string;
                    id?: string;
                    name?: string;
                    phone_number?: string;
                    role?: string;
                    union_id?: string | null;
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
        };
        Views: {
            [_ in never]: never;
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
        };
        Enums: {
            user_role: 'systemAdmin' | 'admin' | 'user';
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
            user_role: ['systemAdmin', 'admin', 'user'],
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

// 조합 타입
export type UnionInfoWithFiles = UnionInfo & { files: FileMeta[] };
export type UnionInfoWithAuthor = UnionInfo & { author: { id: string; name: string } | null };
