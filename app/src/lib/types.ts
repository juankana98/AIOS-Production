// Tipos manuales del esquema (supabase/migrations/0001_init.sql).
// Cuando el proyecto de Supabase esté provisionado, se pueden regenerar con:
//   npx supabase gen types typescript --project-id <id> > src/lib/types.ts
// y reemplazar este archivo manteniendo los alias de abajo.

export type CompanyRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type GoalRow = {
  id: string;
  owner_id: string;
  company_id: string;
  title: string;
  description: string | null;
  period_type: "month" | "quarter" | "year" | "custom";
  starts_on: string | null;
  ends_on: string | null;
  status: "active" | "achieved" | "missed" | "archived";
  created_at: string;
  updated_at: string;
};

export type OkrRow = {
  id: string;
  owner_id: string;
  company_id: string;
  goal_id: string | null;
  objective: string;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: "active" | "achieved" | "missed" | "archived";
  created_at: string;
  updated_at: string;
};

export type KeyResultRow = {
  id: string;
  owner_id: string;
  okr_id: string;
  title: string;
  metric_unit: string;
  start_value: number;
  target_value: number;
  current_value: number;
  created_at: string;
  updated_at: string;
};

export type ProjectStatus = "backlog" | "active" | "on_hold" | "done" | "cancelled";

export type ProjectRow = {
  id: string;
  owner_id: string;
  company_id: string;
  okr_id: string | null;
  name: string;
  expected_outcome: string;
  description: string | null;
  status: ProjectStatus;
  priority: 1 | 2 | 3 | 4;
  progress_pct: number;
  progress_mode: "auto" | "manual";
  starts_on: string | null;
  due_on: string | null;
  created_at: string;
  updated_at: string;
};

export type KpiRow = {
  id: string;
  owner_id: string;
  project_id: string;
  name: string;
  unit: string;
  target_value: number;
  current_value: number;
  frequency: "daily" | "weekly" | "monthly";
  created_at: string;
  updated_at: string;
};

export type KpiEntryRow = {
  id: string;
  owner_id: string;
  kpi_id: string;
  value: number;
  recorded_on: string;
  note: string | null;
  created_at: string;
};

export type TaskStatus = "todo" | "doing" | "blocked" | "done" | "cancelled";
export type TaskEnergy = "low" | "medium" | "high" | "deep";

export type TaskRow = {
  id: string;
  owner_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  is_urgent: boolean;
  is_important: boolean;
  estimated_minutes: number | null;
  actual_minutes: number;
  due_at: string | null;
  energy: TaskEnergy;
  order_index: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeEntryRow = {
  id: string;
  owner_id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string | null;
  created_at: string;
};

export type ScheduleBlockRow = {
  id: string;
  owner_id: string;
  task_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  source: "manual" | "auto";
  status: "planned" | "done" | "skipped";
  created_at: string;
  updated_at: string;
};

export type CheckinRow = {
  id: string;
  owner_id: string;
  checkin_date: string;
  type: "daily" | "weekly";
  wins: string | null;
  blockers: string | null;
  focus_next: string | null;
  score: number | null;
  created_at: string;
};

export type IdeaInboxRow = {
  id: string;
  owner_id: string;
  raw_text: string;
  status: "pending" | "processing" | "processed" | "discarded";
  ai_proposal: AiIdeaProposal | null;
  company_id: string | null;
  created_project_id: string | null;
  created_at: string;
  processed_at: string | null;
};

export type AiIdeaProposal = {
  kind: "project" | "tasks_only";
  company_slug?: string;
  project?: {
    name: string;
    expected_outcome: string;
    description?: string;
    priority?: 1 | 2 | 3 | 4;
    due_on?: string;
  };
  tasks: Array<{
    title: string;
    description?: string;
    is_urgent?: boolean;
    is_important?: boolean;
    estimated_minutes?: number;
    energy?: TaskEnergy;
  }>;
  kpis?: Array<{ name: string; unit?: string; target_value: number; frequency?: "daily" | "weekly" | "monthly" }>;
  rationale?: string;
};

export type GoogleCalendarConnectionRow = {
  id: string;
  owner_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scope: string;
  calendar_id: string;
  connected_at: string;
  updated_at: string;
};

export type DailyCapacityRow = {
  id: string;
  owner_id: string;
  capacity_date: string;
  available_minutes: number;
  executed_minutes: number;
  source: "google_calendar" | "fallback_work_hours";
  computed_at: string;
};

// Minimal Database type shape so @supabase/ssr generics compile.
// Not exhaustive (Functions/Enums omitted) — extend if you regenerate from the CLI.
export type Database = {
  public: {
    Tables: {
      companies: { Row: CompanyRow; Insert: Partial<CompanyRow>; Update: Partial<CompanyRow> };
      goals: { Row: GoalRow; Insert: Partial<GoalRow>; Update: Partial<GoalRow> };
      okrs: { Row: OkrRow; Insert: Partial<OkrRow>; Update: Partial<OkrRow> };
      key_results: { Row: KeyResultRow; Insert: Partial<KeyResultRow>; Update: Partial<KeyResultRow> };
      projects: { Row: ProjectRow; Insert: Partial<ProjectRow>; Update: Partial<ProjectRow> };
      kpis: { Row: KpiRow; Insert: Partial<KpiRow>; Update: Partial<KpiRow> };
      kpi_entries: { Row: KpiEntryRow; Insert: Partial<KpiEntryRow>; Update: Partial<KpiEntryRow> };
      tasks: { Row: TaskRow; Insert: Partial<TaskRow>; Update: Partial<TaskRow> };
      time_entries: { Row: TimeEntryRow; Insert: Partial<TimeEntryRow>; Update: Partial<TimeEntryRow> };
      schedule_blocks: { Row: ScheduleBlockRow; Insert: Partial<ScheduleBlockRow>; Update: Partial<ScheduleBlockRow> };
      checkins: { Row: CheckinRow; Insert: Partial<CheckinRow>; Update: Partial<CheckinRow> };
      idea_inbox: { Row: IdeaInboxRow; Insert: Partial<IdeaInboxRow>; Update: Partial<IdeaInboxRow> };
    };
  };
};
