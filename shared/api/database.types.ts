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
    PostgrestVersion: "14.4"
  }
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
      ai_usage: {
        Row: {
          calls: number
          date: string
          tokens_used: number
          updated_at: string
        }
        Insert: {
          calls?: number
          date?: string
          tokens_used?: number
          updated_at?: string
        }
        Update: {
          calls?: number
          date?: string
          tokens_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          connected_at: string
          manager_id: string
          telegram_chat_id: number
        }
        Insert: {
          connected_at?: string
          manager_id: string
          telegram_chat_id: number
        }
        Update: {
          connected_at?: string
          manager_id?: string
          telegram_chat_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_sessions_client"
            columns: ["telegram_chat_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["telegram_chat_id"]
          },
          {
            foreignKeyName: "fk_chat_sessions_client"
            columns: ["telegram_chat_id"]
            isOneToOne: true
            referencedRelation: "clients_with_last_message"
            referencedColumns: ["telegram_chat_id"]
          },
          {
            foreignKeyName: "fk_chat_sessions_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      clients: {
        Row: {
          first_seen_at: string
          last_seen_at: string
          notes: string | null
          telegram_chat_id: number
          username: string | null
        }
        Insert: {
          first_seen_at?: string
          last_seen_at?: string
          notes?: string | null
          telegram_chat_id: number
          username?: string | null
        }
        Update: {
          first_seen_at?: string
          last_seen_at?: string
          notes?: string | null
          telegram_chat_id?: number
          username?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string | null
          embedding: string | null
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      managers: {
        Row: {
          created_at: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          admin_uid: string | null
          created_at: string | null
          error_message: string | null
          id: string
          sender: Database["public"]["Enums"]["message_sender"]
          sent_at: string | null
          status: string | null
          telegram_chat_id: number
          text: string
        }
        Insert: {
          admin_uid?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          sender?: Database["public"]["Enums"]["message_sender"]
          sent_at?: string | null
          status?: string | null
          telegram_chat_id: number
          text: string
        }
        Update: {
          admin_uid?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          sender?: Database["public"]["Enums"]["message_sender"]
          sent_at?: string | null
          status?: string | null
          telegram_chat_id?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_admin_uid"
            columns: ["admin_uid"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_messages_client"
            columns: ["telegram_chat_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["telegram_chat_id"]
          },
          {
            foreignKeyName: "fk_messages_client"
            columns: ["telegram_chat_id"]
            isOneToOne: false
            referencedRelation: "clients_with_last_message"
            referencedColumns: ["telegram_chat_id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          manager_id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          telegram_chat_id: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          manager_id: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          telegram_chat_id?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          manager_id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          telegram_chat_id?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "managers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tickets_telegram_chat_id_fkey"
            columns: ["telegram_chat_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["telegram_chat_id"]
          },
          {
            foreignKeyName: "tickets_telegram_chat_id_fkey"
            columns: ["telegram_chat_id"]
            isOneToOne: false
            referencedRelation: "clients_with_last_message"
            referencedColumns: ["telegram_chat_id"]
          },
        ]
      }
    }
    Views: {
      clients_with_last_message: {
        Row: {
          first_seen_at: string | null
          last_message_at: string | null
          last_message_sender:
            | Database["public"]["Enums"]["message_sender"]
            | null
          last_message_text: string | null
          last_seen_at: string | null
          notes: string | null
          telegram_chat_id: number | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_ai_usage: {
        Args: { p_date: string; p_tokens: number }
        Returns: undefined
      }
      match_knowledge_base: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          answer: string
          category: string
          id: string
          question: string
          similarity: number
        }[]
      }
    }
    Enums: {
      message_sender: "user" | "manager" | "bot"
      ticket_priority: "low" | "normal" | "high"
      ticket_status: "open" | "in_progress" | "closed"
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
      message_sender: ["user", "manager", "bot"],
      ticket_priority: ["low", "normal", "high"],
      ticket_status: ["open", "in_progress", "closed"],
    },
  },
} as const
