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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_persona_rules: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          roman_numeral: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          roman_numeral: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          roman_numeral?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_prompt_layers: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          layer_key: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          layer_key: string
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          layer_key?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      auth_trigger_errors: {
        Row: {
          created_at: string
          error_detail: string | null
          error_message: string | null
          id: string
          resolved: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_detail?: string | null
          error_message?: string | null
          id?: string
          resolved?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_detail?: string | null
          error_message?: string | null
          id?: string
          resolved?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      birth_charts: {
        Row: {
          birth_time: string
          birthplace: string
          bs_date: string | null
          calendar_system: string
          chart_data: Json | null
          created_at: string
          date_of_birth: string
          full_name: string
          id: string
          is_primary: boolean
          latitude: number
          longitude: number
          reading: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_time: string
          birthplace: string
          bs_date?: string | null
          calendar_system?: string
          chart_data?: Json | null
          created_at?: string
          date_of_birth: string
          full_name: string
          id?: string
          is_primary?: boolean
          latitude: number
          longitude: number
          reading?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_time?: string
          birthplace?: string
          bs_date?: string | null
          calendar_system?: string
          chart_data?: Json | null
          created_at?: string
          date_of_birth?: string
          full_name?: string
          id?: string
          is_primary?: boolean
          latitude?: number
          longitude?: number
          reading?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birth_charts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_integrity"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compatibility_reports: {
        Row: {
          chart_a_id: string
          chart_b_id: string
          created_at: string
          id: string
          language: string
          report: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          chart_a_id: string
          chart_b_id: string
          created_at?: string
          id?: string
          language?: string
          report?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          chart_a_id?: string
          chart_b_id?: string
          created_at?: string
          id?: string
          language?: string
          report?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_reports_chart_a_id_fkey"
            columns: ["chart_a_id"]
            isOneToOne: false
            referencedRelation: "birth_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compatibility_reports_chart_b_id_fkey"
            columns: ["chart_b_id"]
            isOneToOne: false
            referencedRelation: "birth_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compatibility_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_integrity"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_horoscopes: {
        Row: {
          content: string
          created_at: string
          error: string | null
          generated_at: string
          id: string
          language: string
          mode: string
          period: string
          sign_name: string
          sign_type: string
          status: string
          valid_date: string
          voice: string
        }
        Insert: {
          content: string
          created_at?: string
          error?: string | null
          generated_at?: string
          id?: string
          language?: string
          mode?: string
          period: string
          sign_name: string
          sign_type: string
          status?: string
          valid_date: string
          voice?: string
        }
        Update: {
          content?: string
          created_at?: string
          error?: string | null
          generated_at?: string
          id?: string
          language?: string
          mode?: string
          period?: string
          sign_name?: string
          sign_type?: string
          status?: string
          valid_date?: string
          voice?: string
        }
        Relationships: []
      }
      dream_interpretations: {
        Row: {
          birth_chart_id: string | null
          clarity: string
          created_at: string
          dream_category: string | null
          dream_description: string
          dream_time: string
          emotions: string | null
          extracted_symbols: Json | null
          id: string
          interpretation: string | null
          is_lucid: boolean
          is_recurring: boolean
          language: string
          life_context: string | null
          user_id: string
        }
        Insert: {
          birth_chart_id?: string | null
          clarity?: string
          created_at?: string
          dream_category?: string | null
          dream_description: string
          dream_time: string
          emotions?: string | null
          extracted_symbols?: Json | null
          id?: string
          interpretation?: string | null
          is_lucid?: boolean
          is_recurring?: boolean
          language?: string
          life_context?: string | null
          user_id: string
        }
        Update: {
          birth_chart_id?: string | null
          clarity?: string
          created_at?: string
          dream_category?: string | null
          dream_description?: string
          dream_time?: string
          emotions?: string | null
          extracted_symbols?: Json | null
          id?: string
          interpretation?: string | null
          is_lucid?: boolean
          is_recurring?: boolean
          language?: string
          life_context?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_interpretations_birth_chart_id_fkey"
            columns: ["birth_chart_id"]
            isOneToOne: false
            referencedRelation: "birth_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      horoscope_reactions: {
        Row: {
          created_at: string
          id: string
          journal_entry: string | null
          period: string
          reaction: string | null
          ritual_completed: boolean
          saved_quotes: Json
          updated_at: string
          user_id: string
          valid_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          journal_entry?: string | null
          period?: string
          reaction?: string | null
          ritual_completed?: boolean
          saved_quotes?: Json
          updated_at?: string
          user_id: string
          valid_date: string
        }
        Update: {
          created_at?: string
          id?: string
          journal_entry?: string | null
          period?: string
          reaction?: string | null
          ritual_completed?: boolean
          saved_quotes?: Json
          updated_at?: string
          user_id?: string
          valid_date?: string
        }
        Relationships: []
      }
      nakshatras: {
        Row: {
          career: string | null
          challenges: string | null
          created_at: string
          degree_end: number | null
          degree_start: number | null
          deity: string | null
          id: string
          name: string
          number: number
          relationships: string | null
          ruling_planet: string | null
          sanskrit_name: string | null
          spiritual_path: string | null
          strengths: string | null
          symbol: string | null
          traits: string | null
          updated_at: string
        }
        Insert: {
          career?: string | null
          challenges?: string | null
          created_at?: string
          degree_end?: number | null
          degree_start?: number | null
          deity?: string | null
          id?: string
          name: string
          number: number
          relationships?: string | null
          ruling_planet?: string | null
          sanskrit_name?: string | null
          spiritual_path?: string | null
          strengths?: string | null
          symbol?: string | null
          traits?: string | null
          updated_at?: string
        }
        Update: {
          career?: string | null
          challenges?: string | null
          created_at?: string
          degree_end?: number | null
          degree_start?: number | null
          deity?: string | null
          id?: string
          name?: string
          number?: number
          relationships?: string | null
          ruling_planet?: string | null
          sanskrit_name?: string | null
          spiritual_path?: string | null
          strengths?: string | null
          symbol?: string | null
          traits?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      oracle_jobs: {
        Row: {
          category: string
          chart_id: string | null
          completed_at: string | null
          created_at: string
          current_layer: number
          current_message: string | null
          error: string | null
          id: string
          mode: string
          previous_context: Json | null
          progress: number
          question: string
          reading_id: string | null
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          chart_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_layer?: number
          current_message?: string | null
          error?: string | null
          id?: string
          mode?: string
          previous_context?: Json | null
          progress?: number
          question: string
          reading_id?: string | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          chart_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_layer?: number
          current_message?: string | null
          error?: string | null
          id?: string
          mode?: string
          previous_context?: Json | null
          progress?: number
          question?: string
          reading_id?: string | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oracle_readings: {
        Row: {
          category: string
          created_at: string
          feedback: string | null
          id: string
          language: string
          question: string
          response: Json
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          feedback?: string | null
          id?: string
          language?: string
          question: string
          response: Json
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          feedback?: string | null
          id?: string
          language?: string
          question?: string
          response?: Json
          user_id?: string
        }
        Relationships: []
      }
      planet_interpretations: {
        Row: {
          created_at: string
          house: number | null
          id: string
          interpretation: string
          keywords: string | null
          planet: string
          sign: string | null
          strength: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          house?: number | null
          id?: string
          interpretation: string
          keywords?: string | null
          planet: string
          sign?: string | null
          strength?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          house?: number | null
          id?: string
          interpretation?: string
          keywords?: string | null
          planet?: string
          sign?: string | null
          strength?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      predicted_events: {
        Row: {
          chart_id: string
          confidence: number
          event_type: string
          expires_at: string
          generated_at: string
          headline: string
          id: string
          language: string
          life_area: string
          narration: string | null
          triggers: Json
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          chart_id: string
          confidence: number
          event_type: string
          expires_at?: string
          generated_at?: string
          headline: string
          id?: string
          language?: string
          life_area: string
          narration?: string | null
          triggers?: Json
          user_id: string
          window_end: string
          window_start: string
        }
        Update: {
          chart_id?: string
          confidence?: number
          event_type?: string
          expires_at?: string
          generated_at?: string
          headline?: string
          id?: string
          language?: string
          life_area?: string
          narration?: string | null
          triggers?: Json
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "predicted_events_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "birth_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_time: string | null
          birthplace: string | null
          created_at: string
          date_of_birth: string | null
          feature_usage: Json | null
          full_name: string | null
          id: string
          is_active: boolean
          language: string | null
          latitude: number | null
          legacy_tier: string | null
          longitude: number | null
          onboarding_completed: boolean
          onboarding_preferences: Json | null
          rishi_guru_enabled: boolean
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_time?: string | null
          birthplace?: string | null
          created_at?: string
          date_of_birth?: string | null
          feature_usage?: Json | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          language?: string | null
          latitude?: number | null
          legacy_tier?: string | null
          longitude?: number | null
          onboarding_completed?: boolean
          onboarding_preferences?: Json | null
          rishi_guru_enabled?: boolean
          subscription_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_time?: string | null
          birthplace?: string | null
          created_at?: string
          date_of_birth?: string | null
          feature_usage?: Json | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          language?: string | null
          latitude?: number | null
          legacy_tier?: string | null
          longitude?: number | null
          onboarding_completed?: boolean
          onboarding_preferences?: Json | null
          rishi_guru_enabled?: boolean
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "account_integrity"
            referencedColumns: ["user_id"]
          },
        ]
      }
      remedies: {
        Row: {
          category: string
          created_at: string
          description: string
          gemstone: string | null
          id: string
          mantra: string | null
          planet: string | null
          ritual: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          gemstone?: string | null
          id?: string
          mantra?: string | null
          planet?: string | null
          ritual?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          gemstone?: string | null
          id?: string
          mantra?: string | null
          planet?: string | null
          ritual?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_appearance_config: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          name: string
          route_pattern: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          config: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          route_pattern: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          route_pattern?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          tier: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number
          created_at: string
          id: string
          period_start: string
          resource: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          period_start: string
          resource: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          period_start?: string
          resource?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          scheduled_for: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          scheduled_for?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          scheduled_for?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_integrity"
            referencedColumns: ["user_id"]
          },
        ]
      }
      yogas: {
        Row: {
          category: string
          created_at: string
          description: string
          detection_rules: string | null
          effects: string | null
          id: string
          name: string
          remedies: string | null
          sanskrit_name: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          detection_rules?: string | null
          effects?: string | null
          id?: string
          name: string
          remedies?: string | null
          sanskrit_name?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          detection_rules?: string | null
          effects?: string | null
          id?: string
          name?: string
          remedies?: string | null
          sanskrit_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      account_integrity: {
        Row: {
          auth_created_at: string | null
          email: string | null
          has_profile: boolean | null
          has_role: boolean | null
          has_subscription: boolean | null
          is_orphaned: boolean | null
          tier: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_user_profile: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_period_start?: string; p_resource: string }
        Returns: number
      }
      publish_prompt_layer: { Args: { p_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
