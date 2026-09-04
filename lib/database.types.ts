export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      consultations: {
        Row: {
          created_at: string;
          first_name: string;
          id: string;
          last_name: string;
          reason: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["consultation_status"];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          first_name: string;
          id?: string;
          last_name: string;
          reason: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["consultation_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          reason?: string;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["consultation_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consultations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      app_role: "student" | "admin";
      consultation_status: "scheduled" | "completed" | "cancelled";
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Consultation =
  Database["public"]["Tables"]["consultations"]["Row"];

export type ConsultationSummary = Omit<Consultation, "student_id">;
