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
      blog_posts: {
        Row: {
          author: string
          canonical_url: string | null
          category: string
          content: string
          created_at: string
          custom_schema: string | null
          excerpt: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          published: boolean
          published_at: string | null
          read_time: string | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          canonical_url?: string | null
          category?: string
          content: string
          created_at?: string
          custom_schema?: string | null
          excerpt?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          read_time?: string | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          canonical_url?: string | null
          category?: string
          content?: string
          created_at?: string
          custom_schema?: string | null
          excerpt?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          read_time?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          benefits: string[]
          created_at: string
          cta_text: string | null
          cta_title: string | null
          custom_schema: string | null
          description: string | null
          faqs: Json
          id: string
          ideal_for: string[]
          image_alt: string | null
          image_url: string | null
          intro_html: string | null
          key_features: string[]
          meta_description: string | null
          meta_title: string | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
          why_choose: string[]
        }
        Insert: {
          benefits?: string[]
          created_at?: string
          cta_text?: string | null
          cta_title?: string | null
          custom_schema?: string | null
          description?: string | null
          faqs?: Json
          id?: string
          ideal_for?: string[]
          image_alt?: string | null
          image_url?: string | null
          intro_html?: string | null
          key_features?: string[]
          meta_description?: string | null
          meta_title?: string | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
          why_choose?: string[]
        }
        Update: {
          benefits?: string[]
          created_at?: string
          cta_text?: string | null
          cta_title?: string | null
          custom_schema?: string | null
          description?: string | null
          faqs?: Json
          id?: string
          ideal_for?: string[]
          image_alt?: string | null
          image_url?: string | null
          intro_html?: string | null
          key_features?: string[]
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
          why_choose?: string[]
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
          subject?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      home_service_card_items: {
        Row: {
          card_id: string
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_service_card_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "home_service_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      home_service_cards: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          shipping_address: string
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          shipping_address: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          shipping_address?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parts: {
        Row: {
          asset_no: string | null
          category: string
          condition: string
          created_at: string
          custom_schema: string | null
          description: string | null
          id: string
          image_alts: (string | null)[]
          image_urls: string[] | null
          in_stock: boolean
          make: string | null
          meta_description: string | null
          meta_title: string | null
          model: string | null
          name: string
          oem_no: string | null
          part_no: string | null
          price: number
          short_description: string | null
          sku: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          asset_no?: string | null
          category?: string
          condition?: string
          created_at?: string
          custom_schema?: string | null
          description?: string | null
          id?: string
          image_alts?: (string | null)[]
          image_urls?: string[] | null
          in_stock?: boolean
          make?: string | null
          meta_description?: string | null
          meta_title?: string | null
          model?: string | null
          name: string
          oem_no?: string | null
          part_no?: string | null
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          asset_no?: string | null
          category?: string
          condition?: string
          created_at?: string
          custom_schema?: string | null
          description?: string | null
          id?: string
          image_alts?: (string | null)[]
          image_urls?: string[] | null
          in_stock?: boolean
          make?: string | null
          meta_description?: string | null
          meta_title?: string | null
          model?: string | null
          name?: string
          oem_no?: string | null
          part_no?: string | null
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string
          category_id: string | null
          condition: string
          created_at: string
          custom_schema: string | null
          description: string | null
          features: string[] | null
          id: string
          image_alt: string | null
          image_alts: (string | null)[]
          image_url: string | null
          image_urls: string[] | null
          in_stock: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          original_price: number | null
          price: number
          short_description: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string
          category_id?: string | null
          condition?: string
          created_at?: string
          custom_schema?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          image_alt?: string | null
          image_alts?: (string | null)[]
          image_url?: string | null
          image_urls?: string[] | null
          in_stock?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          original_price?: number | null
          price?: number
          short_description?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          category_id?: string | null
          condition?: string
          created_at?: string
          custom_schema?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          image_alt?: string | null
          image_alts?: (string | null)[]
          image_url?: string | null
          image_urls?: string[] | null
          in_stock?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          original_price?: number | null
          price?: number
          short_description?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          created_at: string
          from_path: string
          id: string
          source: string
          status_code: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_path: string
          id?: string
          source?: string
          status_code?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_path?: string
          id?: string
          source?: string
          status_code?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          areas_served: string[]
          created_at: string
          custom_schema: string | null
          features: string[]
          hero_title: string
          icon: string
          id: string
          image_alt: string | null
          image_url: string | null
          meta_description: string | null
          meta_title: string | null
          overview: string[]
          overview_html: string | null
          published: boolean
          short_desc: string
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
          why_choose_title: string
        }
        Insert: {
          areas_served?: string[]
          created_at?: string
          custom_schema?: string | null
          features?: string[]
          hero_title: string
          icon?: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          overview?: string[]
          overview_html?: string | null
          published?: boolean
          short_desc: string
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
          why_choose_title?: string
        }
        Update: {
          areas_served?: string[]
          created_at?: string
          custom_schema?: string | null
          features?: string[]
          hero_title?: string
          icon?: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          overview?: string[]
          overview_html?: string | null
          published?: boolean
          short_desc?: string
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
          why_choose_title?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          content_html: string
          created_at: string
          custom_schema: string | null
          footer_label: string | null
          footer_order: number
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean
          show_in_footer: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content_html?: string
          created_at?: string
          custom_schema?: string | null
          footer_label?: string | null
          footer_order?: number
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          show_in_footer?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content_html?: string
          created_at?: string
          custom_schema?: string | null
          footer_label?: string | null
          footer_order?: number
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          show_in_footer?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
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
        Relationships: []
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
