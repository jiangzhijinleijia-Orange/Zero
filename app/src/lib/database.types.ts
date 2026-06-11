// supabase/migrations/0001_initial_schema.sql と対応する手書きの型定義。
// スキーマ変更時はマイグレーションと同時にここを更新すること。

export type UserRole = "student" | "teacher" | "admin";
export type UserStatus = "active" | "inactive";
export type TaskStatus = "not_started" | "in_progress" | "done";
export type ExamType = "mock" | "term" | "quiz";
export type EventType = "mock_exam" | "offline" | "other";
export type EventVisibility = "all" | "targeted";
export type Judgement = "A" | "B" | "C" | "D" | "E";

export type Profile = {
  id: string;
  display_name: string;
  role: UserRole;
  grade: string | null;
  affiliation: string | null;
  status: UserStatus;
  created_at: string;
};

export type Mentorship = {
  id: string;
  teacher_id: string;
  student_id: string;
  started_on: string;
  ended_on: string | null;
};

export type Invitation = {
  id: string;
  token: string;
  role: UserRole;
  grade: string | null;
  mentor_id: string | null;
  created_by: string | null;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
};

export type Subject = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type Topic = {
  id: string;
  subject_id: string;
  name: string;
};

export type Assignment = {
  id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  subject_id: string | null;
  due_date: string;
  created_at: string;
};

export type AssignmentTask = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: TaskStatus;
  progress_note: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type Exam = {
  id: string;
  name: string;
  exam_date: string;
  type: ExamType;
  provider: string | null;
  created_by: string | null;
};

export type ExamScore = {
  id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  deviation: number | null;
  judgement: Judgement | null;
  note: string | null;
  registered_by: string | null;
  created_at: string;
};

export type ScoreTopic = {
  id: string;
  exam_score_id: string;
  topic_id: string;
  score: number;
  max_score: number;
};

export type AppEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  type: EventType;
  visibility: EventVisibility;
  created_by: string | null;
  created_at: string;
};

export type EventTarget = {
  event_id: string;
  student_id: string;
};

export type CalendarItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  item_type: string; // event_type または 'assignment_due'
  source: "event" | "assignment";
};

// Relationships は supabase-js の型制約上必須。結合クエリの型推論には使わず、
// 結合結果はクエリ側でローカル型にキャストする方針(supabase gen types 導入時に置換可)
type TableDef<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        Pick<Profile, "id" | "display_name" | "role"> &
          Partial<Pick<Profile, "grade" | "affiliation" | "status">>
      >;
      mentorships: TableDef<
        Mentorship,
        Pick<Mentorship, "teacher_id" | "student_id"> &
          Partial<Pick<Mentorship, "started_on" | "ended_on">>
      >;
      invitations: TableDef<
        Invitation,
        Pick<Invitation, "role" | "created_by"> &
          Partial<Pick<Invitation, "grade" | "mentor_id" | "expires_at">>
      >;
      subjects: TableDef<
        Subject,
        Pick<Subject, "name"> & Partial<Pick<Subject, "sort_order" | "is_active">>
      >;
      topics: TableDef<Topic, Pick<Topic, "subject_id" | "name">>;
      assignments: TableDef<
        Assignment,
        Pick<Assignment, "created_by" | "title" | "due_date"> &
          Partial<Pick<Assignment, "description" | "subject_id">>
      >;
      assignment_tasks: TableDef<
        AssignmentTask,
        Pick<AssignmentTask, "assignment_id" | "student_id"> &
          Partial<Pick<AssignmentTask, "status" | "progress_note">>
      >;
      exams: TableDef<
        Exam,
        Pick<Exam, "name" | "exam_date" | "type" | "created_by"> &
          Partial<Pick<Exam, "provider">>
      >;
      exam_scores: TableDef<
        ExamScore,
        Pick<
          ExamScore,
          "exam_id" | "student_id" | "subject_id" | "score" | "max_score" | "registered_by"
        > &
          Partial<Pick<ExamScore, "deviation" | "judgement" | "note">>
      >;
      score_topics: TableDef<
        ScoreTopic,
        Pick<ScoreTopic, "exam_score_id" | "topic_id" | "score" | "max_score">
      >;
      events: TableDef<
        AppEvent,
        Pick<AppEvent, "title" | "starts_at" | "created_by"> &
          Partial<Pick<AppEvent, "ends_at" | "type" | "visibility">>
      >;
      event_targets: TableDef<EventTarget, EventTarget>;
    };
    Views: {
      calendar_items: { Row: CalendarItem; Relationships: [] };
    };
    Functions: {
      redeem_invitation: {
        Args: { p_token: string; p_display_name: string };
        Returns: undefined;
      };
      admin_set_user_status: {
        Args: { p_user: string; p_status: UserStatus };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      task_status: TaskStatus;
      exam_type: ExamType;
      event_type: EventType;
      event_visibility: EventVisibility;
    };
    CompositeTypes: Record<string, never>;
  };
};
