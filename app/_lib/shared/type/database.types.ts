export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// 커뮤니티 링크 타입 (unions.community_links JSONB 컬럼용)
export type CommunityLink = {
    platform: 'naver_cafe' | 'youtube' | 'other';
    url: string;
    active: boolean;
};

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_token_logs: {
        Row: {
          accessed_at: string | null
          accessed_path: string | null
          id: string
          ip_address: unknown
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string | null
          accessed_path?: string | null
          id?: string
          ip_address?: unknown
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string | null
          accessed_path?: string | null
          id?: string
          ip_address?: unknown
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_token_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      access_tokens: {
        Row: {
          access_scope: string | null
          allowed_pages: string[] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          key: string
          max_usage: number | null
          name: string
          union_id: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          access_scope?: string | null
          allowed_pages?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          key: string
          max_usage?: number | null
          name: string
          union_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          access_scope?: string | null
          allowed_pages?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          max_usage?: number | null
          name?: string
          union_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "access_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_tokens_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invites: {
        Row: {
          created_at: string | null
          created_by: string
          email: string | null
          expires_at: string
          id: string
          invite_token: string
          name: string
          phone_number: string
          status: string | null
          union_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          email?: string | null
          expires_at: string
          id?: string
          invite_token: string
          name: string
          phone_number: string
          status?: string | null
          union_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          name?: string
          phone_number?: string
          status?: string | null
          union_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invites_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          business_name: string
          content: string | null
          contract_end_date: string
          contract_file_url: string | null
          contract_start_date: string
          created_at: string | null
          id: string
          image_url: string | null
          image_url_mobile: string | null
          is_payment_completed: boolean | null
          link_url: string | null
          price: number | null
          title: string | null
          type: Database["public"]["Enums"]["ad_type"]
          union_id: string | null
        }
        Insert: {
          business_name: string
          content?: string | null
          contract_end_date: string
          contract_file_url?: string | null
          contract_start_date: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          image_url_mobile?: string | null
          is_payment_completed?: boolean | null
          link_url?: string | null
          price?: number | null
          title?: string | null
          type: Database["public"]["Enums"]["ad_type"]
          union_id?: string | null
        }
        Update: {
          business_name?: string
          content?: string | null
          contract_end_date?: string
          contract_file_url?: string | null
          contract_start_date?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          image_url_mobile?: string | null
          is_payment_completed?: boolean | null
          link_url?: string | null
          price?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["ad_type"]
          union_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_documents: {
        Row: {
          agenda_item_id: string | null
          assembly_id: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_current: boolean
          title: string
          union_id: string
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          agenda_item_id?: string | null
          assembly_id: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_current?: boolean
          title: string
          union_id: string
          uploaded_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          agenda_item_id?: string | null
          assembly_id?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_current?: boolean
          title?: string
          union_id?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_documents_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_documents_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_items: {
        Row: {
          agenda_type: string
          approval_threshold_pct: number | null
          assembly_id: string
          created_at: string
          description: string | null
          id: string
          quorum_requires_direct: boolean
          quorum_threshold_pct: number | null
          seq_order: number
          title: string
          union_id: string
          updated_at: string
        }
        Insert: {
          agenda_type?: string
          approval_threshold_pct?: number | null
          assembly_id: string
          created_at?: string
          description?: string | null
          id?: string
          quorum_requires_direct?: boolean
          quorum_threshold_pct?: number | null
          seq_order: number
          title: string
          union_id: string
          updated_at?: string
        }
        Update: {
          agenda_type?: string
          approval_threshold_pct?: number | null
          assembly_id?: string
          created_at?: string
          description?: string | null
          id?: string
          quorum_requires_direct?: boolean
          quorum_threshold_pct?: number | null
          seq_order?: number
          title?: string
          union_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
      alimtalk_logs: {
        Row: {
          aligo_response: Json | null
          content: string | null
          cost_per_msg: number
          estimated_cost: number | null
          fail_count: number
          id: number
          kakao_success_count: number | null
          notice_id: number | null
          recipient_count: number
          recipient_details: Json | null
          sender_channel_name: string | null
          sender_id: string
          sent_at: string
          sms_success_count: number | null
          success_count: number
          template_code: string | null
          template_name: string | null
          title: string
          union_id: string | null
        }
        Insert: {
          aligo_response?: Json | null
          content?: string | null
          cost_per_msg?: number
          estimated_cost?: number | null
          fail_count?: number
          id?: never
          kakao_success_count?: number | null
          notice_id?: number | null
          recipient_count?: number
          recipient_details?: Json | null
          sender_channel_name?: string | null
          sender_id: string
          sent_at?: string
          sms_success_count?: number | null
          success_count?: number
          template_code?: string | null
          template_name?: string | null
          title: string
          union_id?: string | null
        }
        Update: {
          aligo_response?: Json | null
          content?: string | null
          cost_per_msg?: number
          estimated_cost?: number | null
          fail_count?: number
          id?: never
          kakao_success_count?: number | null
          notice_id?: number | null
          recipient_count?: number
          recipient_details?: Json | null
          sender_channel_name?: string | null
          sender_id?: string
          sent_at?: string
          sms_success_count?: number | null
          success_count?: number
          template_code?: string | null
          template_name?: string | null
          title?: string
          union_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alimtalk_logs_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alimtalk_logs_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alimtalk_logs_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      alimtalk_pricing: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          message_type: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          message_type: string
          unit_price: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          message_type?: string
          unit_price?: number
        }
        Relationships: []
      }
      alimtalk_send_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          recipient_name: string | null
          recipient_phone: string
          related_id: string | null
          related_type: string | null
          status: string
          template_code: string
          union_id: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_name?: string | null
          recipient_phone: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          template_code: string
          union_id?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_name?: string | null
          recipient_phone?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          template_code?: string
          union_id?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "alimtalk_send_logs_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      alimtalk_templates: {
        Row: {
          buttons: Json | null
          cdate: string | null
          comments: string | null
          id: string
          insp_status: string | null
          sender_key: string | null
          status: string | null
          synced_at: string | null
          template_code: string
          template_content: string | null
          template_em_type: string | null
          template_image_name: string | null
          template_image_url: string | null
          template_name: string
          template_subtitle: string | null
          template_title: string | null
          template_type: string | null
          use_failover: boolean | null
        }
        Insert: {
          buttons?: Json | null
          cdate?: string | null
          comments?: string | null
          id?: string
          insp_status?: string | null
          sender_key?: string | null
          status?: string | null
          synced_at?: string | null
          template_code: string
          template_content?: string | null
          template_em_type?: string | null
          template_image_name?: string | null
          template_image_url?: string | null
          template_name: string
          template_subtitle?: string | null
          template_title?: string | null
          template_type?: string | null
          use_failover?: boolean | null
        }
        Update: {
          buttons?: Json | null
          cdate?: string | null
          comments?: string | null
          id?: string
          insp_status?: string | null
          sender_key?: string | null
          status?: string | null
          synced_at?: string | null
          template_code?: string
          template_content?: string | null
          template_em_type?: string | null
          template_image_name?: string | null
          template_image_url?: string | null
          template_name?: string
          template_subtitle?: string | null
          template_title?: string | null
          template_type?: string | null
          use_failover?: boolean | null
        }
        Relationships: []
      }
      assemblies: {
        Row: {
          assembly_type: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          evidence_package_url: string | null
          evidence_packaged_at: string | null
          id: string
          legal_basis: string | null
          minutes_confirmed_by: Json | null
          minutes_content_hash: string | null
          minutes_draft: string | null
          minutes_finalized_at: string | null
          notice_content: string | null
          notice_sent_at: string | null
          opened_at: string | null
          quorum_total_members: number | null
          roster_version: string | null
          scheduled_at: string
          session_mode: string
          status: string
          stream_type: string | null
          title: string
          union_id: string
          updated_at: string
          venue_address: string | null
          youtube_video_id: string | null
          zoom_meeting_id: string | null
        }
        Insert: {
          assembly_type?: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          evidence_package_url?: string | null
          evidence_packaged_at?: string | null
          id?: string
          legal_basis?: string | null
          minutes_confirmed_by?: Json | null
          minutes_content_hash?: string | null
          minutes_draft?: string | null
          minutes_finalized_at?: string | null
          notice_content?: string | null
          notice_sent_at?: string | null
          opened_at?: string | null
          quorum_total_members?: number | null
          roster_version?: string | null
          scheduled_at: string
          session_mode?: string
          status?: string
          stream_type?: string | null
          title: string
          union_id: string
          updated_at?: string
          venue_address?: string | null
          youtube_video_id?: string | null
          zoom_meeting_id?: string | null
        }
        Update: {
          assembly_type?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          evidence_package_url?: string | null
          evidence_packaged_at?: string | null
          id?: string
          legal_basis?: string | null
          minutes_confirmed_by?: Json | null
          minutes_content_hash?: string | null
          minutes_draft?: string | null
          minutes_finalized_at?: string | null
          notice_content?: string | null
          notice_sent_at?: string | null
          opened_at?: string | null
          quorum_total_members?: number | null
          roster_version?: string | null
          scheduled_at?: string
          session_mode?: string
          status?: string
          stream_type?: string | null
          title?: string
          union_id?: string
          updated_at?: string
          venue_address?: string | null
          youtube_video_id?: string | null
          zoom_meeting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assemblies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_attendance_logs: {
        Row: {
          assembly_id: string
          attendance_type: string
          checkin_by: string | null
          created_at: string
          device_info: Json | null
          entry_at: string | null
          exit_at: string | null
          id: string
          identity_method: string | null
          identity_verified: boolean
          identity_verified_at: string | null
          ip_address: unknown
          last_seen_at: string | null
          qr_checkin_at: string | null
          qr_checkout_at: string | null
          session_id: string | null
          snapshot_id: string
          union_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          assembly_id: string
          attendance_type: string
          checkin_by?: string | null
          created_at?: string
          device_info?: Json | null
          entry_at?: string | null
          exit_at?: string | null
          id?: string
          identity_method?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          ip_address?: unknown
          last_seen_at?: string | null
          qr_checkin_at?: string | null
          qr_checkout_at?: string | null
          session_id?: string | null
          snapshot_id: string
          union_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          assembly_id?: string
          attendance_type?: string
          checkin_by?: string | null
          created_at?: string
          device_info?: Json | null
          entry_at?: string | null
          exit_at?: string | null
          id?: string
          identity_method?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          ip_address?: unknown
          last_seen_at?: string | null
          qr_checkin_at?: string | null
          qr_checkout_at?: string | null
          session_id?: string | null
          snapshot_id?: string
          union_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_attendance_logs_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendance_logs_checkin_by_fkey"
            columns: ["checkin_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendance_logs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "assembly_member_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_audit_logs: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          assembly_id: string | null
          created_at: string
          current_hash: string
          event_data: Json | null
          event_type: string
          id: number
          ip_address: unknown
          prev_hash: string | null
          target_id: string | null
          target_type: string | null
          union_id: string
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          assembly_id?: string | null
          created_at?: string
          current_hash: string
          event_data?: Json | null
          event_type: string
          id?: number
          ip_address?: unknown
          prev_hash?: string | null
          target_id?: string | null
          target_type?: string | null
          union_id: string
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          assembly_id?: string | null
          created_at?: string
          current_hash?: string
          event_data?: Json | null
          event_type?: string
          id?: number
          ip_address?: unknown
          prev_hash?: string | null
          target_id?: string | null
          target_type?: string | null
          union_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_audit_logs_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_member_snapshots: {
        Row: {
          access_token_hash: string | null
          assembly_id: string
          consent_agreed_at: string | null
          created_at: string
          entity_type: string | null
          id: string
          identity_method: string | null
          identity_verified_at: string | null
          is_active: boolean
          member_name: string
          member_phone: string | null
          member_type: string
          property_address: string | null
          property_units_snapshot: Json | null
          proxy_authorized_at: string | null
          proxy_document_url: string | null
          proxy_name: string | null
          proxy_user_id: string | null
          token_expires_at: string | null
          token_used_at: string | null
          union_id: string
          user_id: string
          voting_weight: number
        }
        Insert: {
          access_token_hash?: string | null
          assembly_id: string
          consent_agreed_at?: string | null
          created_at?: string
          entity_type?: string | null
          id?: string
          identity_method?: string | null
          identity_verified_at?: string | null
          is_active?: boolean
          member_name: string
          member_phone?: string | null
          member_type?: string
          property_address?: string | null
          property_units_snapshot?: Json | null
          proxy_authorized_at?: string | null
          proxy_document_url?: string | null
          proxy_name?: string | null
          proxy_user_id?: string | null
          token_expires_at?: string | null
          token_used_at?: string | null
          union_id: string
          user_id: string
          voting_weight?: number
        }
        Update: {
          access_token_hash?: string | null
          assembly_id?: string
          consent_agreed_at?: string | null
          created_at?: string
          entity_type?: string | null
          id?: string
          identity_method?: string | null
          identity_verified_at?: string | null
          is_active?: boolean
          member_name?: string
          member_phone?: string | null
          member_type?: string
          property_address?: string | null
          property_units_snapshot?: Json | null
          proxy_authorized_at?: string | null
          proxy_document_url?: string | null
          proxy_name?: string | null
          proxy_user_id?: string | null
          token_expires_at?: string | null
          token_used_at?: string | null
          union_id?: string
          user_id?: string
          voting_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assembly_member_snapshots_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_member_snapshots_proxy_user_id_fkey"
            columns: ["proxy_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_member_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_questions: {
        Row: {
          agenda_item_id: string | null
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          approved_at: string | null
          approved_by: string | null
          assembly_id: string
          content: string
          created_at: string
          id: string
          is_approved: boolean | null
          is_read_aloud: boolean
          snapshot_id: string
          submitted_at: string
          union_id: string
          user_id: string
          visibility: string
        }
        Insert: {
          agenda_item_id?: string | null
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assembly_id: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_read_aloud?: boolean
          snapshot_id: string
          submitted_at?: string
          union_id: string
          user_id: string
          visibility?: string
        }
        Update: {
          agenda_item_id?: string | null
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assembly_id?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_read_aloud?: boolean
          snapshot_id?: string
          submitted_at?: string
          union_id?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_questions_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_questions_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_questions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_questions_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_questions_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "assembly_member_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      building_land_lots: {
        Row: {
          building_id: string
          created_at: string | null
          id: string
          note: string | null
          pnu: string
          previous_building_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          building_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          pnu: string
          previous_building_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          pnu?: string
          previous_building_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_land_lots_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_land_lots_pnu_fkey"
            columns: ["pnu"]
            isOneToOne: true
            referencedRelation: "land_lots"
            referencedColumns: ["pnu"]
          },
          {
            foreignKeyName: "building_land_lots_pnu_fkey"
            columns: ["pnu"]
            isOneToOne: true
            referencedRelation: "v_pnu_consent_status"
            referencedColumns: ["pnu"]
          },
          {
            foreignKeyName: "building_land_lots_previous_building_id_fkey"
            columns: ["previous_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_units: {
        Row: {
          area: number | null
          building_id: string
          created_at: string | null
          dong: string | null
          floor: number | null
          ho: string | null
          id: string
          official_price: number | null
          previous_building_id: string | null
        }
        Insert: {
          area?: number | null
          building_id: string
          created_at?: string | null
          dong?: string | null
          floor?: number | null
          ho?: string | null
          id?: string
          official_price?: number | null
          previous_building_id?: string | null
        }
        Update: {
          area?: number | null
          building_id?: string
          created_at?: string | null
          dong?: string | null
          floor?: number | null
          ho?: string | null
          id?: string
          official_price?: number | null
          previous_building_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_units_previous_building_id_fkey"
            columns: ["previous_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          building_name: string | null
          building_type: Database["public"]["Enums"]["building_type_enum"]
          created_at: string | null
          floor_count: number | null
          id: string
          main_purpose: string | null
          total_unit_count: number | null
          updated_at: string | null
        }
        Insert: {
          building_name?: string | null
          building_type?: Database["public"]["Enums"]["building_type_enum"]
          created_at?: string | null
          floor_count?: number | null
          id?: string
          main_purpose?: string | null
          total_unit_count?: number | null
          updated_at?: string | null
        }
        Update: {
          building_name?: string | null
          building_type?: Database["public"]["Enums"]["building_type_enum"]
          created_at?: string | null
          floor_count?: number | null
          id?: string
          main_purpose?: string | null
          total_unit_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          entity_id: number
          entity_type: string
          id: number
          parent_id: number | null
          union_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          entity_id: number
          entity_type: string
          id?: never
          parent_id?: number | null
          union_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          entity_id?: number
          entity_type?: string
          id?: never
          parent_id?: number | null
          union_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_stages: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type_enum"]
          created_at: string
          id: string
          required_rate: number
          sort_order: number
          stage_code: string
          stage_name: string
        }
        Insert: {
          business_type: Database["public"]["Enums"]["business_type_enum"]
          created_at?: string
          id?: string
          required_rate?: number
          sort_order?: number
          stage_code: string
          stage_name: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type_enum"]
          created_at?: string
          id?: string
          required_rate?: number
          sort_order?: number
          stage_code?: string
          stage_name?: string
        }
        Relationships: []
      }
      development_stages: {
        Row: {
          business_type: string
          created_at: string | null
          id: string
          sort_order: number | null
          stage_name: string
        }
        Insert: {
          business_type: string
          created_at?: string | null
          id?: string
          sort_order?: number | null
          stage_name: string
        }
        Update: {
          business_type?: string
          created_at?: string | null
          id?: string
          sort_order?: number | null
          stage_name?: string
        }
        Relationships: []
      }
      document_view_logs: {
        Row: {
          assembly_id: string
          document_id: string
          id: string
          ip_address: unknown
          union_id: string
          user_agent: string | null
          user_id: string
          viewed_at: string
        }
        Insert: {
          assembly_id: string
          document_id: string
          id?: string
          ip_address?: unknown
          union_id: string
          user_agent?: string | null
          user_id: string
          viewed_at?: string
        }
        Update: {
          assembly_id?: string
          document_id?: string
          id?: string
          ip_address?: unknown
          union_id?: string
          user_agent?: string | null
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_view_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "agenda_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_view_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          attachable_id: number | null
          attachable_type: string | null
          bucket_id: string
          created_at: string
          id: string
          name: string
          path: string
          size: number
          type: string
          union_id: string | null
          updated_at: string
          uploader_id: string | null
        }
        Insert: {
          attachable_id?: number | null
          attachable_type?: string | null
          bucket_id: string
          created_at?: string
          id?: string
          name: string
          path: string
          size: number
          type: string
          union_id?: string | null
          updated_at?: string
          uploader_id?: string | null
        }
        Update: {
          attachable_id?: number | null
          attachable_type?: string | null
          bucket_id?: string
          created_at?: string
          id?: string
          name?: string
          path?: string
          size?: number
          type?: string
          union_id?: string | null
          updated_at?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      free_boards: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: number
          title: string
          union_id: string | null
          updated_at: string
          views: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: never
          title: string
          union_id?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: never
          title?: string
          union_id?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "free_boards_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_boards_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          union_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          union_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          union_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hero_slides_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      land_lots: {
        Row: {
          address: string
          address_text: string | null
          area: number | null
          boundary: unknown
          created_at: string
          land_category: string | null
          official_price: number | null
          owner_count: number | null
          pnu: string
          road_address: string | null
          union_id: string | null
          updated_at: string
        }
        Insert: {
          address: string
          address_text?: string | null
          area?: number | null
          boundary?: unknown
          created_at?: string
          land_category?: string | null
          official_price?: number | null
          owner_count?: number | null
          pnu: string
          road_address?: string | null
          union_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          address_text?: string | null
          area?: number | null
          boundary?: unknown
          created_at?: string
          land_category?: string | null
          official_price?: number | null
          owner_count?: number | null
          pnu?: string
          road_address?: string | null
          union_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "land_lots_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_access_logs: {
        Row: {
          access_type: string
          accessed_at: string
          created_at: string
          id: string
          ip_address: string | null
          union_id: string
          user_agent: string | null
          viewer_id: string
          viewer_name: string
        }
        Insert: {
          access_type: string
          accessed_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          union_id: string
          user_agent?: string | null
          viewer_id: string
          viewer_name: string
        }
        Update: {
          access_type?: string
          accessed_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          union_id?: string
          user_agent?: string | null
          viewer_id?: string
          viewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_access_logs_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_access_logs_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_invites: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          invite_token: string
          name: string
          phone_number: string
          property_address: string
          property_pnu: string | null
          status: string | null
          union_id: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          invite_token: string
          name: string
          phone_number: string
          property_address: string
          property_pnu?: string | null
          status?: string | null
          union_id: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          invite_token?: string
          name?: string
          phone_number?: string
          property_address?: string
          property_pnu?: string | null
          status?: string | null
          union_id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_invites_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          content: string
          created_at: string
          end_date: string | null
          id: number
          is_popup: boolean
          start_date: string | null
          title: string
          union_id: string | null
          updated_at: string
          views: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          end_date?: string | null
          id?: never
          is_popup?: boolean
          start_date?: string | null
          title: string
          union_id?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          end_date?: string | null
          id?: never
          is_popup?: boolean
          start_date?: string | null
          title?: string
          union_id?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      participation_records: {
        Row: {
          assembly_id: string
          created_at: string
          first_voted_at: string
          id: string
          last_voted_at: string
          poll_id: string
          proxy_user_id: string | null
          receipt_token: string | null
          snapshot_id: string
          union_id: string
          updated_at: string
          user_id: string
          vote_count: number
          voting_method: string
        }
        Insert: {
          assembly_id: string
          created_at?: string
          first_voted_at?: string
          id?: string
          last_voted_at?: string
          poll_id: string
          proxy_user_id?: string | null
          receipt_token?: string | null
          snapshot_id: string
          union_id: string
          updated_at?: string
          user_id: string
          vote_count?: number
          voting_method: string
        }
        Update: {
          assembly_id?: string
          created_at?: string
          first_voted_at?: string
          id?: string
          last_voted_at?: string
          poll_id?: string
          proxy_user_id?: string | null
          receipt_token?: string | null
          snapshot_id?: string
          union_id?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
          voting_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "participation_records_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_records_proxy_user_id_fkey"
            columns: ["proxy_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_records_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "assembly_member_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          option_type: string
          poll_id: string
          seq_order: number
          union_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          option_type?: string
          poll_id: string
          seq_order: number
          union_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          option_type?: string
          poll_id?: string
          seq_order?: number
          union_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          agenda_item_id: string
          allow_abstain: boolean
          allow_electronic: boolean
          allow_onsite: boolean
          allow_proxy: boolean
          allow_vote_revision: boolean
          allow_written: boolean
          assembly_id: string
          closed_by: string | null
          closes_at: string
          created_at: string
          id: string
          opened_by: string | null
          opens_at: string
          status: string
          union_id: string
          updated_at: string
        }
        Insert: {
          agenda_item_id: string
          allow_abstain?: boolean
          allow_electronic?: boolean
          allow_onsite?: boolean
          allow_proxy?: boolean
          allow_vote_revision?: boolean
          allow_written?: boolean
          assembly_id: string
          closed_by?: string | null
          closes_at: string
          created_at?: string
          id?: string
          opened_by?: string | null
          opens_at: string
          status?: string
          union_id: string
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string
          allow_abstain?: boolean
          allow_electronic?: boolean
          allow_onsite?: boolean
          allow_proxy?: boolean
          allow_vote_revision?: boolean
          allow_written?: boolean
          assembly_id?: string
          closed_by?: string | null
          closes_at?: string
          created_at?: string
          id?: string
          opened_by?: string | null
          opens_at?: string
          status?: string
          union_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_ownership_history: {
        Row: {
          change_reason: string | null
          change_type: string
          changed_at: string | null
          changed_by: string | null
          from_user_id: string | null
          id: string
          new_ratio: number | null
          previous_ratio: number | null
          property_unit_id: string
          to_user_id: string | null
        }
        Insert: {
          change_reason?: string | null
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          from_user_id?: string | null
          id?: string
          new_ratio?: number | null
          previous_ratio?: number | null
          property_unit_id: string
          to_user_id?: string | null
        }
        Update: {
          change_reason?: string | null
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          from_user_id?: string | null
          id?: string
          new_ratio?: number | null
          previous_ratio?: number | null
          property_unit_id?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_ownership_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_ownership_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_ownership_history_property_unit_id_fkey"
            columns: ["property_unit_id"]
            isOneToOne: false
            referencedRelation: "user_property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_ownership_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer_author_id: string | null
          answer_content: string | null
          answered_at: string | null
          author_id: string
          content: string
          created_at: string | null
          id: number
          is_secret: boolean | null
          title: string
          union_id: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          answer_author_id?: string | null
          answer_content?: string | null
          answered_at?: string | null
          author_id: string
          content: string
          created_at?: string | null
          id?: never
          is_secret?: boolean | null
          title: string
          union_id?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          answer_author_id?: string | null
          answer_content?: string | null
          answered_at?: string | null
          author_id?: string
          content?: string
          created_at?: string | null
          id?: never
          is_secret?: boolean | null
          title?: string
          union_id?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_answer_author_id_fkey"
            columns: ["answer_author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_alimtalks: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          notice_id: number | null
          processed_at: string | null
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
          template_code: string
          union_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          notice_id?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          template_code: string
          union_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          notice_id?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          template_code?: string
          union_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_alimtalks_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_alimtalks_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_send_details: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          log_id: string | null
          message_sent: string
          recipient_name: string
          recipient_phone: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          log_id?: string | null
          message_sent: string
          recipient_name: string
          recipient_phone: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          log_id?: string | null
          message_sent?: string
          recipient_name?: string
          recipient_phone?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_send_details_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "sms_send_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_send_logs: {
        Row: {
          aligo_msg_ids: string[] | null
          completed_at: string | null
          created_at: string | null
          estimated_cost: number | null
          fail_count: number | null
          id: string
          message: string
          msg_type: string
          sender_id: string | null
          status: string | null
          success_count: number | null
          title: string | null
          total_count: number
          union_id: string | null
        }
        Insert: {
          aligo_msg_ids?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          fail_count?: number | null
          id?: string
          message: string
          msg_type: string
          sender_id?: string | null
          status?: string | null
          success_count?: number | null
          title?: string | null
          total_count?: number
          union_id?: string | null
        }
        Update: {
          aligo_msg_ids?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          fail_count?: number | null
          id?: string
          message?: string
          msg_type?: string
          sender_id?: string | null
          status?: string | null
          success_count?: number | null
          title?: string | null
          total_count?: number
          union_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_send_logs_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_send_logs_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      speaker_requests: {
        Row: {
          agenda_item_id: string | null
          approved_at: string | null
          approved_by: string | null
          assembly_id: string
          created_at: string
          id: string
          queue_position: number | null
          requested_at: string
          snapshot_id: string
          status: string
          union_id: string
          user_id: string
        }
        Insert: {
          agenda_item_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assembly_id: string
          created_at?: string
          id?: string
          queue_position?: number | null
          requested_at?: string
          snapshot_id: string
          status?: string
          union_id: string
          user_id: string
        }
        Update: {
          agenda_item_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assembly_id?: string
          created_at?: string
          id?: string
          queue_position?: number | null
          requested_at?: string
          snapshot_id?: string
          status?: string
          union_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_requests_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_requests_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_requests_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "assembly_member_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          created_at: string
          error_log: string | null
          id: string
          is_published: boolean | null
          job_type: Database["public"]["Enums"]["sync_job_type_enum"]
          preview_data: Json | null
          progress: number
          status: Database["public"]["Enums"]["sync_status_enum"]
          union_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_log?: string | null
          id?: string
          is_published?: boolean | null
          job_type?: Database["public"]["Enums"]["sync_job_type_enum"]
          preview_data?: Json | null
          progress?: number
          status?: Database["public"]["Enums"]["sync_status_enum"]
          union_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_log?: string | null
          id?: string
          is_published?: boolean | null
          job_type?: Database["public"]["Enums"]["sync_job_type_enum"]
          preview_data?: Json | null
          progress?: number
          status?: Database["public"]["Enums"]["sync_status_enum"]
          union_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      union_info: {
        Row: {
          author_id: string
          content: string
          created_at: string
          has_attachments: boolean
          id: number
          thumbnail_url: string | null
          title: string
          union_id: string | null
          updated_at: string
          views: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          has_attachments?: boolean
          id?: never
          thumbnail_url?: string | null
          title: string
          union_id?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          has_attachments?: boolean
          id?: never
          thumbnail_url?: string | null
          title?: string
          union_id?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "union_info_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "union_info_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      unions: {
        Row: {
          address: string | null
          approval_date: string | null
          area_size: number | null
          business_hours: string | null
          business_type:
            | Database["public"]["Enums"]["business_type_enum"]
            | null
          community_links: Json | null
          created_at: string
          current_stage_id: string | null
          description: string | null
          district_name: string | null
          email: string | null
          establishment_date: string | null
          id: string
          is_active: boolean
          kakao_channel_id: string | null
          logo_url: string | null
          member_count: number | null
          name: string
          office_address: string | null
          office_phone: string | null
          phone: string | null
          registration_number: string | null
          slug: string
          updated_at: string
          vault_sender_key_id: string | null
        }
        Insert: {
          address?: string | null
          approval_date?: string | null
          area_size?: number | null
          business_hours?: string | null
          business_type?:
            | Database["public"]["Enums"]["business_type_enum"]
            | null
          community_links?: Json | null
          created_at?: string
          current_stage_id?: string | null
          description?: string | null
          district_name?: string | null
          email?: string | null
          establishment_date?: string | null
          id?: string
          is_active?: boolean
          kakao_channel_id?: string | null
          logo_url?: string | null
          member_count?: number | null
          name: string
          office_address?: string | null
          office_phone?: string | null
          phone?: string | null
          registration_number?: string | null
          slug: string
          updated_at?: string
          vault_sender_key_id?: string | null
        }
        Update: {
          address?: string | null
          approval_date?: string | null
          area_size?: number | null
          business_hours?: string | null
          business_type?:
            | Database["public"]["Enums"]["business_type_enum"]
            | null
          community_links?: Json | null
          created_at?: string
          current_stage_id?: string | null
          description?: string | null
          district_name?: string | null
          email?: string | null
          establishment_date?: string | null
          id?: string
          is_active?: boolean
          kakao_channel_id?: string | null
          logo_url?: string | null
          member_count?: number | null
          name?: string
          office_address?: string | null
          office_phone?: string | null
          phone?: string | null
          registration_number?: string | null
          slug?: string
          updated_at?: string
          vault_sender_key_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unions_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "development_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_auth_links: {
        Row: {
          auth_user_id: string
          created_at: string | null
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_auth_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_date: string | null
          id: string
          stage_id: string
          status: Database["public"]["Enums"]["agreement_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_date?: string | null
          id?: string
          stage_id: string
          status?: Database["public"]["Enums"]["agreement_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_date?: string | null
          id?: string
          stage_id?: string
          status?: Database["public"]["Enums"]["agreement_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "consent_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_consents_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_pnu_consent_status"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_property_units: {
        Row: {
          building_area: number | null
          building_name: string | null
          building_ownership_ratio: number | null
          building_unit_id: string | null
          created_at: string | null
          dong: string | null
          ho: string | null
          id: string
          is_active: boolean
          is_primary: boolean | null
          land_area: number | null
          land_ownership_ratio: number | null
          notes: string | null
          ownership_ratio: number
          ownership_type: string | null
          pnu: string | null
          previous_pnu: string | null
          property_address_jibun: string | null
          property_address_road: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          building_area?: number | null
          building_name?: string | null
          building_ownership_ratio?: number | null
          building_unit_id?: string | null
          created_at?: string | null
          dong?: string | null
          ho?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean | null
          land_area?: number | null
          land_ownership_ratio?: number | null
          notes?: string | null
          ownership_ratio?: number
          ownership_type?: string | null
          pnu?: string | null
          previous_pnu?: string | null
          property_address_jibun?: string | null
          property_address_road?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          building_area?: number | null
          building_name?: string | null
          building_ownership_ratio?: number | null
          building_unit_id?: string | null
          created_at?: string | null
          dong?: string | null
          ho?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean | null
          land_area?: number | null
          land_ownership_ratio?: number | null
          notes?: string | null
          ownership_ratio?: number
          ownership_type?: string | null
          pnu?: string | null
          previous_pnu?: string | null
          property_address_jibun?: string | null
          property_address_road?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_property_units_building_unit_id_fkey"
            columns: ["building_unit_id"]
            isOneToOne: false
            referencedRelation: "building_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_property_units_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_relationships: {
        Row: {
          created_at: string | null
          id: string
          related_user_id: string
          relationship_type: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          related_user_id: string
          relationship_type: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          related_user_id?: string
          relationship_type?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_relationships_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_relationships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          approved_at: string | null
          birth_date: string | null
          blocked_at: string | null
          blocked_reason: string | null
          business_registration_no: string | null
          canonical_user_id: string | null
          created_at: string
          email: string | null
          entity_type: string | null
          executive_sort_order: number | null
          executive_title: string | null
          id: string
          is_blocked: boolean | null
          is_executive: boolean | null
          name: string
          notes: string | null
          phone_number: string | null
          property_address: string | null
          property_address_detail: string | null
          property_type: string | null
          property_zonecode: string | null
          rejected_at: string | null
          rejected_reason: string | null
          representative_name: string | null
          resident_address: string | null
          resident_address_detail: string | null
          resident_address_jibun: string | null
          resident_address_road: string | null
          resident_zonecode: string | null
          role: string
          union_id: string | null
          updated_at: string | null
          user_status: string | null
          voting_weight: number
        }
        Insert: {
          approved_at?: string | null
          birth_date?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          business_registration_no?: string | null
          canonical_user_id?: string | null
          created_at?: string
          email?: string | null
          entity_type?: string | null
          executive_sort_order?: number | null
          executive_title?: string | null
          id: string
          is_blocked?: boolean | null
          is_executive?: boolean | null
          name: string
          notes?: string | null
          phone_number?: string | null
          property_address?: string | null
          property_address_detail?: string | null
          property_type?: string | null
          property_zonecode?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          representative_name?: string | null
          resident_address?: string | null
          resident_address_detail?: string | null
          resident_address_jibun?: string | null
          resident_address_road?: string | null
          resident_zonecode?: string | null
          role?: string
          union_id?: string | null
          updated_at?: string | null
          user_status?: string | null
          voting_weight?: number
        }
        Update: {
          approved_at?: string | null
          birth_date?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          business_registration_no?: string | null
          canonical_user_id?: string | null
          created_at?: string
          email?: string | null
          entity_type?: string | null
          executive_sort_order?: number | null
          executive_title?: string | null
          id?: string
          is_blocked?: boolean | null
          is_executive?: boolean | null
          name?: string
          notes?: string | null
          phone_number?: string | null
          property_address?: string | null
          property_address_detail?: string | null
          property_type?: string | null
          property_zonecode?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          representative_name?: string | null
          resident_address?: string | null
          resident_address_detail?: string | null
          resident_address_jibun?: string | null
          resident_address_road?: string | null
          resident_zonecode?: string | null
          role?: string
          union_id?: string | null
          updated_at?: string | null
          user_status?: string | null
          voting_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "users_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_ballots: {
        Row: {
          assembly_id: string
          created_at: string
          entered_by: string | null
          id: string
          is_superseded: boolean
          option_id: string
          poll_id: string
          submitted_at: string
          superseded_at: string | null
          union_id: string
          verified_by: string | null
          voting_method: string
          voting_weight: number
        }
        Insert: {
          assembly_id: string
          created_at?: string
          entered_by?: string | null
          id?: string
          is_superseded?: boolean
          option_id: string
          poll_id: string
          submitted_at?: string
          superseded_at?: string | null
          union_id: string
          verified_by?: string | null
          voting_method: string
          voting_weight?: number
        }
        Update: {
          assembly_id?: string
          created_at?: string
          entered_by?: string | null
          id?: string
          is_superseded?: boolean
          option_id?: string
          poll_id?: string
          submitted_at?: string
          superseded_at?: string | null
          union_id?: string
          verified_by?: string | null
          voting_method?: string
          voting_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "vote_ballots_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_ballots_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_ballots_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_ballots_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_tally_results: {
        Row: {
          assembly_id: string
          id: string
          option_id: string
          poll_id: string
          tallied_at: string
          tallied_by: string | null
          union_id: string
          vote_count: number
          vote_weight_sum: number
          voting_method: string
        }
        Insert: {
          assembly_id: string
          id?: string
          option_id: string
          poll_id: string
          tallied_at?: string
          tallied_by?: string | null
          union_id: string
          vote_count?: number
          vote_weight_sum?: number
          voting_method: string
        }
        Update: {
          assembly_id?: string
          id?: string
          option_id?: string
          poll_id?: string
          tallied_at?: string
          tallied_by?: string | null
          union_id?: string
          vote_count?: number
          vote_weight_sum?: number
          voting_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_tally_results_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_tally_results_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_tally_results_tallied_by_fkey"
            columns: ["tallied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      written_ballot_inputs: {
        Row: {
          assembly_id: string
          created_at: string
          dispute_note: string | null
          id: string
          input_at: string
          input_choice_id: string
          inputter_id: string
          member_id: string
          poll_id: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_choice_id: string | null
          scan_image_url: string | null
          status: string
          union_id: string
          verified_at: string | null
          verifier_id: string | null
        }
        Insert: {
          assembly_id: string
          created_at?: string
          dispute_note?: string | null
          id?: string
          input_at?: string
          input_choice_id: string
          inputter_id: string
          member_id: string
          poll_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_choice_id?: string | null
          scan_image_url?: string | null
          status?: string
          union_id: string
          verified_at?: string | null
          verifier_id?: string | null
        }
        Update: {
          assembly_id?: string
          created_at?: string
          dispute_note?: string | null
          id?: string
          input_at?: string
          input_choice_id?: string
          inputter_id?: string
          member_id?: string
          poll_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_choice_id?: string | null
          scan_image_url?: string | null
          status?: string
          union_id?: string
          verified_at?: string | null
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "written_ballot_inputs_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_ballot_inputs_input_choice_id_fkey"
            columns: ["input_choice_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_ballot_inputs_inputter_id_fkey"
            columns: ["inputter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_ballot_inputs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_ballot_inputs_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_ballot_inputs_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_ballot_inputs_resolved_choice_id_fkey"
            columns: ["resolved_choice_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_ballot_inputs_verifier_id_fkey"
            columns: ["verifier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          flag_name: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          flag_name: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          flag_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      migration_user_mapping: {
        Row: {
          id: string
          migrated_at: string | null
          new_ownership_id: string | null
          new_property_unit_id: string | null
          notes: string | null
          original_upu_id: string
        }
        Insert: {
          id?: string
          migrated_at?: string | null
          new_ownership_id?: string | null
          new_property_unit_id?: string | null
          notes?: string | null
          original_upu_id: string
        }
        Update: {
          id?: string
          migrated_at?: string | null
          new_ownership_id?: string | null
          new_property_unit_id?: string | null
          notes?: string | null
          original_upu_id?: string
        }
        Relationships: []
      }
      property_units: {
        Row: {
          building_area: number | null
          building_name: string | null
          building_unit_id: string | null
          created_at: string
          dong: string | null
          ho: string | null
          id: string
          is_deleted: boolean
          land_area: number | null
          notes: string | null
          official_price: number | null
          pnu: string | null
          previous_pnu: string | null
          property_address_jibun: string | null
          property_address_road: string | null
          property_zonecode: string | null
          union_id: string
          updated_at: string
        }
        Insert: {
          building_area?: number | null
          building_name?: string | null
          building_unit_id?: string | null
          created_at?: string
          dong?: string | null
          ho?: string | null
          id?: string
          is_deleted?: boolean
          land_area?: number | null
          notes?: string | null
          official_price?: number | null
          pnu?: string | null
          previous_pnu?: string | null
          property_address_jibun?: string | null
          property_address_road?: string | null
          property_zonecode?: string | null
          union_id: string
          updated_at?: string
        }
        Update: {
          building_area?: number | null
          building_name?: string | null
          building_unit_id?: string | null
          created_at?: string
          dong?: string | null
          ho?: string | null
          id?: string
          is_deleted?: boolean
          land_area?: number | null
          notes?: string | null
          official_price?: number | null
          pnu?: string | null
          previous_pnu?: string | null
          property_address_jibun?: string | null
          property_address_road?: string | null
          property_zonecode?: string | null
          union_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_units_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      property_ownerships: {
        Row: {
          building_ownership_ratio: number | null
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          land_ownership_ratio: number | null
          notes: string | null
          ownership_ratio: number
          ownership_type: string
          property_unit_id: string
          source_upu_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          building_ownership_ratio?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          land_ownership_ratio?: number | null
          notes?: string | null
          ownership_ratio?: number
          ownership_type?: string
          property_unit_id: string
          source_upu_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          building_ownership_ratio?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          land_ownership_ratio?: number | null
          notes?: string | null
          ownership_ratio?: number
          ownership_type?: string
          property_unit_id?: string
          source_upu_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_ownerships_property_unit_id_fkey"
            columns: ["property_unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_ownerships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      co_ownership_groups: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          property_unit_id: string
          representative_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          property_unit_id: string
          representative_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          property_unit_id?: string
          representative_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_ownership_groups_property_unit_id_fkey"
            columns: ["property_unit_id"]
            isOneToOne: true
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_ownership_groups_representative_user_id_fkey"
            columns: ["representative_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_merge_history: {
        Row: {
          canonical_user_id: string
          duplicate_user_id: string
          id: string
          merge_reason: string | null
          merged_at: string
          merged_by: string
          snapshot_before: Json | null
        }
        Insert: {
          canonical_user_id: string
          duplicate_user_id: string
          id?: string
          merge_reason?: string | null
          merged_at?: string
          merged_by: string
          snapshot_before?: Json | null
        }
        Update: {
          canonical_user_id?: string
          duplicate_user_id?: string
          id?: string
          merge_reason?: string | null
          merged_at?: string
          merged_by?: string
          snapshot_before?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_merge_history_canonical_user_id_fkey"
            columns: ["canonical_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_merge_history_duplicate_user_id_fkey"
            columns: ["duplicate_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_merge_history_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      merge_exclusions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          status: string
          union_id: string
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          union_id: string
          user_id_a: string
          user_id_b: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          union_id?: string
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "merge_exclusions_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      v_pnu_consent_status: {
        Row: {
          address: string | null
          agreed_count: number | null
          consent_status: string | null
          pnu: string | null
          required_rate: number | null
          stage_id: string | null
          stage_name: string | null
          total_owners: number | null
          union_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "land_lots_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      cast_vote: {
        Args: {
          p_assembly_id: string
          p_option_id: string
          p_poll_id: string
          p_snapshot_id: string
          p_union_id: string
          p_user_id: string
          p_voting_weight?: number
        }
        Returns: Json
      }
      cleanup_ghost_sessions: {
        Args: { p_grace_seconds?: number }
        Returns: number
      }
      delete_old_access_logs: {
        Args: { months_to_keep?: number }
        Returns: number
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_duplicate_users_by_name_residence: {
        Args: {
          p_exclude_user_id?: string
          p_name: string
          p_resident_address_jibun: string
          p_union_id: string
        }
        Returns: {
          created_at: string
          user_id: string
          user_name: string
          user_status: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_current_pricing: {
        Args: never
        Returns: {
          message_type: string
          unit_price: number
        }[]
      }
      get_grouped_members: {
        Args: {
          p_blocked_filter?: string
          p_page?: number
          p_page_size?: number
          p_search_query?: string
          p_union_id: string
        }
        Returns: {
          birth_date: string
          blocked_at: string
          blocked_reason: string
          building_area: number
          building_ownership_ratio: number
          created_at: string
          email: string
          group_key: string
          grouped_user_ids: string[]
          id: string
          is_blocked: boolean
          land_area: number
          land_ownership_ratio: number
          name: string
          notes: string
          phone_number: string
          property_address: string
          property_address_detail: string
          property_address_jibun: string
          property_address_road: string
          property_dong: string
          property_ho: string
          property_pnu: string
          property_type: string
          property_zonecode: string
          resident_address: string
          resident_address_detail: string
          resident_address_jibun: string
          resident_address_road: string
          resident_zonecode: string
          role: string
          total_building_area: number
          total_count: number
          total_land_area: number
          total_property_count: number
          union_id: string
          updated_at: string
          user_status: string
        }[]
      }
      get_quorum_status: { Args: { p_assembly_id: string }; Returns: Json }
      get_union_consent_map_data: {
        Args: { p_stage_id: string; p_union_id: string }
        Returns: {
          address: string
          agreed_count: number
          area: number
          boundary_geojson: Json
          consent_status: string
          official_price: number
          pnu: string
          total_owners: number
        }[]
      }
      get_union_consent_rate: {
        Args: { p_stage_id: string; p_union_id: string }
        Returns: {
          agreed_area: number
          agreed_owners: number
          area_rate: number
          owner_rate: number
          total_area: number
          total_owners: number
        }[]
      }
      get_union_parcels_geojson: {
        Args: { p_union_id: string }
        Returns: {
          address: string
          area: number
          boundary_geojson: Json
          official_price: number
          owner_count: number
          pnu: string
        }[]
      }
      get_union_parcels_without_boundary: {
        Args: { p_union_id: string }
        Returns: {
          address: string
          pnu: string
        }[]
      }
      get_union_registration_map_data: {
        Args: { p_union_id: string }
        Returns: {
          address: string
          area: number
          boundary_geojson: Json
          official_price: number
          pnu: string
          registered_count: number
          registration_status: string
          total_owners: number
        }[]
      }
      get_union_registration_rate: {
        Args: { p_union_id: string }
        Returns: {
          registered_land_lots: number
          registration_rate: number
          total_land_lots: number
          total_members: number
        }[]
      }
      get_user_ids: { Args: never; Returns: string[] }
      get_user_role_in_union: { Args: { p_union_id: string }; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      increment_access_token_usage: {
        Args: { p_token_id: string }
        Returns: {
          new_count: number
          success: boolean
        }[]
      }
      increment_free_board_views: {
        Args: { free_board_id: number }
        Returns: undefined
      }
      increment_notice_views: {
        Args: { notice_id: number }
        Returns: undefined
      }
      increment_question_views: {
        Args: { question_id: number }
        Returns: undefined
      }
      increment_union_info_views: {
        Args: { p_union_info_id: number }
        Returns: undefined
      }
      is_system_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      merge_users_keep_new: {
        Args: { p_duplicate_ids: string[]; p_keeper_id: string }
        Returns: Json
      }
      normalize_jibun_address: { Args: { addr: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      register_union_sender_key: {
        Args: {
          p_channel_name: string
          p_sender_key: string
          p_union_id: string
        }
        Returns: string
      }
      resolve_user_profile: {
        Args: { p_auth_user_id: string; p_slug?: string }
        Returns: {
          approved_at: string | null
          birth_date: string | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          email: string | null
          executive_sort_order: number | null
          executive_title: string | null
          id: string
          is_blocked: boolean | null
          is_executive: boolean | null
          name: string
          notes: string | null
          phone_number: string | null
          property_address: string | null
          property_address_detail: string | null
          property_type: string | null
          property_zonecode: string | null
          rejected_at: string | null
          rejected_reason: string | null
          resident_address: string | null
          resident_address_detail: string | null
          resident_address_jibun: string | null
          resident_address_road: string | null
          resident_zonecode: string | null
          role: string
          union_id: string | null
          updated_at: string | null
          user_status: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      sync_member_invites: {
        Args: {
          p_created_by: string
          p_expires_hours: number
          p_members: Json
          p_union_id: string
        }
        Returns: Json
      }
      tally_votes: { Args: { p_poll_id: string }; Returns: Json }
      transition_to_notice_sent: {
        Args: { p_actor_id?: string; p_assembly_id: string; p_union_id: string }
        Returns: Json
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      use_access_token: {
        Args: {
          p_accessed_path?: string
          p_ip_address?: unknown
          p_token_id: string
          p_user_agent?: string
        }
        Returns: {
          new_count: number
          success: boolean
        }[]
      }
      verify_onsite_ballot: {
        Args: {
          p_assembly_id: string
          p_ballot_input_id: string
          p_union_id: string
          p_verifier_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      ad_type: "MAIN" | "SUB" | "BOARD"
      agreement_status_enum: "AGREED" | "DISAGREED" | "PENDING"
      building_type_enum:
        | "DETACHED_HOUSE"
        | "VILLA"
        | "APARTMENT"
        | "COMMERCIAL"
        | "MIXED"
        | "NONE"
      business_type_enum:
        | "REDEVELOPMENT"
        | "RECONSTRUCTION"
        | "HOUSING_ASSOCIATION"
        | "STREET_HOUSING"
        | "SMALL_RECONSTRUCTION"
      sync_job_type_enum:
        | "GIS_MAP"
        | "CONSENT_UPLOAD"
        | "MEMBER_UPLOAD"
        | "MEMBER_INVITE"
      sync_status_enum: "PROCESSING" | "COMPLETED" | "FAILED"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ad_type: ["MAIN", "SUB", "BOARD"],
      agreement_status_enum: ["AGREED", "DISAGREED", "PENDING"],
      building_type_enum: [
        "DETACHED_HOUSE",
        "VILLA",
        "APARTMENT",
        "COMMERCIAL",
        "MIXED",
        "NONE",
      ],
      business_type_enum: [
        "REDEVELOPMENT",
        "RECONSTRUCTION",
        "HOUSING_ASSOCIATION",
        "STREET_HOUSING",
        "SMALL_RECONSTRUCTION",
      ],
      sync_job_type_enum: [
        "GIS_MAP",
        "CONSENT_UPLOAD",
        "MEMBER_UPLOAD",
        "MEMBER_INVITE",
      ],
      sync_status_enum: ["PROCESSING", "COMPLETED", "FAILED"],
    },
  },
} as const


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
    | 'TRANSFERRED'   // FEAT-008: 소유권 이전(매매)으로 인한 탈퇴
    | 'PRE_REGISTERED'
    | 'PENDING_PROFILE'
    | 'PENDING_APPROVAL'
    | 'APPLICANT'
    | 'MERGED';

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

// FEAT-009: 사용자 관계 (가족/대리인/법정후견인)
export type RelationshipType = 'FAMILY' | 'PROXY' | 'LEGAL_GUARDIAN';
export type UserRelationship = Database['public']['Tables']['user_relationships']['Row'];
export type NewUserRelationship = Database['public']['Tables']['user_relationships']['Insert'];
export type UpdateUserRelationship = Database['public']['Tables']['user_relationships']['Update'];

// FEAT-010: 소유권 변동 이력
export type OwnershipChangeType = 'TRANSFER' | 'CO_OWNER_ADDED' | 'CO_OWNER_REMOVED' | 'RATIO_CHANGED';
export type PropertyOwnershipHistory = Database['public']['Tables']['property_ownership_history']['Row'];
export type NewPropertyOwnershipHistory = Database['public']['Tables']['property_ownership_history']['Insert'];
export type UpdatePropertyOwnershipHistory = Database['public']['Tables']['property_ownership_history']['Update'];

// M:N 소유 관계 스키마 타입
export type EntityType = 'INDIVIDUAL' | 'CORPORATION' | 'GOVERNMENT' | 'PUBLIC_CORP';

export type PropertyUnit = Database['public']['Tables']['property_units']['Row'];
export type NewPropertyUnit = Database['public']['Tables']['property_units']['Insert'];
export type UpdatePropertyUnit = Database['public']['Tables']['property_units']['Update'];

export type PropertyOwnership = Database['public']['Tables']['property_ownerships']['Row'];
export type NewPropertyOwnership = Database['public']['Tables']['property_ownerships']['Insert'];
export type UpdatePropertyOwnership = Database['public']['Tables']['property_ownerships']['Update'];

export type CoOwnershipGroup = Database['public']['Tables']['co_ownership_groups']['Row'];
export type NewCoOwnershipGroup = Database['public']['Tables']['co_ownership_groups']['Insert'];

export type UserMergeHistory = Database['public']['Tables']['user_merge_history']['Row'];
export type NewUserMergeHistory = Database['public']['Tables']['user_merge_history']['Insert'];

export type MergeExclusion = Database['public']['Tables']['merge_exclusions']['Row'];
export type NewMergeExclusion = Database['public']['Tables']['merge_exclusions']['Insert'];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
    INDIVIDUAL: '개인',
    CORPORATION: '법인',
    GOVERNMENT: '관청',
    PUBLIC_CORP: '공공기관',
};

export const ENTITY_TYPE_STYLES: Record<EntityType, string> = {
    INDIVIDUAL: 'bg-gray-100 text-gray-700',
    CORPORATION: 'bg-purple-100 text-purple-700',
    GOVERNMENT: 'bg-slate-100 text-slate-700',
    PUBLIC_CORP: 'bg-blue-100 text-blue-700',
};
