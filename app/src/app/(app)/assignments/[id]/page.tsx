import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { formatDate, todayJst } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskStatusButtons } from "@/components/TaskStatusButtons";
import { NoteForm } from "@/components/NoteForm";
import type { Assignment, AssignmentTask } from "@/lib/database.types";

export const metadata = { title: "課題詳細" };

type AssignmentDetail = Assignment & {
  subject: { name: string } | null;
  creator: { display_name: string } | null;
};
type TaskWithStudent = AssignmentTask & {
  student: { display_name: string; grade: string | null } | null;
};

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const { data: assignmentData } = await supabase
    .from("assignments")
    .select(
      "*, subject:subjects(name), creator:profiles!assignments_created_by_fkey(display_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!assignmentData) notFound();
  const assignment = assignmentData as unknown as AssignmentDetail;

  const { data: taskData } = await supabase
    .from("assignment_tasks")
    .select("*, student:profiles!assignment_tasks_student_id_fkey(display_name, grade)")
    .eq("assignment_id", id);
  const tasks = (taskData ?? []) as unknown as TaskWithStudent[];

  const myTask = tasks.find((t) => t.student_id === user.id) ?? null;
  const overdue = assignment.due_date < todayJst();
  const isStaff = profile.role !== "student";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {assignment.subject && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5">
              {assignment.subject.name}
            </span>
          )}
          <span className={overdue ? "font-semibold text-rose-600" : ""}>
            締切 {formatDate(assignment.due_date)}
            {overdue && "(期限切れ)"}
          </span>
          {assignment.creator && <span>出題: {assignment.creator.display_name}</span>}
        </div>
        <h1 className="text-xl font-bold">{assignment.title}</h1>
        {assignment.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {assignment.description}
          </p>
        )}
      </section>

      {myTask && (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-gray-700">自分の進捗</h2>
            <TaskStatusButtons taskId={myTask.id} status={myTask.status} />
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-gray-700">
              進捗メモ(どこまでやったか)
            </h2>
            <NoteForm taskId={myTask.id} initialNote={myTask.progress_note} />
            <p className="mt-3 text-xs text-gray-400">
              質問や相談は Discord の担当講師チャンネルへ。
            </p>
          </section>
        </>
      )}

      {isStaff && tasks.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700">
            割当先の進捗({tasks.length}名)
          </h2>
          <ul>
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t.student?.display_name ?? "(不明)"}
                    {t.student?.grade && (
                      <span className="ml-1 text-xs text-gray-400">{t.student.grade}</span>
                    )}
                  </p>
                  {t.progress_note && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      📝 {t.progress_note}
                    </p>
                  )}
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
