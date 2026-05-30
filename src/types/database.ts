export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          platform_role: "user" | "platform_admin"
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          platform_role?: "user" | "platform_admin"
          created_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          platform_role?: "user" | "platform_admin"
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: "free" | "pro" | "team" | "unlimited"
          plan_expires_at: string | null
          settings: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: "free" | "pro" | "team" | "unlimited"
          plan_expires_at?: string | null
          settings?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          plan?: "free" | "pro" | "team" | "unlimited"
          plan_expires_at?: string | null
          settings?: Record<string, unknown> | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: "owner" | "host"
          invited_by: string | null
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: "owner" | "host"
          invited_by?: string | null
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          role?: "owner" | "host"
          accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          organization_id: string
          created_by: string
          title: string
          join_code: string
          status: "draft" | "active" | "ended"
          settings: Record<string, unknown>
          total_attendees: number
          active_slide_id: string | null
          created_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          created_by: string
          title: string
          join_code: string
          status?: "draft" | "active" | "ended"
          settings?: Record<string, unknown>
          total_attendees?: number
          active_slide_id?: string | null
          created_at?: string
          ended_at?: string | null
        }
        Update: {
          title?: string
          status?: "draft" | "active" | "ended"
          settings?: Record<string, unknown>
          total_attendees?: number
          active_slide_id?: string | null
          ended_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      polls: {
        Row: {
          id: string
          session_id: string
          created_by: string
          title: string
          type:
            | "multiple_choice"
            | "temperature"
            | "qa"
            | "like_dislike"
            | "word_cloud"
            | "emoji_cloud"
            | "planning_poker"
          options: unknown[]
          status: "draft" | "active" | "closed"
          settings: Record<string, unknown>
          sort_order: number
          section_id: string | null
          created_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          created_by: string
          title: string
          type:
            | "multiple_choice"
            | "temperature"
            | "qa"
            | "like_dislike"
            | "word_cloud"
            | "emoji_cloud"
            | "planning_poker"
          options?: unknown[]
          status?: "draft" | "active" | "closed"
          settings?: Record<string, unknown>
          sort_order?: number
          section_id?: string | null
          created_at?: string
          closed_at?: string | null
        }
        Update: {
          title?: string
          type?:
            | "multiple_choice"
            | "temperature"
            | "qa"
            | "like_dislike"
            | "word_cloud"
            | "emoji_cloud"
            | "planning_poker"
          options?: unknown[]
          status?: "draft" | "active" | "closed"
          settings?: Record<string, unknown>
          sort_order?: number
          section_id?: string | null
          closed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      votes: {
        Row: {
          id: string
          poll_id: string
          voter_token: string
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          voter_token: string
          value: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          }
        ]
      }
      questions: {
        Row: {
          id: string
          session_id: string
          voter_token: string
          text: string
          status: "pending" | "answered" | "hidden"
          upvotes: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          voter_token: string
          text: string
          status?: "pending" | "answered" | "hidden"
          upvotes?: number
          created_at?: string
        }
        Update: {
          status?: "pending" | "answered" | "hidden"
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      question_upvotes: {
        Row: {
          question_id: string
          voter_token: string
        }
        Insert: {
          question_id: string
          voter_token: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: "question_upvotes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          }
        ]
      }
      session_slides: {
        Row: {
          id: string
          session_id: string
          type: "splash" | "speaker" | "schedule" | "quote" | "final"
          content: Record<string, unknown>
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          type: "splash" | "speaker" | "schedule" | "quote" | "final"
          content?: Record<string, unknown>
          sort_order?: number
          created_at?: string
        }
        Update: {
          type?: "splash" | "speaker" | "schedule" | "quote" | "final"
          content?: Record<string, unknown>
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_slides_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      session_sections: {
        Row: {
          id: string
          session_id: string
          title: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          title: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          title?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_sections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_join_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Удобные алиасы для использования в компонентах
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"]
export type Session = Database["public"]["Tables"]["sessions"]["Row"]
export type Poll = Database["public"]["Tables"]["polls"]["Row"]
export type Vote = Database["public"]["Tables"]["votes"]["Row"]
export type Question = Database["public"]["Tables"]["questions"]["Row"]
export type QuestionUpvote = Database["public"]["Tables"]["question_upvotes"]["Row"]

export type SessionSection = Database["public"]["Tables"]["session_sections"]["Row"]

export type PollType = Poll["type"]
export type PollStatus = Poll["status"]
export type SessionStatus = Session["status"]
export type OrgPlan = Organization["plan"]
export type OrgRole = OrganizationMember["role"]
