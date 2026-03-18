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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_history: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_hint: string | null
          is_paid: boolean | null
          profile_id: string | null
          referrer: string | null
          selected_menu_id: number | null
          session_token: string | null
          updated_at: string | null
          user_agent: string | null
          user_nickname: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_hint?: string | null
          is_paid?: boolean | null
          profile_id?: string | null
          referrer?: string | null
          selected_menu_id?: number | null
          session_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_nickname?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_hint?: string | null
          is_paid?: boolean | null
          profile_id?: string | null
          referrer?: string | null
          selected_menu_id?: number | null
          session_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_nickname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_selected_menu_id_fkey"
            columns: ["selected_menu_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["menu_id"]
          },
        ]
      }
      page_visits: {
        Row: {
          created_at: string | null
          id: string
          path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_visits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          approved_at: string | null
          chat_log: Json | null
          created_at: string | null
          depositor: string | null
          discount_amount: number | null
          discount_type: string | null
          final_price: number | null
          id: string
          menu_id: number | null
          menu_name: string
          method: string
          phone_tail: string | null
          price: number
          questions: Json | null
          session_id: string | null
          status: string
          user_nickname: string
        }
        Insert: {
          approved_at?: string | null
          chat_log?: Json | null
          created_at?: string | null
          depositor?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          final_price?: number | null
          id?: string
          menu_id?: number | null
          menu_name: string
          method: string
          phone_tail?: string | null
          price: number
          questions?: Json | null
          session_id?: string | null
          status?: string
          user_nickname: string
        }
        Update: {
          approved_at?: string | null
          chat_log?: Json | null
          created_at?: string | null
          depositor?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          final_price?: number | null
          id?: string
          menu_id?: number | null
          menu_name?: string
          method?: string
          phone_tail?: string | null
          price?: number
          questions?: Json | null
          session_id?: string | null
          status?: string
          user_nickname?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          category_name: string
          counselor_id: string | null
          created_at: string | null
          description: string | null
          detail_description: string | null
          duration_minutes: number | null
          enabled: boolean | null
          icon: string | null
          id: number
          is_snack: boolean | null
          menu_id: number
          name: string
          price: number
          sort_order: number | null
          updated_at: string | null
          welcome_guide: string | null
        }
        Insert: {
          category?: string
          category_name?: string
          counselor_id?: string | null
          created_at?: string | null
          description?: string | null
          detail_description?: string | null
          duration_minutes?: number | null
          enabled?: boolean | null
          icon?: string | null
          id?: number
          is_snack?: boolean | null
          menu_id: number
          name: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
          welcome_guide?: string | null
        }
        Update: {
          category?: string
          category_name?: string
          counselor_id?: string | null
          created_at?: string | null
          description?: string | null
          detail_description?: string | null
          duration_minutes?: number | null
          enabled?: boolean | null
          icon?: string | null
          id?: number
          is_snack?: boolean | null
          menu_id?: number
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
          welcome_guide?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          content: string
          created_at: string | null
          credits_awarded: boolean | null
          id: string
          is_approved: boolean | null
          masked_name: string
          menu_name: string | null
          profile_id: string | null
          rating: number | null
          session_id: string | null
          user_nickname: string
        }
        Insert: {
          content: string
          created_at?: string | null
          credits_awarded?: boolean | null
          id?: string
          is_approved?: boolean | null
          masked_name: string
          menu_name?: string | null
          profile_id?: string | null
          rating?: number | null
          session_id?: string | null
          user_nickname: string
        }
        Update: {
          content?: string
          created_at?: string | null
          credits_awarded?: boolean | null
          id?: string
          is_approved?: boolean | null
          masked_name?: string
          menu_name?: string | null
          profile_id?: string | null
          rating?: number | null
          session_id?: string | null
          user_nickname?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          birth_date: string | null
          birth_time: string | null
          birth_type: string | null
          coupon_used: boolean | null
          created_at: string | null
          credits: number
          gender: string | null
          id: string
          nickname: string | null
          phone: string
          pin: string
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          birth_time?: string | null
          birth_type?: string | null
          coupon_used?: boolean | null
          created_at?: string | null
          credits?: number
          gender?: string | null
          id?: string
          nickname?: string | null
          phone: string
          pin: string
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          birth_time?: string | null
          birth_type?: string | null
          coupon_used?: boolean | null
          created_at?: string | null
          credits?: number
          gender?: string | null
          id?: string
          nickname?: string | null
          phone?: string
          pin?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
