export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organisations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      post_themes: {
        Row: {
          id: string
          website_id: string
          subject_matter: string
          keywords: string[]
          categories: string[]
          status: string
          scheduled_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          subject_matter: string
          keywords: string[]
          categories?: string[]
          status?: string
          scheduled_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          subject_matter?: string
          keywords?: string[]
          categories?: string[]
          status?: string
          scheduled_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_themes_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
        ]
      }
      publication_settings: {
        Row: {
          created_at: string
          id: string
          organisation_id: string | null
          publication_frequency: number
          subject_matters: Json
          updated_at: string
          website_id: string | null
          writing_style: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id?: string | null
          publication_frequency?: number
          subject_matters?: Json
          updated_at?: string
          website_id?: string | null
          writing_style?: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string | null
          publication_frequency?: number
          subject_matters?: Json
          updated_at?: string
          website_id?: string | null
          writing_style?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_settings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_settings_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          organisation_id: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          organisation_id?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organisation_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_content: {
        Row: {
          id: string
          website_id: string
          url: string
          title: string
          content: string
          content_type: string
          last_fetched: string
          created_at: string
          updated_at: string
          metadata: Json
          is_cornerstone: boolean
        }
        Insert: {
          id?: string
          website_id: string
          url: string
          title?: string
          content: string
          content_type: string
          last_fetched?: string
          created_at?: string
          updated_at?: string
          metadata?: Json
          is_cornerstone?: boolean
        }
        Update: {
          id?: string
          website_id?: string
          url?: string
          title?: string
          content?: string
          content_type?: string
          last_fetched?: string
          created_at?: string
          updated_at?: string
          metadata?: Json
          is_cornerstone?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "website_content_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
        ]
      }
      websites: {
        Row: {
          created_at: string
          id: string
          name: string
          organisation_id: string | null
          updated_at: string
          url: string
          language?: string
          enable_ai_image_generation?: boolean
          image_prompt?: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organisation_id?: string | null
          updated_at?: string
          url: string
          language?: string
          enable_ai_image_generation?: boolean
          image_prompt?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string | null
          updated_at?: string
          url?: string
          language?: string
          enable_ai_image_generation?: boolean
          image_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "websites_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_settings: {
        Row: {
          id: string
          website_id: string
          wp_url: string
          wp_username: string
          wp_application_password: string
          is_connected: boolean
          created_at: string
          updated_at: string
          publish_status?: string
          categories?: { id: number; name: string; slug: string }[]
          last_post_at?: string
        }
        Insert: {
          id?: string
          website_id: string
          wp_url: string
          wp_username: string
          wp_application_password: string
          is_connected?: boolean
          created_at?: string
          updated_at?: string
          publish_status?: string
          categories?: { id: number; name: string; slug: string }[]
          last_post_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          wp_url?: string
          wp_username?: string
          wp_application_password?: string
          is_connected?: boolean
          created_at?: string
          updated_at?: string
          publish_status?: string
          categories?: { id: number; name: string; slug: string }[]
          last_post_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_settings_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
        ]
      }
      wordpress_categories: {
        Row: {
          id: string
          website_id: string
          wp_category_id: number
          name: string
          slug: string
          description: string | null
          parent_id: number | null
          count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          wp_category_id: number
          name: string
          slug: string
          description?: string | null
          parent_id?: number | null
          count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          wp_category_id?: number
          name?: string
          slug?: string
          description?: string | null
          parent_id?: number | null
          count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_categories_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          }
        ]
      }
      website_access: {
        Row: {
          id: string
          user_id: string
          website_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          website_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          website_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_access_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_queue: {
        Row: {
          id: string
          post_theme_id: string
          status: string
          created_at: string
          started_at: string | null
          completed_at: string | null
          result: any | null
          error: string | null
          user_token: string
        }
        Insert: {
          id?: string
          post_theme_id: string
          status?: string
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          result?: any | null
          error?: string | null
          user_token: string
        }
        Update: {
          id?: string
          post_theme_id?: string
          status?: string
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          result?: any | null
          error?: string | null
          user_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_queue_post_theme_id_fkey"
            columns: ["post_theme_id"]
            isOneToOne: false
            referencedRelation: "post_themes"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          organisation_id: string | null
          role: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_profile_by_id: {
        Args: {
          user_id: string
        }
        Returns: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          organisation_id: string | null
          role: string
        }[]
      }
      get_website_sitemap_pages: {
        Args: {
          website_id: string
        }
        Returns: {
          id: string
          website_id: string
          url: string
          title: string
          last_fetched: string
        }[]
      }
      user_has_website_access: {
        Args: {
          website_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
