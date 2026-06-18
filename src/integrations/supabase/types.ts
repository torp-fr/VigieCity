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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          area_label: string | null
          collectivity_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          severity: Database["public"]["Enums"]["report_severity"]
          title: string
        }
        Insert: {
          area_label?: string | null
          collectivity_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          severity?: Database["public"]["Enums"]["report_severity"]
          title: string
        }
        Update: {
          area_label?: string | null
          collectivity_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          severity?: Database["public"]["Enums"]["report_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      collectivities: {
        Row: {
          created_at: string
          id: string
          insee_code: string | null
          name: string
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          insee_code?: string | null
          name: string
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          insee_code?: string | null
          name?: string
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          category: string
          collectivity_id: string | null
          created_at: string
          description: string | null
          hours: string | null
          id: string
          is_national: boolean
          label: string
          phone: string
          priority: number
          updated_at: string
        }
        Insert: {
          category: string
          collectivity_id?: string | null
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          is_national?: boolean
          label: string
          phone: string
          priority?: number
          updated_at?: string
        }
        Update: {
          category?: string
          collectivity_id?: string | null
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          is_national?: boolean
          label?: string
          phone?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          collectivity_id: string | null
          created_at: string
          display_name: string | null
          district: string | null
          id: string
          is_voisin_vigilant: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          collectivity_id?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          id: string
          is_voisin_vigilant?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          collectivity_id?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          id?: string
          is_voisin_vigilant?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          approximate_address: string | null
          category: Database["public"]["Enums"]["report_category"]
          collectivity_id: string | null
          created_at: string
          description: string
          id: string
          is_anonymous: boolean
          lat: number | null
          lng: number | null
          media_paths: string[]
          occurred_at: string
          severity: Database["public"]["Enums"]["report_severity"]
          status: Database["public"]["Enums"]["report_status"]
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approximate_address?: string | null
          category: Database["public"]["Enums"]["report_category"]
          collectivity_id?: string | null
          created_at?: string
          description: string
          id?: string
          is_anonymous?: boolean
          lat?: number | null
          lng?: number | null
          media_paths?: string[]
          occurred_at?: string
          severity?: Database["public"]["Enums"]["report_severity"]
          status?: Database["public"]["Enums"]["report_status"]
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approximate_address?: string | null
          category?: Database["public"]["Enums"]["report_category"]
          collectivity_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_anonymous?: boolean
          lat?: number | null
          lng?: number | null
          media_paths?: string[]
          occurred_at?: string
          severity?: Database["public"]["Enums"]["report_severity"]
          status?: Database["public"]["Enums"]["report_status"]
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_events: {
        Row: {
          audio_path: string | null
          collectivity_id: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          message: string | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          audio_path?: string | null
          collectivity_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          audio_path?: string | null
          collectivity_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_events_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          collectivity_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          collectivity_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          collectivity_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
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
      has_role_in: {
        Args: {
          _collectivity: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "citizen" | "moderator" | "admin"
      report_category:
        | "vehicule_suspect"
        | "rodeur"
        | "incivilite"
        | "degradation"
        | "accident"
        | "animal"
        | "eclairage"
        | "depot_sauvage"
        | "autre"
      report_severity: "info" | "vigilance" | "urgent"
      report_status:
        | "pending"
        | "published"
        | "archived"
        | "rejected"
        | "transferred"
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
      app_role: ["citizen", "moderator", "admin"],
      report_category: [
        "vehicule_suspect",
        "rodeur",
        "incivilite",
        "degradation",
        "accident",
        "animal",
        "eclairage",
        "depot_sauvage",
        "autre",
      ],
      report_severity: ["info", "vigilance", "urgent"],
      report_status: [
        "pending",
        "published",
        "archived",
        "rejected",
        "transferred",
      ],
    },
  },
} as const
