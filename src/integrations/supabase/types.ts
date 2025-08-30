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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      caps: {
        Row: {
          alt_offer_text: string | null
          created_at: string
          daily: number | null
          hourly: number | null
          monthly: number | null
          on_exhaust: string | null
          per_user_daily: number | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          alt_offer_text?: string | null
          created_at?: string
          daily?: number | null
          hourly?: number | null
          monthly?: number | null
          on_exhaust?: string | null
          per_user_daily?: number | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          alt_offer_text?: string | null
          created_at?: string
          daily?: number | null
          hourly?: number | null
          monthly?: number | null
          on_exhaust?: string | null
          per_user_daily?: number | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caps_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      free_drink_windows: {
        Row: {
          created_at: string
          days: number[]
          end_time: string
          id: string
          start_time: string
          timezone: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          days: number[]
          end_time: string
          id?: string
          start_time: string
          timezone?: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          days?: number[]
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_drink_windows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_admin?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          created_at: string
          drink: string
          id: string
          redeemed_at: string
          user_id: string
          value: number
          venue_id: string
        }
        Insert: {
          created_at?: string
          drink: string
          id?: string
          redeemed_at?: string
          user_id: string
          value: number
          venue_id: string
        }
        Update: {
          created_at?: string
          drink?: string
          id?: string
          redeemed_at?: string
          user_id?: string
          value?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          points_required: number
          updated_at: string
          valid_until: string
          venue_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          points_required: number
          updated_at?: string
          valid_until: string
          venue_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          points_required?: number
          updated_at?: string
          valid_until?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          items: Json
          points: number
          timestamp: string
          venue_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          items?: Json
          points?: number
          timestamp?: string
          venue_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          items?: Json
          points?: number
          timestamp?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_images: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          label: string | null
          url: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          label?: string | null
          url: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          label?: string | null
          url?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_images_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_memberships: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["venue_role"]
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role: Database["public"]["Enums"]["venue_role"]
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["venue_role"]
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_memberships_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          created_at: string
          description: string | null
          hero_image_url: string | null
          id: string
          image_url: string | null
          is_paused: boolean
          name: string
          owner_profile_id: string
          phone_number: string | null
          plan: Database["public"]["Enums"]["venue_plan"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address: string
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          is_paused?: boolean
          name: string
          owner_profile_id: string
          phone_number?: string | null
          plan?: Database["public"]["Enums"]["venue_plan"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          is_paused?: boolean
          name?: string
          owner_profile_id?: string
          phone_number?: string | null
          plan?: Database["public"]["Enums"]["venue_plan"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_venues: {
        Args: { limit_count?: number; search_term?: string }
        Returns: {
          address: string
          created_at: string
          description: string
          id: string
          is_paused: boolean
          name: string
          phone_number: string
          plan: Database["public"]["Enums"]["venue_plan"]
          website_url: string
        }[]
      }
      get_user_venue_ids: {
        Args: { user_id?: string }
        Returns: string[]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      venue_plan: "basic" | "standard" | "premium"
      venue_role: "venue_owner" | "venue_staff"
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
      venue_plan: ["basic", "standard", "premium"],
      venue_role: ["venue_owner", "venue_staff"],
    },
  },
} as const
