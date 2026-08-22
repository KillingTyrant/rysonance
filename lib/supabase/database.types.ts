export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      caratteristiche: {
        Row: {
          description: string
          hp_per_punto: number
          key: string
          mana_per_punto: number
          name: string
          sort_order: number
        }
        Insert: {
          description?: string
          hp_per_punto?: number
          key: string
          mana_per_punto?: number
          name: string
          sort_order?: number
        }
        Update: {
          description?: string
          hp_per_punto?: number
          key?: string
          mana_per_punto?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      personaggi: {
        Row: {
          created_at: string
          id: string
          name: string
          razza_key: string
          sesso: Database["public"]["Enums"]["sesso"]
          speed: number | null
          tribu_key: string
          updated_at: string
          user_id: string
          via_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          razza_key: string
          sesso: Database["public"]["Enums"]["sesso"]
          speed?: number | null
          tribu_key: string
          updated_at?: string
          user_id: string
          via_key: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          razza_key?: string
          sesso?: Database["public"]["Enums"]["sesso"]
          speed?: number | null
          tribu_key?: string
          updated_at?: string
          user_id?: string
          via_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "personaggi_razza_key_fkey"
            columns: ["razza_key"]
            isOneToOne: false
            referencedRelation: "razze"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "personaggi_razza_key_tribu_key_fkey"
            columns: ["razza_key", "tribu_key"]
            isOneToOne: false
            referencedRelation: "tribu"
            referencedColumns: ["razza_key", "key"]
          },
          {
            foreignKeyName: "personaggi_via_key_fkey"
            columns: ["via_key"]
            isOneToOne: false
            referencedRelation: "vie"
            referencedColumns: ["key"]
          },
        ]
      }
      personaggio_talenti: {
        Row: {
          personaggio_id: string
          talent_key: string
          talent_kind: string | null
        }
        Insert: {
          personaggio_id: string
          talent_key: string
          talent_kind?: string | null
        }
        Update: {
          personaggio_id?: string
          talent_key?: string
          talent_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personaggio_talenti_personaggio_id_fkey"
            columns: ["personaggio_id"]
            isOneToOne: false
            referencedRelation: "personaggi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personaggio_talenti_talent_key_talent_kind_fkey"
            columns: ["talent_key", "talent_kind"]
            isOneToOne: false
            referencedRelation: "talenti"
            referencedColumns: ["key", "kind"]
          },
        ]
      }
      razza_caratteristiche: {
        Row: {
          caratteristica_key: string
          razza_key: string
          sort_order: number
        }
        Insert: {
          caratteristica_key: string
          razza_key: string
          sort_order?: number
        }
        Update: {
          caratteristica_key?: string
          razza_key?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "razza_caratteristiche_caratteristica_key_fkey"
            columns: ["caratteristica_key"]
            isOneToOne: false
            referencedRelation: "caratteristiche"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "razza_caratteristiche_razza_key_fkey"
            columns: ["razza_key"]
            isOneToOne: false
            referencedRelation: "razze"
            referencedColumns: ["key"]
          },
        ]
      }
      razze: {
        Row: {
          description: string
          key: string
          name: string
          sort_order: number
          talent_key: string | null
          talent_kind: string | null
        }
        Insert: {
          description?: string
          key: string
          name: string
          sort_order?: number
          talent_key?: string | null
          talent_kind?: string | null
        }
        Update: {
          description?: string
          key?: string
          name?: string
          sort_order?: number
          talent_key?: string | null
          talent_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "razze_talent_key_talent_kind_fkey"
            columns: ["talent_key", "talent_kind"]
            isOneToOne: false
            referencedRelation: "talenti"
            referencedColumns: ["key", "kind"]
          },
        ]
      }
      sottovie: {
        Row: {
          description: string
          key: string
          level: number
          name: string
          talent_key: string | null
          talent_kind: string | null
          via_key: string
        }
        Insert: {
          description?: string
          key: string
          level?: number
          name: string
          talent_key?: string | null
          talent_kind?: string | null
          via_key: string
        }
        Update: {
          description?: string
          key?: string
          level?: number
          name?: string
          talent_key?: string | null
          talent_kind?: string | null
          via_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "sottovie_talent_key_talent_kind_fkey"
            columns: ["talent_key", "talent_kind"]
            isOneToOne: false
            referencedRelation: "talenti"
            referencedColumns: ["key", "kind"]
          },
          {
            foreignKeyName: "sottovie_via_key_fkey"
            columns: ["via_key"]
            isOneToOne: false
            referencedRelation: "vie"
            referencedColumns: ["key"]
          },
        ]
      }
      talenti: {
        Row: {
          description: string
          disciplina: string | null
          key: string
          kind: string
          name: string
          properties: Json
          ramo: string | null
          scuola: string | null
          sort_order: number
        }
        Insert: {
          description?: string
          disciplina?: string | null
          key: string
          kind: string
          name: string
          properties?: Json
          ramo?: string | null
          scuola?: string | null
          sort_order?: number
        }
        Update: {
          description?: string
          disciplina?: string | null
          key?: string
          kind?: string
          name?: string
          properties?: Json
          ramo?: string | null
          scuola?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      tendenze: {
        Row: {
          default_value: number | null
          description: string
          key: string
          max_label: string
          max_value: number
          min_label: string
          min_value: number
          name: string
          sort_order: number
          type: string
        }
        Insert: {
          default_value?: number | null
          description?: string
          key: string
          max_label?: string
          max_value?: number
          min_label?: string
          min_value?: number
          name: string
          sort_order?: number
          type: string
        }
        Update: {
          default_value?: number | null
          description?: string
          key?: string
          max_label?: string
          max_value?: number
          min_label?: string
          min_value?: number
          name?: string
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      tribu: {
        Row: {
          base_hp: number | null
          base_mana: number | null
          base_speed: number | null
          description: string
          key: string
          name: string
          razza_key: string
          sort_order: number
          talent_key: string | null
          talent_kind: string | null
        }
        Insert: {
          base_hp?: number | null
          base_mana?: number | null
          base_speed?: number | null
          description?: string
          key: string
          name: string
          razza_key: string
          sort_order?: number
          talent_key?: string | null
          talent_kind?: string | null
        }
        Update: {
          base_hp?: number | null
          base_mana?: number | null
          base_speed?: number | null
          description?: string
          key?: string
          name?: string
          razza_key?: string
          sort_order?: number
          talent_key?: string | null
          talent_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tribu_razza_key_fkey"
            columns: ["razza_key"]
            isOneToOne: false
            referencedRelation: "razze"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tribu_talent_key_talent_kind_fkey"
            columns: ["talent_key", "talent_kind"]
            isOneToOne: false
            referencedRelation: "talenti"
            referencedColumns: ["key", "kind"]
          },
        ]
      }
      vie: {
        Row: {
          description: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          description?: string
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          description?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crea_personaggio: {
        Args: {
          p_name: string
          p_razza_key: string
          p_sesso: Database["public"]["Enums"]["sesso"]
          p_talenti: string[]
          p_tribu_key: string
          p_via_key: string
        }
        Returns: string
      }
      talenti_a_scelta: { Args: { p_via_key: string }; Returns: number }
    }
    Enums: {
      sesso: "maschio" | "femmina"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      sesso: ["maschio", "femmina"],
    },
  },
} as const

