import Link from "next/link";
import type { TaskStatus } from "@/lib/database.types";
import { formatDate, todayJst } from "@/lib/dates";
import { TaskStatusButtons } from "@/components/TaskStatusButtons";

export type TaskWithAssignment = {
  id: string;
  status: TaskStatus;
  progress_note: string | null;
  assignment: {
    id: string;
    title: string;
    due_date: string;
    subject: { name: string } | null;
  };
};

/** 生徒ホームの課題カード。ステータスは1タップで更新(F-1-5) */
export function TaskCard({ task }: { task: TaskWithAssignment }) {
  const overdue = task.assignment.due_date < todayJst() && task.status !== "done";

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        overdue ? "border-rose-300" : "border-gray-200"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/assignments/${task.assignment.id}`}
            className="font-medium text-gray-900 hover:text-indigo-700 hover:underline"
          >
            {task.assignment.title}
          </Link>
          <p className="mt-0.5 text-xs text-gray-500">
            {task.assignment.subject && (
              <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5">
                {task.assignment.subject.name}
              </span>
            )}
            <span className={overdue ? "font-semibold text-rose-600" : ""}>
              締切 {formatDate(task.assignment.due_date)}
              {overdue && "(期限切れ)"}
            </span>
          </p>
        </div>
      </div>
      <TaskStatusButtons taskId={task.id} status={task.status} size="sm" />
      {task.progress_note && (
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          📝 {task.progress_note}
        </p>
      )}
    </div>
  );
}
