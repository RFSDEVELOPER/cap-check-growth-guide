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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      affiliate_products: {
        Row: {
          active: boolean
          badge: string | null
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          name: string
          sort_order: number
          store: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          category?: string
          created_at?: string
          description?: string
          id: string
          image_url?: string | null
          name: string
          sort_order?: number
          store?: string
          updated_at?: string
          url?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
          store?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          kind: string
          max_uses: number | null
          min_order: number
          starts_at: string | null
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          max_uses?: number | null
          min_order?: number
          starts_at?: string | null
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          max_uses?: number | null
          min_order?: number
          starts_at?: string | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      integration_secrets: {
        Row: {
          ciphertext: string
          iv: string
          last4: string
          name: string
          updated_at: string
        }
        Insert: {
          ciphertext: string
          iv: string
          last4: string
          name: string
          updated_at?: string
        }
        Update: {
          ciphertext?: string
          iv?: string
          last4?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          carrier: string | null
          coupon_code: string | null
          created_at: string
          customer_note: string | null
          delivered_at: string | null
          discount: number
          estimated_delivery: string | null
          fulfillment_status: string
          id: string
          items: Json
          mp_payment_id: string | null
          mp_preference_id: string | null
          paid_at: string | null
          shipped_at: string | null
          shipping: Json | null
          shipping_fee: number
          shipping_service: string | null
          status: string
          stock_applied: boolean
          stock_deductions: Json | null
          stock_restored: boolean
          stock_shortage: boolean
          subtotal: number | null
          total: number
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount?: number
          estimated_delivery?: string | null
          fulfillment_status?: string
          id?: string
          items: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          shipped_at?: string | null
          shipping?: Json | null
          shipping_fee?: number
          shipping_service?: string | null
          status?: string
          stock_applied?: boolean
          stock_deductions?: Json | null
          stock_restored?: boolean
          stock_shortage?: boolean
          subtotal?: number | null
          total: number
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount?: number
          estimated_delivery?: string | null
          fulfillment_status?: string
          id?: string
          items?: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          shipped_at?: string | null
          shipping?: Json | null
          shipping_fee?: number
          shipping_service?: string | null
          status?: string
          stock_applied?: boolean
          stock_deductions?: Json | null
          stock_restored?: boolean
          stock_shortage?: boolean
          subtotal?: number | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          gateway: string
          id: boolean
          mode: string
          public_key_producao: string | null
          public_key_teste: string | null
          updated_at: string
        }
        Insert: {
          gateway?: string
          id?: boolean
          mode?: string
          public_key_producao?: string | null
          public_key_teste?: string | null
          updated_at?: string
        }
        Update: {
          gateway?: string
          id?: boolean
          mode?: string
          public_key_producao?: string | null
          public_key_teste?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          features: string[]
          highlight: boolean
          id: string
          name: string
          price: number
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          features?: string[]
          highlight?: boolean
          id: string
          name: string
          price: number
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          features?: string[]
          highlight?: boolean
          id?: string
          name?: string
          price?: number
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          badge: string | null
          category: string
          created_at: string
          delivery_days: number
          description: string
          height_cm: number
          id: string
          image_url: string | null
          length_cm: number
          name: string
          price: number
          promo_price: number | null
          promo_until: string | null
          sort_order: number
          stock: number
          updated_at: string
          weight_kg: number
          width_cm: number
        }
        Insert: {
          active?: boolean
          badge?: string | null
          category?: string
          created_at?: string
          delivery_days?: number
          description?: string
          height_cm?: number
          id: string
          image_url?: string | null
          length_cm?: number
          name: string
          price: number
          promo_price?: number | null
          promo_until?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
          weight_kg?: number
          width_cm?: number
        }
        Update: {
          active?: boolean
          badge?: string | null
          category?: string
          created_at?: string
          delivery_days?: number
          description?: string
          height_cm?: number
          id?: string
          image_url?: string | null
          length_cm?: number
          name?: string
          price?: number
          promo_price?: number | null
          promo_until?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
          weight_kg?: number
          width_cm?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          neighborhood: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json
          created_at: string
          id: string
          needs_dermatologist: boolean
          plan: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          needs_dermatologist?: boolean
          plan: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          needs_dermatologist?: boolean
          plan?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          free_shipping_min: number | null
          handling_days: number
          id: boolean
          low_stock_alert: number
          origin_cep: string | null
          shipping_fee: number
          shipping_sandbox: boolean
          updated_at: string
        }
        Insert: {
          free_shipping_min?: number | null
          handling_days?: number
          id?: boolean
          low_stock_alert?: number
          origin_cep?: string | null
          shipping_fee?: number
          shipping_sandbox?: boolean
          updated_at?: string
        }
        Update: {
          free_shipping_min?: number | null
          handling_days?: number
          id?: boolean
          low_stock_alert?: number
          origin_cep?: string | null
          shipping_fee?: number
          shipping_sandbox?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mp_payment_id: string
          paid_at: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mp_payment_id: string
          paid_at?: string | null
          status: string
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mp_payment_id?: string
          paid_at?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          mp_preapproval_id: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mp_preapproval_id?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mp_preapproval_id?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      finalize_paid_order: { Args: { _order_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      restore_refunded_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
