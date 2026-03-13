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
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      clinical_thresholds: {
        Row: {
          created_at: string
          critical_max: number | null
          critical_min: number | null
          evidence_level: string | null
          guideline_source: string
          guideline_year: number
          id: string
          normal_max: number | null
          normal_min: number | null
          organ_type: string
          parameter: string
          reference_url: string | null
          risk_points_critical: number
          risk_points_warning: number
          trend_direction: string | null
          trend_threshold_pct: number | null
          unit: string
          updated_at: string
          warning_max: number | null
          warning_min: number | null
        }
        Insert: {
          created_at?: string
          critical_max?: number | null
          critical_min?: number | null
          evidence_level?: string | null
          guideline_source?: string
          guideline_year?: number
          id?: string
          normal_max?: number | null
          normal_min?: number | null
          organ_type: string
          parameter: string
          reference_url?: string | null
          risk_points_critical?: number
          risk_points_warning?: number
          trend_direction?: string | null
          trend_threshold_pct?: number | null
          unit?: string
          updated_at?: string
          warning_max?: number | null
          warning_min?: number | null
        }
        Update: {
          created_at?: string
          critical_max?: number | null
          critical_min?: number | null
          evidence_level?: string | null
          guideline_source?: string
          guideline_year?: number
          id?: string
          normal_max?: number | null
          normal_min?: number | null
          organ_type?: string
          parameter?: string
          reference_url?: string | null
          risk_points_critical?: number
          risk_points_warning?: number
          trend_direction?: string | null
          trend_threshold_pct?: number | null
          unit?: string
          updated_at?: string
          warning_max?: number | null
          warning_min?: number | null
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          albumin: number | null
          alp: number | null
          alt: number | null
          ammonia: number | null
          ast: number | null
          calcium: number | null
          created_at: string
          creatinine: number | null
          crp: number | null
          cyclosporine: number | null
          direct_bilirubin: number | null
          egfr: number | null
          esr: number | null
          ggt: number | null
          hb: number | null
          id: string
          inr: number | null
          ldh: number | null
          magnesium: number | null
          patient_id: string
          phosphorus: number | null
          platelets: number | null
          potassium: number | null
          proteinuria: number | null
          pti: number | null
          recorded_at: string
          report_file_url: string | null
          sodium: number | null
          tacrolimus_level: number | null
          tlc: number | null
          total_bilirubin: number | null
          total_protein: number | null
          urea: number | null
          uric_acid: number | null
        }
        Insert: {
          albumin?: number | null
          alp?: number | null
          alt?: number | null
          ammonia?: number | null
          ast?: number | null
          calcium?: number | null
          created_at?: string
          creatinine?: number | null
          crp?: number | null
          cyclosporine?: number | null
          direct_bilirubin?: number | null
          egfr?: number | null
          esr?: number | null
          ggt?: number | null
          hb?: number | null
          id?: string
          inr?: number | null
          ldh?: number | null
          magnesium?: number | null
          patient_id: string
          phosphorus?: number | null
          platelets?: number | null
          potassium?: number | null
          proteinuria?: number | null
          pti?: number | null
          recorded_at?: string
          report_file_url?: string | null
          sodium?: number | null
          tacrolimus_level?: number | null
          tlc?: number | null
          total_bilirubin?: number | null
          total_protein?: number | null
          urea?: number | null
          uric_acid?: number | null
        }
        Update: {
          albumin?: number | null
          alp?: number | null
          alt?: number | null
          ammonia?: number | null
          ast?: number | null
          calcium?: number | null
          created_at?: string
          creatinine?: number | null
          crp?: number | null
          cyclosporine?: number | null
          direct_bilirubin?: number | null
          egfr?: number | null
          esr?: number | null
          ggt?: number | null
          hb?: number | null
          id?: string
          inr?: number | null
          ldh?: number | null
          magnesium?: number | null
          patient_id?: string
          phosphorus?: number | null
          platelets?: number | null
          potassium?: number | null
          proteinuria?: number | null
          pti?: number | null
          recorded_at?: string
          report_file_url?: string | null
          sodium?: number | null
          tacrolimus_level?: number | null
          tlc?: number | null
          total_bilirubin?: number | null
          total_protein?: number | null
          urea?: number | null
          uric_acid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_schedules: {
        Row: {
          completed_lab_id: string | null
          created_at: string
          id: string
          patient_id: string
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_lab_id?: string | null
          created_at?: string
          id?: string
          patient_id: string
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_lab_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_schedules_completed_lab_id_fkey"
            columns: ["completed_lab_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_schedules_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_adherence: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          notes: string | null
          patient_id: string
          scheduled_date: string
          taken: boolean
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          notes?: string | null
          patient_id: string
          scheduled_date?: string
          taken?: boolean
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          notes?: string | null
          patient_id?: string
          scheduled_date?: string
          taken?: boolean
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_adherence_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_adherence_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_changes: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          medication_id: string
          new_dosage: string
          new_frequency: string | null
          old_dosage: string
          old_frequency: string | null
          patient_id: string
          reason: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          medication_id: string
          new_dosage: string
          new_frequency?: string | null
          old_dosage: string
          old_frequency?: string | null
          patient_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          medication_id?: string
          new_dosage?: string
          new_frequency?: string | null
          old_dosage?: string
          old_frequency?: string | null
          patient_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_changes_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_changes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          medication_name: string
          notes: string | null
          patient_id: string
          prescribed_by: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          medication_name: string
          notes?: string | null
          patient_id: string
          prescribed_by?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          medication_name?: string
          notes?: string | null
          patient_id?: string
          prescribed_by?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          patient_id: string
          risk_snapshot_id: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          patient_id: string
          risk_snapshot_id?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          patient_id?: string
          risk_snapshot_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_risk_snapshot_id_fkey"
            columns: ["risk_snapshot_id"]
            isOneToOne: false
            referencedRelation: "risk_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          patient_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          patient_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          assigned_doctor_id: string | null
          biopsy_result: string | null
          blood_type: string | null
          created_at: string
          date_of_birth: string | null
          dialysis_history: boolean | null
          district: string | null
          donor_blood_type: string | null
          full_name: string
          gender: string | null
          id: string
          last_risk_evaluation: string | null
          linked_user_id: string | null
          organ_type: string
          phone: string | null
          region: string | null
          rejection_type: string | null
          return_dialysis_date: string | null
          risk_level: string
          risk_score: number | null
          titer_therapy: boolean | null
          transplant_date: string | null
          transplant_number: number | null
          updated_at: string
        }
        Insert: {
          assigned_doctor_id?: string | null
          biopsy_result?: string | null
          blood_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          dialysis_history?: boolean | null
          district?: string | null
          donor_blood_type?: string | null
          full_name: string
          gender?: string | null
          id?: string
          last_risk_evaluation?: string | null
          linked_user_id?: string | null
          organ_type: string
          phone?: string | null
          region?: string | null
          rejection_type?: string | null
          return_dialysis_date?: string | null
          risk_level?: string
          risk_score?: number | null
          titer_therapy?: boolean | null
          transplant_date?: string | null
          transplant_number?: number | null
          updated_at?: string
        }
        Update: {
          assigned_doctor_id?: string | null
          biopsy_result?: string | null
          blood_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          dialysis_history?: boolean | null
          district?: string | null
          donor_blood_type?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_risk_evaluation?: string | null
          linked_user_id?: string | null
          organ_type?: string
          phone?: string | null
          region?: string | null
          rejection_type?: string | null
          return_dialysis_date?: string | null
          risk_level?: string
          risk_score?: number | null
          titer_therapy?: boolean | null
          transplant_date?: string | null
          transplant_number?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      risk_snapshots: {
        Row: {
          algorithm_version: string | null
          alt: number | null
          ast: number | null
          created_at: string
          creatinine: number | null
          details: Json | null
          id: string
          lab_result_id: string | null
          patient_id: string
          risk_level: string
          score: number
          tacrolimus_level: number | null
          total_bilirubin: number | null
          trend_flags: Json | null
        }
        Insert: {
          algorithm_version?: string | null
          alt?: number | null
          ast?: number | null
          created_at?: string
          creatinine?: number | null
          details?: Json | null
          id?: string
          lab_result_id?: string | null
          patient_id: string
          risk_level?: string
          score?: number
          tacrolimus_level?: number | null
          total_bilirubin?: number | null
          trend_flags?: Json | null
        }
        Update: {
          algorithm_version?: string | null
          alt?: number | null
          ast?: number | null
          created_at?: string
          creatinine?: number | null
          details?: Json | null
          id?: string
          lab_result_id?: string | null
          patient_id?: string
          risk_level?: string
          score?: number
          tacrolimus_level?: number | null
          total_bilirubin?: number | null
          trend_flags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_snapshots_lab_result_id_fkey"
            columns: ["lab_result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_snapshots_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      transplant_episodes: {
        Row: {
          created_at: string
          donor_blood_type: string | null
          donor_type: string | null
          episode_number: number
          id: string
          notes: string | null
          organ_type: string
          patient_id: string
          status: string
          transplant_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          donor_blood_type?: string | null
          donor_type?: string | null
          episode_number?: number
          id?: string
          notes?: string | null
          organ_type: string
          patient_id: string
          status?: string
          transplant_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          donor_blood_type?: string | null
          donor_type?: string | null
          episode_number?: number
          id?: string
          notes?: string | null
          organ_type?: string
          patient_id?: string
          status?: string
          transplant_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transplant_episodes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      generate_lab_schedule: {
        Args: { _patient_id: string; _transplant_date: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_lab_and_recalculate: {
        Args: {
          _algorithm_version?: string
          _lab_data: Json
          _risk_details?: Json
          _risk_level?: string
          _risk_score?: number
          _trend_flags?: Json
        }
        Returns: Json
      }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      register_patient_self: {
        Args: {
          _date_of_birth?: string
          _full_name: string
          _gender?: string
          _phone?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "patient" | "support"
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
      app_role: ["admin", "doctor", "patient", "support"],
    },
  },
} as const
