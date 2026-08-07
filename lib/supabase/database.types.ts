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
      character_traits: {
        Row: {
          default_value: number
          key: string
          left_label: string
          right_label: string
          sort_order: number
        }
        Insert: {
          default_value?: number
          key: string
          left_label: string
          right_label: string
          sort_order?: number
        }
        Update: {
          default_value?: number
          key?: string
          left_label?: string
          right_label?: string
          sort_order?: number
        }
        Relationships: []
      }
      characters: {
        Row: {
          alignment_category: string | null
          alignment_key: string | null
          attack_category: string | null
          attack_key: string | null
          created_at: string
          defense_category: string | null
          defense_key: string | null
          discipline_points: Json
          gender_category: string | null
          gender_key: string | null
          hp: number | null
          id: string
          level: number
          mana: number | null
          morality_category: string | null
          morality_key: string | null
          name: string | null
          race_key: string | null
          reaction_category: string | null
          reaction_key: string | null
          speed: number | null
          status: Database["public"]["Enums"]["character_status"]
          stirpe_key: string | null
          trait_ambition: number | null
          trait_curiosity: number | null
          trait_kindness: number | null
          trait_social: number | null
          updated_at: string
          user_id: string
          via_key: string | null
        }
        Insert: {
          alignment_category?: string | null
          alignment_key?: string | null
          attack_category?: string | null
          attack_key?: string | null
          created_at?: string
          defense_category?: string | null
          defense_key?: string | null
          discipline_points?: Json
          gender_category?: string | null
          gender_key?: string | null
          hp?: number | null
          id?: string
          level?: number
          mana?: number | null
          morality_category?: string | null
          morality_key?: string | null
          name?: string | null
          race_key?: string | null
          reaction_category?: string | null
          reaction_key?: string | null
          speed?: number | null
          status?: Database["public"]["Enums"]["character_status"]
          stirpe_key?: string | null
          trait_ambition?: number | null
          trait_curiosity?: number | null
          trait_kindness?: number | null
          trait_social?: number | null
          updated_at?: string
          user_id: string
          via_key?: string | null
        }
        Update: {
          alignment_category?: string | null
          alignment_key?: string | null
          attack_category?: string | null
          attack_key?: string | null
          created_at?: string
          defense_category?: string | null
          defense_key?: string | null
          discipline_points?: Json
          gender_category?: string | null
          gender_key?: string | null
          hp?: number | null
          id?: string
          level?: number
          mana?: number | null
          morality_category?: string | null
          morality_key?: string | null
          name?: string | null
          race_key?: string | null
          reaction_category?: string | null
          reaction_key?: string | null
          speed?: number | null
          status?: Database["public"]["Enums"]["character_status"]
          stirpe_key?: string | null
          trait_ambition?: number | null
          trait_curiosity?: number | null
          trait_kindness?: number | null
          trait_social?: number | null
          updated_at?: string
          user_id?: string
          via_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_alignment_category_alignment_key_fkey"
            columns: ["alignment_category", "alignment_key"]
            isOneToOne: false
            referencedRelation: "wizard_options"
            referencedColumns: ["category_key", "key"]
          },
          {
            foreignKeyName: "characters_attack_category_attack_key_fkey"
            columns: ["attack_category", "attack_key"]
            isOneToOne: false
            referencedRelation: "wizard_options"
            referencedColumns: ["category_key", "key"]
          },
          {
            foreignKeyName: "characters_defense_category_defense_key_fkey"
            columns: ["defense_category", "defense_key"]
            isOneToOne: false
            referencedRelation: "wizard_options"
            referencedColumns: ["category_key", "key"]
          },
          {
            foreignKeyName: "characters_gender_category_gender_key_fkey"
            columns: ["gender_category", "gender_key"]
            isOneToOne: false
            referencedRelation: "wizard_options"
            referencedColumns: ["category_key", "key"]
          },
          {
            foreignKeyName: "characters_morality_category_morality_key_fkey"
            columns: ["morality_category", "morality_key"]
            isOneToOne: false
            referencedRelation: "wizard_options"
            referencedColumns: ["category_key", "key"]
          },
          {
            foreignKeyName: "characters_race_key_fkey"
            columns: ["race_key"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "characters_race_key_stirpe_key_fkey"
            columns: ["race_key", "stirpe_key"]
            isOneToOne: false
            referencedRelation: "stirpi"
            referencedColumns: ["race_key", "key"]
          },
          {
            foreignKeyName: "characters_reaction_category_reaction_key_fkey"
            columns: ["reaction_category", "reaction_key"]
            isOneToOne: false
            referencedRelation: "wizard_options"
            referencedColumns: ["category_key", "key"]
          },
          {
            foreignKeyName: "characters_stirpe_key_fkey"
            columns: ["stirpe_key"]
            isOneToOne: false
            referencedRelation: "stirpi"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "characters_via_key_fkey"
            columns: ["via_key"]
            isOneToOne: false
            referencedRelation: "vie"
            referencedColumns: ["key"]
          },
        ]
      }
      discipline_groups: {
        Row: {
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      disciplines: {
        Row: {
          group_key: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          group_key: string
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          group_key?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "disciplines_group_key_fkey"
            columns: ["group_key"]
            isOneToOne: false
            referencedRelation: "discipline_groups"
            referencedColumns: ["key"]
          },
        ]
      }
      game_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      races: {
        Row: {
          description: string
          description_name: string
          key: string
          name: string
          racial_talent_key: string | null
          sort_order: number
        }
        Insert: {
          description?: string
          description_name?: string
          key: string
          name: string
          racial_talent_key?: string | null
          sort_order?: number
        }
        Update: {
          description?: string
          description_name?: string
          key?: string
          name?: string
          racial_talent_key?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "races_racial_talent_key_fkey"
            columns: ["racial_talent_key"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["key"]
          },
        ]
      }
      stirpi: {
        Row: {
          base_hp: number | null
          base_mana: number | null
          base_speed: number | null
          description: string
          key: string
          name: string
          race_key: string
          sort_order: number
          talent_key: string | null
        }
        Insert: {
          base_hp?: number | null
          base_mana?: number | null
          base_speed?: number | null
          description?: string
          key: string
          name: string
          race_key: string
          sort_order?: number
          talent_key?: string | null
        }
        Update: {
          base_hp?: number | null
          base_mana?: number | null
          base_speed?: number | null
          description?: string
          key?: string
          name?: string
          race_key?: string
          sort_order?: number
          talent_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stirpi_race_key_fkey"
            columns: ["race_key"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "stirpi_talent_key_fkey"
            columns: ["talent_key"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["key"]
          },
        ]
      }
      talents: {
        Row: {
          description: string
          key: string
          kind: string
          name: string
          sort_order: number
        }
        Insert: {
          description?: string
          key: string
          kind?: string
          name: string
          sort_order?: number
        }
        Update: {
          description?: string
          key?: string
          kind?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      via_discipline_groups: {
        Row: {
          group_key: string
          via_key: string
        }
        Insert: {
          group_key: string
          via_key: string
        }
        Update: {
          group_key?: string
          via_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "via_discipline_groups_group_key_fkey"
            columns: ["group_key"]
            isOneToOne: false
            referencedRelation: "discipline_groups"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "via_discipline_groups_via_key_fkey"
            columns: ["via_key"]
            isOneToOne: false
            referencedRelation: "vie"
            referencedColumns: ["key"]
          },
        ]
      }
      vie: {
        Row: {
          description: string
          first_talent_key: string | null
          key: string
          name: string
          per_level_hp: number
          per_level_mana: number
          per_level_speed: number
          sort_order: number
        }
        Insert: {
          description?: string
          first_talent_key?: string | null
          key: string
          name: string
          per_level_hp?: number
          per_level_mana?: number
          per_level_speed?: number
          sort_order?: number
        }
        Update: {
          description?: string
          first_talent_key?: string | null
          key?: string
          name?: string
          per_level_hp?: number
          per_level_mana?: number
          per_level_speed?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vie_first_talent_key_fkey"
            columns: ["first_talent_key"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["key"]
          },
        ]
      }
      wizard_categories: {
        Row: {
          description: string
          key: string
          sort_order: number
          step: number
          title: string
        }
        Insert: {
          description?: string
          key: string
          sort_order?: number
          step: number
          title: string
        }
        Update: {
          description?: string
          key?: string
          sort_order?: number
          step?: number
          title?: string
        }
        Relationships: []
      }
      wizard_options: {
        Row: {
          category_key: string
          description: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          category_key: string
          description?: string
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          category_key?: string
          description?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "wizard_options_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "wizard_categories"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      character_status: "draft" | "completed"
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
      character_status: ["draft", "completed"],
    },
  },
} as const

