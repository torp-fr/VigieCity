// ⚠️  RELIQUES STRIPE — NE JAMAIS UTILISER
// Les tables stripe_customers, stripe_subscriptions, stripe_webhook_events
// et la colonne commune_licenses.stripe_customer_id sont des résidus de
// l'architecture initiale. VigieCity utilise CHORUS PRO pour les paiements.
// Ne créez aucun code qui lit ou écrit ces tables.
// BUG-015 — audit 2026-06-24
// ─────────────────────────────────────────────────────────────────────────────

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
          email: string | null
          epci_id: string | null
          id: string
          insee_code: string | null
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          maintenance_message: string | null
          maintenance_mode: boolean
          mayor_name: string | null
          name: string
          phone: string | null
          population: number | null
          postal_code: string | null
          primary_color: string | null
          region: string | null
          secondary_color: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          department_code?: string | null
          email?: string | null
          epci_id?: string | null
          id?: string
          insee_code?: string | null
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          mayor_name?: string | null
          name: string
          phone?: string | null
          population?: number | null
          postal_code?: string | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          department_code?: string | null
          email?: string | null
          epci_id?: string | null
          id?: string
          insee_code?: string | null
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          mayor_name?: string | null
          name?: string
          phone?: string | null
          population?: number | null
          postal_code?: string | null
          primary_color?: string | null
          region?: string | null
          secondary_color?: string | null
          status?: string
          updated_at?: string
          website?: string | null
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
      commune_invites: {
        Row: {
          accepted_at: string | null
          collectivity_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          plan_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          collectivity_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          plan_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          collectivity_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          plan_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "commune_invites_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commune_invites_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commune_licenses: {
        Row: {
          auto_renew: boolean | null
          billing_email: string | null
          collectivity_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          expires_at: string | null
          features: Json | null
          id: string
          max_users: number | null
          notes: string | null
          plan: string
          plan_id: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_email?: string | null
          collectivity_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_users?: number | null
          notes?: string | null
          plan?: string
          plan_id?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_email?: string | null
          collectivity_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_users?: number | null
          notes?: string | null
          plan?: string
          plan_id?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commune_licenses_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: true
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commune_licenses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commune_services: {
        Row: {
          address: string | null
          category: string
          collectivity_id: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          opening_hours: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          collectivity_id: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          collectivity_id?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_hours?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commune_services_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          position: number
          question_id: string
          vote_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          position?: number
          question_id: string
          vote_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          position?: number
          question_id?: string
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "consultation_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_questions: {
        Row: {
          consultation_id: string
          created_at: string
          id: string
          position: number
          question_text: string
          question_type: string
          updated_at: string
        }
        Insert: {
          consultation_id: string
          created_at?: string
          id?: string
          position?: number
          question_text: string
          question_type: string
          updated_at?: string
        }
        Update: {
          consultation_id?: string
          created_at?: string
          id?: string
          position?: number
          question_text?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_questions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_responses: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          option_id: string | null
          question_id: string
          respondent_id: string | null
          text_response: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          option_id?: string | null
          question_id: string
          respondent_id?: string | null
          text_response?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          option_id?: string | null
          question_id?: string
          respondent_id?: string | null
          text_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "consultation_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "consultation_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          category: string | null
          collectivity_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          is_published: boolean
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          collectivity_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          is_published?: boolean
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          collectivity_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          is_published?: boolean
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          citizen_id: string
          collectivity_id: string
          created_at: string
          id: string
          last_message_at: string | null
          mairie_service_id: string | null
          status: string
          subject: string
          unread_admin: number
          unread_citizen: number
          updated_at: string
        }
        Insert: {
          citizen_id: string
          collectivity_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          mairie_service_id?: string | null
          status?: string
          subject: string
          unread_admin?: number
          unread_citizen?: number
          updated_at?: string
        }
        Update: {
          citizen_id?: string
          collectivity_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          mairie_service_id?: string | null
          status?: string
          subject?: string
          unread_admin?: number
          unread_citizen?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_mairie_service_id_fkey"
            columns: ["mairie_service_id"]
            isOneToOne: false
            referencedRelation: "mairie_services"
            referencedColumns: ["id"]
          },
        ]
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
      event_registrations: {
        Row: {
          collectivity_id: string
          event_id: string
          id: string
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          collectivity_id: string
          event_id: string
          id?: string
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          collectivity_id?: string
          event_id?: string
          id?: string
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          collectivity_id: string
          created_at: string
          created_by: string | null
          current_registrations: number | null
          description: string | null
          end_at: string | null
          ical_uid: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_published: boolean
          location: string | null
          max_capacity: number | null
          registration_deadline: string | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          collectivity_id: string
          created_at?: string
          created_by?: string | null
          current_registrations?: number | null
          description?: string | null
          end_at?: string | null
          ical_uid?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_published?: boolean
          location?: string | null
          max_capacity?: number | null
          registration_deadline?: string | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          collectivity_id?: string
          created_at?: string
          created_by?: string | null
          current_registrations?: number | null
          description?: string | null
          end_at?: string | null
          ical_uid?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_published?: boolean
          location?: string | null
          max_capacity?: number | null
          registration_deadline?: string | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      intercommunal_pricing: {
        Row: {
          display_order: number
          id: string
          label: string
          nb_communes_max: number | null
          nb_communes_min: number
          notes: string | null
          price_monthly: number
        }
        Insert: {
          display_order?: number
          id: string
          label: string
          nb_communes_max?: number | null
          nb_communes_min: number
          notes?: string | null
          price_monthly: number
        }
        Update: {
          display_order?: number
          id?: string
          label?: string
          nb_communes_max?: number | null
          nb_communes_min?: number
          notes?: string | null
          price_monthly?: number
        }
        Relationships: []
      }
      intercommunalities: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          max_communes: number
          name: string
          notes: string | null
          region: string | null
          siren: string | null
          type: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          max_communes?: number
          name: string
          notes?: string | null
          region?: string | null
          siren?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          max_communes?: number
          name?: string
          notes?: string | null
          region?: string | null
          siren?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          collectivity_id: string
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          issued_at: string
          paid_at: string | null
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          collectivity_id: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          issued_at?: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          collectivity_id?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          issued_at?: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string
          id: string
          is_published: boolean
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mairie_services: {
        Row: {
          collectivity_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          collectivity_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          collectivity_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "mairie_services_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_from_admin: boolean
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_from_admin?: boolean
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_from_admin?: boolean
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      meteo_push_sent: {
        Row: {
          collectivity_id: string
          color_id: number
          department_code: string
          id: string
          phenomenon: string
          sent_at: string | null
          sent_date: string
        }
        Insert: {
          collectivity_id: string
          color_id: number
          department_code: string
          id?: string
          phenomenon: string
          sent_at?: string | null
          sent_date?: string
        }
        Update: {
          collectivity_id?: string
          color_id?: number
          department_code?: string
          id?: string
          phenomenon?: string
          sent_at?: string | null
          sent_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "meteo_push_sent_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      meteo_vigilances: {
        Row: {
          color_id: number
          department_code: string
          fetched_at: string | null
          id: string
          phenomenon: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          color_id: number
          department_code: string
          fetched_at?: string | null
          id?: string
          phenomenon: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          color_id?: number
          department_code?: string
          fetched_at?: string | null
          id?: string
          phenomenon?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      neighborhood_comments: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          is_approved: boolean
          is_visible: boolean
          report_id: string
          text: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          is_visible?: boolean
          report_id: string
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          is_visible?: boolean
          report_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhood_reports: {
        Row: {
          assigned_to: string | null
          author_id: string | null
          collectivity_id: string
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          is_approved: boolean
          is_visible_to_public: boolean
          latitude: number | null
          location_description: string | null
          longitude: number | null
          moderation_notes: string | null
          report_type: string
          resolved_at: string | null
          severity: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          author_id?: string | null
          collectivity_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_approved?: boolean
          is_visible_to_public?: boolean
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          moderation_notes?: string | null
          report_type: string
          resolved_at?: string | null
          severity?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          author_id?: string | null
          collectivity_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_approved?: boolean
          is_visible_to_public?: boolean
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          moderation_notes?: string | null
          report_type?: string
          resolved_at?: string | null
          severity?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_reports_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhood_signals: {
        Row: {
          address: string | null
          citizen_id: string
          collectivity_id: string
          created_at: string | null
          description: string
          id: string
          lat: number | null
          lng: number | null
          moderation_note: string | null
          signal_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          citizen_id: string
          collectivity_id: string
          created_at?: string | null
          description: string
          id?: string
          lat?: number | null
          lng?: number | null
          moderation_note?: string | null
          signal_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          citizen_id?: string
          collectivity_id?: string
          created_at?: string | null
          description?: string
          id?: string
          lat?: number | null
          lng?: number | null
          moderation_note?: string | null
          signal_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_signals_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhood_status_history: {
        Row: {
          change_notes: string | null
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          report_id: string
          to_status: string
        }
        Insert: {
          change_notes?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          report_id: string
          to_status: string
        }
        Update: {
          change_notes?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          report_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_status_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_reports"
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
      operator_sessions: {
        Row: {
          collectivity_id: string
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string
          session_token: string
          user_id: string
        }
        Insert: {
          collectivity_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string
          session_token?: string
          user_id: string
        }
        Update: {
          collectivity_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string
          session_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_sessions_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          collectivity_id: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          collectivity_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          collectivity_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "otp_codes_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          display_order: number
          features: Json
          id: string
          is_active: boolean
          max_communes: number | null
          max_users: number | null
          name: string
          price_monthly: number | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          features?: Json
          id: string
          is_active?: boolean
          max_communes?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number | null
        }
        Update: {
          created_at?: string
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_communes?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string | null
          id: string
          label: string
          poll_id: string
          position: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          poll_id: string
          position?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          poll_id?: string
          position?: number
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
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_results"
            referencedColumns: ["option_id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          collectivity_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          poll_type: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          collectivity_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          poll_type?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          collectivity_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          poll_type?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "operator_habilitations"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          name: string
          population_max: number | null
          population_min: number | null
          price_monthly_eur: number | null
          price_yearly_eur: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id: string
          name: string
          population_max?: number | null
          population_min?: number | null
          price_monthly_eur?: number | null
          price_yearly_eur?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          population_max?: number | null
          population_min?: number | null
          price_monthly_eur?: number | null
          price_yearly_eur?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      publications: {
        Row: {
          category: string
          collectivity_id: string
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          collectivity_id: string
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          collectivity_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_collectivity_id_fkey"
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
      push_notifications_log: {
        Row: {
          body: string
          collectivity_id: string | null
          id: string
          recipient_count: number | null
          sent_at: string
          sent_by: string | null
          severity: string
          title: string
        }
        Insert: {
          body: string
          collectivity_id?: string | null
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string
          collectivity_id?: string | null
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_log_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      radio_streams: {
        Row: {
          collectivity_id: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number
          stream_url: string
        }
        Insert: {
          collectivity_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number
          stream_url: string
        }
        Update: {
          collectivity_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number
          stream_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_streams_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      report_routing: {
        Row: {
          category: Database["public"]["Enums"]["report_category"]
          collectivity_id: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          service_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["report_category"]
          collectivity_id: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          service_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["report_category"]
          collectivity_id?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_routing_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_routing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "commune_services"
            referencedColumns: ["id"]
          },
        ]
      }
      report_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          comment: string | null
          id: string
          new_status: string
          old_status: string | null
          report_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          report_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_status_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_timeline_comments: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          is_approved: boolean
          is_internal: boolean
          report_id: string
          text: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          is_internal?: boolean
          report_id: string
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          is_internal?: boolean
          report_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_timeline_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_timeline_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string | null
          event_type: string
          from_status: string | null
          id: string
          is_public: boolean
          report_id: string
          title: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          is_public?: boolean
          report_id: string
          title: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          is_public?: boolean
          report_id?: string
          title?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_timeline_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
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
      service_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_places: {
        Row: {
          address: string | null
          category: string
          collectivity_id: string
          created_at: string
          created_by: string | null
          email: string | null
          hours: Json | null
          id: string
          image_url: string | null
          is_published: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          collectivity_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          collectivity_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_places_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      services_locations: {
        Row: {
          address: string | null
          category_id: string
          collectivity_id: string
          created_at: string
          email: string | null
          external_id: string | null
          id: string
          last_synced: string
          latitude: number
          longitude: number
          name: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          collectivity_id: string
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          last_synced?: string
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          collectivity_id?: string
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          last_synced?: string
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_locations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_locations_collectivity_id_fkey"
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
      stripe_customers: {
        Row: {
          collectivity_id: string
          created_at: string | null
          id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_portal_session_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          collectivity_id: string
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_portal_session_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          collectivity_id?: string
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_portal_session_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: true
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_subscriptions: {
        Row: {
          amount_eur: number | null
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          collectivity_id: string
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pricing_tier_id: string
          status: string | null
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount_eur?: number | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          collectivity_id: string
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pricing_tier_id: string
          status?: string | null
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount_eur?: number | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          collectivity_id?: string
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pricing_tier_id?: string
          status?: string | null
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_subscriptions_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          collectivity_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          processed_at: string | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_event_type: string | null
        }
        Insert: {
          collectivity_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_event_type?: string | null
        }
        Update: {
          collectivity_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_event_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_events_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          collectivity_id: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          priority: string
          resolution_notes: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          collectivity_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          priority?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          collectivity_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          priority?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_collectivity_id_fkey"
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
      user_preferences: {
        Row: {
          created_at: string
          email_notif_reports: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notif_reports?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notif_reports?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_radio_favorites: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          source: string
          station_name: string
          station_uuid: string
          stream_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          source?: string
          station_name: string
          station_uuid: string
          stream_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          source?: string
          station_name?: string
          station_uuid?: string
          stream_url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          collectivity_id: string | null
          created_at: string
          epci_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          collectivity_id?: string | null
          created_at?: string
          epci_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          collectivity_id?: string | null
          created_at?: string
          epci_id?: string | null
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
          {
            foreignKeyName: "user_roles_epci_id_fkey"
            columns: ["epci_id"]
            isOneToOne: false
            referencedRelation: "epci_communes_summary"
            referencedColumns: ["epci_id"]
          },
          {
            foreignKeyName: "user_roles_epci_id_fkey"
            columns: ["epci_id"]
            isOneToOne: false
            referencedRelation: "intercommunalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "operator_habilitations"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      weather_vigilance_logs: {
        Row: {
          collectivity_id: string
          created_at: string
          description: string | null
          geo_shape: Json | null
          id: string
          level: string
          phenomena: string | null
          source_url: string | null
          synced_at: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          collectivity_id: string
          created_at?: string
          description?: string | null
          geo_shape?: Json | null
          id?: string
          level?: string
          phenomena?: string | null
          source_url?: string | null
          synced_at?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          collectivity_id?: string
          created_at?: string
          description?: string | null
          geo_shape?: Json | null
          id?: string
          level?: string
          phenomena?: string | null
          source_url?: string | null
          synced_at?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_vigilance_logs_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
        ]
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
      event_registration_counts: {
        Row: {
          event_id: string | null
          registration_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_habilitations: {
        Row: {
          collectivity_id: string | null
          collectivity_name: string | null
          created_at: string | null
          id: string | null
          operator_name: string | null
          operator_phone: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_collectivity_id_fkey"
            columns: ["collectivity_id"]
            isOneToOne: false
            referencedRelation: "collectivities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "operator_habilitations"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_results: {
        Row: {
          label: string | null
          option_id: string | null
          poll_id: string | null
          position: number | null
          vote_count: number | null
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
    }
    Functions: {
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cron_clean_meteo: { Args: never; Returns: undefined }
      cron_fetch_rss: { Args: never; Returns: undefined }
      find_auth_user_by_email: {
        Args: { search_email: string }
        Returns: {
          display_name: string
          email: string
          id: string
        }[]
      }
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
      is_epci_admin_for: {
        Args: { p_collectivity_id: string }
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "citizen"
        | "moderator"
        | "operator"
        | "admin"
        | "super_admin"
        | "epci_admin"
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
      app_role: [
        "citizen",
        "moderator",
        "operator",
        "admin",
        "super_admin",
        "epci_admin",
      ],
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
