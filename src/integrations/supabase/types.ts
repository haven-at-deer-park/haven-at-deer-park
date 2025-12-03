export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          password_hash: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          password_hash: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          password_hash?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          event_action: string | null
          event_category: string | null
          event_label: string | null
          event_type: string
          event_value: string | null
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          timestamp: string | null
          visitor_id: string | null
        }
        Insert: {
          event_action?: string | null
          event_category?: string | null
          event_label?: string | null
          event_type: string
          event_value?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string | null
          visitor_id?: string | null
        }
        Update: {
          event_action?: string | null
          event_category?: string | null
          event_label?: string | null
          event_type?: string
          event_value?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      analytics_outbound_clicks: {
        Row: {
          button_class: string | null
          button_id: string | null
          destination_url: string
          device_type: string | null
          id: string
          link_text: string | null
          page_path: string | null
          session_id: string | null
          timestamp: string | null
          utm_campaign: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          button_class?: string | null
          button_id?: string | null
          destination_url: string
          device_type?: string | null
          id?: string
          link_text?: string | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          button_class?: string | null
          button_id?: string | null
          destination_url?: string
          device_type?: string | null
          id?: string
          link_text?: string | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_outbound_clicks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      analytics_pageviews: {
        Row: {
          id: string
          page_path: string
          page_title: string | null
          scroll_depth_percent: number | null
          session_id: string | null
          time_on_page_seconds: number | null
          timestamp: string | null
          visitor_id: string | null
        }
        Insert: {
          id?: string
          page_path: string
          page_title?: string | null
          scroll_depth_percent?: number | null
          session_id?: string | null
          time_on_page_seconds?: number | null
          timestamp?: string | null
          visitor_id?: string | null
        }
        Update: {
          id?: string
          page_path?: string
          page_title?: string | null
          scroll_depth_percent?: number | null
          session_id?: string | null
          time_on_page_seconds?: number | null
          timestamp?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pageviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          entry_page: string | null
          exit_page: string | null
          id: string
          is_bounce: boolean | null
          is_repeat_visitor: boolean | null
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          started_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          is_bounce?: boolean | null
          is_repeat_visitor?: boolean | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          started_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          is_bounce?: boolean | null
          is_repeat_visitor?: boolean | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          started_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      analytics_traffic_sources: {
        Row: {
          campaign: string | null
          id: string
          medium: string | null
          referrer_domain: string | null
          referrer_url: string | null
          session_id: string | null
          source: string
          timestamp: string | null
        }
        Insert: {
          campaign?: string | null
          id?: string
          medium?: string | null
          referrer_domain?: string | null
          referrer_url?: string | null
          session_id?: string | null
          source: string
          timestamp?: string | null
        }
        Update: {
          campaign?: string | null
          id?: string
          medium?: string | null
          referrer_domain?: string | null
          referrer_url?: string | null
          session_id?: string | null
          source?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_traffic_sources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          chat_transcript: string | null
          conversation_id: string | null
          created_at: string | null
          dates: string | null
          email: string
          id: string
          name: string
          notes: string | null
          party_size: number | null
          phone: string | null
        }
        Insert: {
          chat_transcript?: string | null
          conversation_id?: string | null
          created_at?: string | null
          dates?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          party_size?: number | null
          phone?: string | null
        }
        Update: {
          chat_transcript?: string | null
          conversation_id?: string | null
          created_at?: string | null
          dates?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          party_size?: number | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
