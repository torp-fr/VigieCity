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
          department_code: string | null
          epci_id: string | null
          id: string
          insee_code: string | null
          is_active: boolean
          name: string
          population: number | null
          postal_code: string | null
          region: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_code?: string | null
          epci_id?: string | null
          id?: string
          insee_code?: string | null
          is_active?: boolean
          name: string
          population?: number | null
          postal_code?: string | null
          region?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_code?: string | null
          epci_id?: string | null
          id?: string
          insee_code?: string | null
          is_active?: boolean
          name?: string
          population?: number | null
          postal_code?: string | null
          region?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collectivities_epci_id_fkey"
            columns: ["epci_id"]
            isOneToOne: false
            referencedRelation: "epci_communes_summary"
            referencedColumns: ["epci_id"]
          },
          {
            foreignKeyName: "collectivities_epci_id_fkey"
            columns: ["epci_id"]
            isOneToOne: false
            referencedRelation: "intercommunalities"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          author: string | null
          category: string | null
          collectivity_id: string | null
          description: string | null
          fetched_at: string | null
          id: string
          image_url: string | null
          published_at: string | null
          rss_source_id: string | null
          title: string
          url: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          collectivity_id?: string | null
          description?: string | null
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          rss_source_id?: string | null
          title: string
          url: string
        }
        Update: {
          author?: string | null
          category?: string | null
          collectivity_id?: string | null
          description?: string | null
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          rss_source_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_articles_rss_source_id_fkey"
            columns: ["rss_source_id"]
            isOneToOne: false
            referencedRelation: "rss_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          collectivity_id: string | null
          created_at: string
          display_name: string | null
          district: string | null
          id: string
          is_voisin_vigilant: boolean
          phone: string | null
          postal_code: string | null
          role: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          collectivity_id?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          id: string
          is_voisin_vigilant?: boolean
          phone?: string | null
          postal_code?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          collectivity_id?: string | null
          created_at?: string
          display_name?: string | null
          district?: string | null
          id?: string
          is_voisin_vigilant?: boolean
          phone?: string | null
          postal_code?: string | null
          role?: string
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
      publisher_posts: {
        Row: {
          body: string | null
          collectivity_id: string
          created_at: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          moderated_at: string | null
          moderated_by: string | null
          published_at: string | null
          publisher_id: string
          reject_reason: string | null
          starts_at: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          collectivity_id: string
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          published_at?: string | null
          publisher_id: string
          reject_reason?: string | null
          starts_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          collectivity_id?: string
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          published_at?: string | null
          publisher_id?: string
          reject_reason?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publisher_posts_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publisher_posts_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      publishers: {
        Row: {
          activated_at: string | null
          address: string | null
          collectivity_id: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          logo_url: string | null
          name: string
          phone: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          activated_at?: string | null
          address?: string | null
          collectivity_id: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          activated_at?: string | null
          address?: string | null
          collectivity_id?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publishers_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_sources: {
        Row: {
          active: boolean
          category: string
          collectivity_id: string | null
          created_at: string | null
          fetch_error: string | null
          id: string
          last_fetched_at: string | null
          name: string
          url: string
        }
        Insert: {
          active?: boolean
          category?: string
          collectivity_id?: string | null
          created_at?: string | null
          fetch_error?: string | null
          id?: string
          last_fetched_at?: string | null
          name: string
          url: string
        }
        Update: {
          active?: boolean
          category?: string
          collectivity_id?: string | null
          created_at?: string | null
          fetch_error?: string | null
          id?: string
          last_fetched_at?: string | null
          name?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rss_sources_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_prefs: {
        Row: {
          topics: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          topics?: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          topics?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      epci_communes_summary: {
        Row: {
          active_communes: number | null
          epci_id: string | null
          epci_name: string | null
          max_communes: number | null
          remaining_slots: number | null
          total_communes: number | null
        }
        Relationships: []
      }
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
      is_epci_admin_of_commune: {
        Args: { commune_id: string }
        Returns: boolean
      }
      search_communes: {
        Args: { q: string }
        Returns: {
          department_code: string
          id: string
          insee_code: string
          name: string
          population: number
          postal_code: string
          region: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "citizen" | "moderator" | "admin" | "super_admin" | "epci_admin"
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
      app_role: ["citizen", "moderator", "admin", "super_admin", "epci_admin"],
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
