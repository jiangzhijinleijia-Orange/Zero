import type {
  EventType,
  ExamType,
  TaskStatus,
  UserRole,
} from "@/lib/database.types";

export const taskStatusLabels: Record<TaskStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  done: "完了",
};

export const taskStatusStyles: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
};

export const examTypeLabels: Record<ExamType, string> = {
  mock: "模試",
  term: "定期テスト",
  quiz: "小テスト",
};

export const eventTypeLabels: Record<EventType, string> = {
  mock_exam: "模試",
  offline: "オフライン会",
  other: "その他",
};

export const eventTypeStyles: Record<EventType, string> = {
  mock_exam: "bg-violet-100 text-violet-800",
  offline: "bg-sky-100 text-sky-800",
  other: "bg-gray-100 text-gray-700",
};

export const roleLabels: Record<UserRole, string> = {
  student: "生徒",
  teacher: "講師",
  admin: "運営",
};

export const judgements = ["A", "B", "C", "D", "E"] as const;
