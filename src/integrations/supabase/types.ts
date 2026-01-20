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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          enrollment_id: string
          file_name: string | null
          file_url: string | null
          id: string
          mentor_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submitted_at: string
          text_content: string | null
          video_url: string | null
        }
        Insert: {
          assignment_id: string
          enrollment_id: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          mentor_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          submitted_at?: string
          text_content?: string | null
          video_url?: string | null
        }
        Update: {
          assignment_id?: string
          enrollment_id?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          mentor_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          submitted_at?: string
          text_content?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "course_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_actions: {
        Row: {
          action_config: Json
          action_order: number
          action_type: string
          created_at: string | null
          id: string
          rule_id: string
        }
        Insert: {
          action_config: Json
          action_order: number
          action_type: string
          created_at?: string | null
          id?: string
          rule_id: string
        }
        Update: {
          action_config?: Json
          action_order?: number
          action_type?: string
          created_at?: string | null
          id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          error_message: string | null
          id: string
          rule_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          error_message?: string | null
          id?: string
          rule_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          error_message?: string | null
          id?: string
          rule_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cohort_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          mentor_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          mentor_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mentor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          source: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      course_assignments: {
        Row: {
          allow_file: boolean
          allow_text: boolean
          allow_video: boolean
          course_id: string
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          is_required: boolean
          title: string
          updated_at: string
        }
        Insert: {
          allow_file?: boolean
          allow_text?: boolean
          allow_video?: boolean
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_required?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          allow_file?: boolean
          allow_text?: boolean
          allow_video?: boolean
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_required?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          certificate_number: string
          course_id: string
          enrollment_id: string
          id: string
          issued_at: string
          spectrogram_profile_created: boolean | null
          spectrogram_profile_created_at: string | null
          student_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          enrollment_id: string
          id?: string
          issued_at?: string
          spectrogram_profile_created?: boolean | null
          spectrogram_profile_created_at?: string | null
          student_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          enrollment_id?: string
          id?: string
          issued_at?: string
          spectrogram_profile_created?: boolean | null
          spectrogram_profile_created_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_content: {
        Row: {
          audio_url: string | null
          content_type: string
          created_at: string | null
          drip_delay_days: number | null
          duration_minutes: number | null
          file_name: string | null
          file_url: string | null
          id: string
          section_id: string
          sort_order: number
          text_content: string | null
          text_content_fr: string | null
          title: string
          title_fr: string | null
          transcription: string | null
          transcription_fr: string | null
          transcription_status: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content_type: string
          created_at?: string | null
          drip_delay_days?: number | null
          duration_minutes?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          section_id: string
          sort_order?: number
          text_content?: string | null
          text_content_fr?: string | null
          title: string
          title_fr?: string | null
          transcription?: string | null
          transcription_fr?: string | null
          transcription_status?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content_type?: string
          created_at?: string | null
          drip_delay_days?: number | null
          duration_minutes?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          section_id?: string
          sort_order?: number
          text_content?: string | null
          text_content_fr?: string | null
          title?: string
          title_fr?: string | null
          transcription?: string | null
          transcription_fr?: string | null
          transcription_status?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_content_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_prerequisites: {
        Row: {
          course_id: string
          created_at: string
          id: string
          prerequisite_course_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          prerequisite_course_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          prerequisite_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount_cents: number
          course_id: string
          created_at: string
          id: string
          purchased_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          student_id: string
        }
        Insert: {
          amount_cents: number
          course_id: string
          created_at?: string
          id?: string
          purchased_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          student_id: string
        }
        Update: {
          amount_cents?: number
          course_id?: string
          created_at?: string
          id?: string
          purchased_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          passing_percentage: number
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          passing_percentage?: number
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          passing_percentage?: number
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          certificate_enabled: boolean | null
          created_at: string | null
          description: string | null
          description_audio_url: string | null
          description_fr: string | null
          description_video_url: string | null
          drip_enabled: boolean | null
          drip_release_day: number | null
          drip_schedule_type: string | null
          duration_weeks: number | null
          id: string
          institution_id: string | null
          is_live: boolean | null
          is_paid: boolean | null
          is_published: boolean | null
          level: string | null
          live_date: string | null
          live_platform: string | null
          live_url: string | null
          mentor_id: string
          price_cents: number | null
          recording_url: string | null
          registration_deadline: string | null
          thumbnail_url: string | null
          title: string
          title_fr: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          certificate_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          description_audio_url?: string | null
          description_fr?: string | null
          description_video_url?: string | null
          drip_enabled?: boolean | null
          drip_release_day?: number | null
          drip_schedule_type?: string | null
          duration_weeks?: number | null
          id?: string
          institution_id?: string | null
          is_live?: boolean | null
          is_paid?: boolean | null
          is_published?: boolean | null
          level?: string | null
          live_date?: string | null
          live_platform?: string | null
          live_url?: string | null
          mentor_id: string
          price_cents?: number | null
          recording_url?: string | null
          registration_deadline?: string | null
          thumbnail_url?: string | null
          title: string
          title_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          certificate_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          description_audio_url?: string | null
          description_fr?: string | null
          description_video_url?: string | null
          drip_enabled?: boolean | null
          drip_release_day?: number | null
          drip_schedule_type?: string | null
          duration_weeks?: number | null
          id?: string
          institution_id?: string | null
          is_live?: boolean | null
          is_paid?: boolean | null
          is_published?: boolean | null
          level?: string | null
          live_date?: string | null
          live_platform?: string | null
          live_url?: string | null
          mentor_id?: string
          price_cents?: number | null
          recording_url?: string | null
          registration_deadline?: string | null
          thumbnail_url?: string | null
          title?: string
          title_fr?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_news: {
        Row: {
          article_title: string
          article_url: string
          created_at: string
          id: string
          is_hidden: boolean
          is_pinned: boolean
          pinned_at: string | null
          updated_at: string
        }
        Insert: {
          article_title: string
          article_url: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          updated_at?: string
        }
        Update: {
          article_title?: string
          article_url?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount_cents: number
          company: string | null
          created_at: string
          currency: string
          email: string
          first_name: string
          id: string
          is_recurring: boolean
          last_name: string
          reason: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          company?: string | null
          created_at?: string
          currency?: string
          email: string
          first_name: string
          id?: string
          is_recurring?: boolean
          last_name: string
          reason?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          company?: string | null
          created_at?: string
          currency?: string
          email?: string
          first_name?: string
          id?: string
          is_recurring?: boolean
          last_name?: string
          reason?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          campaign_name: string | null
          clicked_at: string | null
          contact_id: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          campaign_name?: string | null
          clicked_at?: string | null
          contact_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          campaign_name?: string | null
          clicked_at?: string | null
          contact_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          created_at: string | null
          delay_days: number | null
          delay_hours: number | null
          id: string
          sequence_id: string
          step_order: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          id?: string
          sequence_id: string
          step_order: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          delay_days?: number | null
          delay_hours?: number | null
          id?: string
          sequence_id?: string
          step_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_content: string
          id: string
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: string
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string | null
          id: string
          progress: number | null
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      external_course_prerequisites: {
        Row: {
          course_id: string
          created_at: string
          id: string
          title: string
          url: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          title: string
          url: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_submissions: {
        Row: {
          created_at: string
          email: string
          full_name: string
          gender: string | null
          id: string
          idea_description: string | null
          idea_title: string
          phone: string | null
          status: string
          submitter_id: string | null
          updated_at: string
          video_filename: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          gender?: string | null
          id?: string
          idea_description?: string | null
          idea_title: string
          phone?: string | null
          status?: string
          submitter_id?: string | null
          updated_at?: string
          video_filename?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          idea_description?: string | null
          idea_title?: string
          phone?: string | null
          status?: string
          submitter_id?: string | null
          updated_at?: string
          video_filename?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      institution_admins: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_admins_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          institution_id: string
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          institution_id: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          institution_id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_announcements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_broadcasts: {
        Row: {
          id: string
          institution_id: string
          message: string
          recipient_count: number | null
          sent_at: string | null
          sent_by: string
          subject: string
        }
        Insert: {
          id?: string
          institution_id: string
          message: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by: string
          subject: string
        }
        Update: {
          id?: string
          institution_id?: string
          message?: string
          recipient_count?: number | null
          sent_at?: string | null
          sent_by?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_broadcasts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string
          status: string
          student_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string
          status?: string
          student_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "institution_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_cohorts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institution_id: string
          is_active: boolean
          mentor_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          mentor_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          mentor_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_cohorts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          event_url: string | null
          id: string
          institution_id: string
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          event_url?: string | null
          id?: string
          institution_id: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          event_url?: string | null
          id?: string
          institution_id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_job_visibility: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          is_featured: boolean | null
          job_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          is_featured?: boolean | null
          job_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          is_featured?: boolean | null
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_job_visibility_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_moderators: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          institution_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          institution_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          institution_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_moderators_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_reminders: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          institution_id: string
          is_completed: boolean | null
          reminder_date: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          institution_id: string
          is_completed?: boolean | null
          reminder_date: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          institution_id?: string
          is_completed?: boolean | null
          reminder_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_reminders_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_students: {
        Row: {
          email: string
          id: string
          institution_id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          institution_id: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          institution_id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_threads: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          institution_id: string
          is_archived: boolean | null
          thread_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          institution_id: string
          is_archived?: boolean | null
          thread_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          is_archived?: boolean | null
          thread_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_threads_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string | null
          description: string | null
          email_domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      learner_agreements: {
        Row: {
          agreement_version: string
          condition_good_conduct: boolean
          condition_no_liability_behavior: boolean
          condition_no_liability_external: boolean
          condition_no_sharing: boolean
          condition_non_refundable: boolean
          condition_promotional_rights: boolean
          condition_respect_privacy: boolean
          condition_zero_tolerance: boolean
          created_at: string
          id: string
          ip_address: string | null
          signature_date: string
          signature_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreement_version?: string
          condition_good_conduct?: boolean
          condition_no_liability_behavior?: boolean
          condition_no_liability_external?: boolean
          condition_no_sharing?: boolean
          condition_non_refundable?: boolean
          condition_promotional_rights?: boolean
          condition_respect_privacy?: boolean
          condition_zero_tolerance?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_date?: string
          signature_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreement_version?: string
          condition_good_conduct?: boolean
          condition_no_liability_behavior?: boolean
          condition_no_liability_external?: boolean
          condition_no_sharing?: boolean
          condition_non_refundable?: boolean
          condition_promotional_rights?: boolean
          condition_respect_privacy?: boolean
          condition_zero_tolerance?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_date?: string
          signature_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      learner_analytics: {
        Row: {
          completed: boolean | null
          content_id: string
          created_at: string | null
          drop_off_point_seconds: number | null
          enrollment_id: string
          id: string
          last_position_seconds: number | null
          total_time_spent_seconds: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          completed?: boolean | null
          content_id: string
          created_at?: string | null
          drop_off_point_seconds?: number | null
          enrollment_id: string
          id?: string
          last_position_seconds?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          completed?: boolean | null
          content_id?: string
          created_at?: string | null
          drop_off_point_seconds?: number | null
          enrollment_id?: string
          id?: string
          last_position_seconds?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_analytics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_analytics_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          content_id: string
          created_at: string | null
          enrollment_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          content_id: string
          created_at?: string | null
          enrollment_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          content_id?: string
          created_at?: string | null
          enrollment_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          mentor_id: string
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          mentor_id: string
          start_time: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          mentor_id?: string
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_availability_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_contracts: {
        Row: {
          condition_data_privacy: boolean
          condition_free_courses: boolean
          condition_minimum_courses: boolean
          condition_monthly_meetings: boolean
          condition_no_profanity: boolean
          condition_platform_engagement: boolean
          condition_promotional_rights: boolean
          condition_quarterly_events: boolean
          condition_respect_students: boolean
          condition_session_pricing: boolean
          condition_support_youth: boolean
          contract_version: string
          created_at: string
          id: string
          ip_address: string | null
          mentor_id: string
          requires_resign: boolean | null
          signature_date: string
          signature_name: string
          user_agent: string | null
        }
        Insert: {
          condition_data_privacy?: boolean
          condition_free_courses?: boolean
          condition_minimum_courses?: boolean
          condition_monthly_meetings?: boolean
          condition_no_profanity?: boolean
          condition_platform_engagement?: boolean
          condition_promotional_rights?: boolean
          condition_quarterly_events?: boolean
          condition_respect_students?: boolean
          condition_session_pricing?: boolean
          condition_support_youth?: boolean
          contract_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          mentor_id: string
          requires_resign?: boolean | null
          signature_date?: string
          signature_name: string
          user_agent?: string | null
        }
        Update: {
          condition_data_privacy?: boolean
          condition_free_courses?: boolean
          condition_minimum_courses?: boolean
          condition_monthly_meetings?: boolean
          condition_no_profanity?: boolean
          condition_platform_engagement?: boolean
          condition_promotional_rights?: boolean
          condition_quarterly_events?: boolean
          condition_respect_students?: boolean
          condition_session_pricing?: boolean
          condition_support_youth?: boolean
          contract_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          mentor_id?: string
          requires_resign?: boolean | null
          signature_date?: string
          signature_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      mentor_course_topics: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          mentor_id: string
          topic_key: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          mentor_id: string
          topic_key: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          mentor_id?: string
          topic_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentor_institution_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          institution_id: string
          mentor_id: string
          reason: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          institution_id: string
          mentor_id: string
          reason?: string | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          mentor_id?: string
          reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_institution_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      mentor_role_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentorship_requests: {
        Row: {
          career_ambitions: string
          course_to_complete_id: string | null
          created_at: string
          gender: string | null
          id: string
          mentor_id: string
          mentor_response: string | null
          reason_for_mentor: string
          responded_at: string | null
          status: string
          student_bio: string
          student_id: string
          updated_at: string
        }
        Insert: {
          career_ambitions: string
          course_to_complete_id?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          mentor_id: string
          mentor_response?: string | null
          reason_for_mentor: string
          responded_at?: string | null
          status?: string
          student_bio: string
          student_id: string
          updated_at?: string
        }
        Update: {
          career_ambitions?: string
          course_to_complete_id?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          mentor_id?: string
          mentor_response?: string | null
          reason_for_mentor?: string
          responded_at?: string | null
          status?: string
          student_bio?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_course_to_complete_id_fkey"
            columns: ["course_to_complete_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          amount_cents: number
          created_at: string
          end_time: string
          id: string
          meeting_link: string | null
          mentor_id: string
          notes: string | null
          scheduled_date: string
          start_time: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          student_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          end_time: string
          id?: string
          meeting_link?: string | null
          mentor_id: string
          notes?: string | null
          scheduled_date: string
          start_time: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          student_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          end_time?: string
          id?: string
          meeting_link?: string | null
          mentor_id?: string
          notes?: string | null
          scheduled_date?: string
          start_time?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          student_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_reference_id: string | null
          action_type: string
          created_at: string
          id: string
          link: string | null
          message: string
          user_id: string
        }
        Insert: {
          action_reference_id?: string | null
          action_type?: string
          created_at?: string
          id?: string
          link?: string | null
          message: string
          user_id: string
        }
        Update: {
          action_reference_id?: string | null
          action_type?: string
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_moderators: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          bio: string | null
          companies_worked_for: string[] | null
          country: string | null
          created_at: string | null
          email: string
          full_name: string | null
          gender: string | null
          github_url: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          preferred_language: string | null
          profile_frame: string | null
          role: Database["public"]["Enums"]["user_role"]
          scheduled_deletion_at: string | null
          skills: string[] | null
          twitter_url: string | null
          university: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          companies_worked_for?: string[] | null
          country?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          id: string
          instagram_url?: string | null
          linkedin_url?: string | null
          preferred_language?: string | null
          profile_frame?: string | null
          role: Database["public"]["Enums"]["user_role"]
          scheduled_deletion_at?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          university?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          companies_worked_for?: string[] | null
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          preferred_language?: string | null
          profile_frame?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          scheduled_deletion_at?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          university?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_option_id: string | null
          text_answer: string | null
        }
        Insert: {
          attempt_id: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_option_id?: string | null
          text_answer?: string | null
        }
        Update: {
          attempt_id?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_option_id?: string | null
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          enrollment_id: string
          id: string
          passed: boolean | null
          quiz_id: string
          score_percentage: number | null
          started_at: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          enrollment_id: string
          id?: string
          passed?: boolean | null
          quiz_id: string
          score_percentage?: number | null
          started_at?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score_percentage?: number | null
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          points: number
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          question_text: string
          question_type?: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          referred_company: string
          referred_email: string
          referred_first_name: string
          referred_last_name: string
          referrer_company: string | null
          referrer_email: string
          referrer_first_name: string
          referrer_last_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          referred_company: string
          referred_email: string
          referred_first_name: string
          referred_last_name: string
          referrer_company?: string | null
          referrer_email: string
          referrer_first_name: string
          referrer_last_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          referred_company?: string
          referred_email?: string
          referred_first_name?: string
          referred_last_name?: string
          referrer_company?: string | null
          referrer_email?: string
          referrer_first_name?: string
          referrer_last_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_newsletters: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          recipient_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content: string
          id?: string
          recipient_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          recipient_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      translation_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language: string
          translation_key: string
          translation_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language: string
          translation_key: string
          translation_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          translation_key?: string
          translation_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_bookmarks: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          note: string | null
          timestamp_seconds: number | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          timestamp_seconds?: number | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          timestamp_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_content"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          note_text: string
          timestamp_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          note_text: string
          timestamp_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          note_text?: string
          timestamp_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_content"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          country_code: string | null
          created_at: string
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_active_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          content_id: string
          created_at: string | null
          current_time_seconds: number
          enrollment_id: string
          id: string
          last_watched_at: string | null
          playback_speed: number | null
          total_duration_seconds: number | null
          updated_at: string | null
          watch_percentage: number | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          current_time_seconds?: number
          enrollment_id: string
          id?: string
          last_watched_at?: string | null
          playback_speed?: number | null
          total_duration_seconds?: number | null
          updated_at?: string | null
          watch_percentage?: number | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          current_time_seconds?: number
          enrollment_id?: string
          id?: string
          last_watched_at?: string | null
          playback_speed?: number | null
          total_duration_seconds?: number | null
          updated_at?: string | null
          watch_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pending_notifications: {
        Row: {
          action_reference_id: string | null
          action_type: string | null
          created_at: string | null
          id: string | null
          link: string | null
          message: string | null
          user_id: string | null
        }
        Insert: {
          action_reference_id?: string | null
          action_type?: string | null
          created_at?: string | null
          id?: string | null
          link?: string | null
          message?: string | null
          user_id?: string | null
        }
        Update: {
          action_reference_id?: string | null
          action_type?: string | null
          created_at?: string | null
          id?: string | null
          link?: string | null
          message?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          full_name: string | null
          github_url: string | null
          id: string | null
          instagram_url: string | null
          linkedin_url: string | null
          profile_frame: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          twitter_url: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: never
          bio?: never
          full_name?: string | null
          github_url?: never
          id?: string | null
          instagram_url?: never
          linkedin_url?: never
          profile_frame?: never
          role?: Database["public"]["Enums"]["user_role"] | null
          twitter_url?: never
          website_url?: never
        }
        Update: {
          avatar_url?: never
          bio?: never
          full_name?: string | null
          github_url?: never
          id?: string | null
          instagram_url?: never
          linkedin_url?: never
          profile_frame?: never
          role?: Database["public"]["Enums"]["user_role"] | null
          twitter_url?: never
          website_url?: never
        }
        Relationships: []
      }
      unread_message_counts: {
        Row: {
          unread_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_mentor_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: boolean
      }
      approve_mentor_request: {
        Args: { _admin_id: string; _request_id: string }
        Returns: undefined
      }
      can_send_private_message: {
        Args: { _recipient_id: string; _sender_id: string }
        Returns: boolean
      }
      claim_institution_invitation: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      get_conversation_messages: {
        Args: { _partner_id: string; _user_id: string }
        Returns: {
          attachment_name: string
          attachment_url: string
          content: string
          created_at: string
          id: string
          is_own_message: boolean
          is_read: boolean
          recipient_id: string
          sender_id: string
        }[]
      }
      get_conversation_partners: {
        Args: { _user_id: string }
        Returns: {
          last_message_at: string
          last_message_content: string
          partner_avatar: string
          partner_id: string
          partner_name: string
          partner_role: string
          unread_count: number
        }[]
      }
      get_public_mentor_profile: {
        Args: { mentor_id: string }
        Returns: {
          avatar_url: string
          bio: string
          companies_worked_for: string[]
          full_name: string
          github_url: string
          id: string
          instagram_url: string
          linkedin_url: string
          profile_frame: string
          role: string
          skills: string[]
          twitter_url: string
          website_url: string
        }[]
      }
      get_public_mentor_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          companies_worked_for: string[]
          full_name: string
          github_url: string
          id: string
          instagram_url: string
          linkedin_url: string
          profile_frame: string
          role: string
          skills: string[]
          twitter_url: string
          website_url: string
        }[]
      }
      get_user_institutions: {
        Args: { _user_id: string }
        Returns: {
          institution_id: string
          institution_logo: string
          institution_name: string
          institution_slug: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_signed_learner_agreement: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_signed_mentor_contract: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_course_mentor_for_content: {
        Args: { file_name: string }
        Returns: boolean
      }
      is_enrolled_in_course_content: {
        Args: { file_name: string }
        Returns: boolean
      }
      is_institution_member: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_institution_member_direct: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_institution_moderator: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_mentor: { Args: { _user_id: string }; Returns: boolean }
      is_notification_action_completed: {
        Args: { _action_reference_id: string; _action_type: string }
        Returns: boolean
      }
      is_platform_moderator: { Args: { _user_id: string }; Returns: boolean }
      reinstate_mentor: {
        Args: { _admin_id: string; _user_id: string }
        Returns: boolean
      }
      reject_mentor_request: {
        Args: { _admin_id: string; _request_id: string }
        Returns: undefined
      }
      validate_mentor_invitation: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          is_valid: boolean
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "mentor" | "student"
      user_role: "mentor" | "student"
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
      app_role: ["admin", "mentor", "student"],
      user_role: ["mentor", "student"],
    },
  },
} as const
