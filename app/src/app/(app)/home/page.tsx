import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { addDays, formatDateTime, todayJst } from "@/lib/dates";
import { eventTypeLabels, eventTypeStyles } from "@/lib/labels";
import { TaskCard, type TaskWithAssignment } from "@/components/TaskCard";
import type { AppEvent } from "@/lib/database.types";

export const metadata = { title: "ホーム" };

const TASK_SELECT =
  "id, status, progress_note, assignment:assignments(id, title, due_date, subject:subjects(name))";

export default async function HomePage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const today = todayJst();
  const weekEnd = addDays(today, 7);

  const [{ data: taskData }, { data: eventData }] = await Promise.all([
    supabase
      .from("assignment_tasks")
      .select(TASK_SELECT)
      .eq("student_id", user.id),
    supabase
      .from("events")
      .select("*")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(5),
  ]);

  const tasks = (taskData ?? []) as unknown as TaskWithAssignment[];
  const events = (eventData ?? []) as AppEvent[];

  const byDue = (a: TaskWithAssignment, b: TaskWithAssignment) =>
    a.assignment.due_date.localeCompare(b.assignment.due_date);

  const overdue = tasks
    .filter((t) => t.status !== "done" && t.assignment.due_date < today)
    .sort(byDue);
  const thisWeek = tasks
    .filter(
      (t) =>
        t.status !== "done" &&
        t.assignment.due_date >= today &&
        t.assignment.due_date <= weekEnd,
    )
    .sort(byDue);
  const later = tasks
    .filter((t) => t.status !== "done" && t.assignment.due_date > weekEnd)
    .sort(byDue);
  const done = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => byDue(b, a))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-1 text-xl font-bold">
          こんにちは、{profile.display_name} さん
        </h1>
        <p className="text-sm text-gray-500">
          {overdue.length + thisWeek.length > 0
            ? `今週やる課題が ${overdue.length + thisWeek.length} 件あります。`
            : "今週の課題はすべて片付いています 🎉"}
        </p>
      </section>

      {overdue.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-rose-600">⚠ 期限切れ</h2>
          <div className="space-y-3">
            {overdue.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700">📌 今週の課題</h2>
        {thisWeek.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400">
            今週締切の課題はありません。
          </p>
        ) : (
          <div className="space-y-3">
            {thisWeek.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>

      {later.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-gray-700">それ以降</h2>
          <div className="space-y-3">
            {later.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700">📅 直近の予定</h2>
        {events.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400">
            直近の予定はありません。
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${eventTypeStyles[e.type]}`}
                >
                  {eventTypeLabels[e.type]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                <span className="text-xs text-gray-500">
                  {formatDateTime(e.starts_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-right">
          <Link href="/calendar" className="text-xs text-indigo-600 hover:underline">
            カレンダーを見る →
          </Link>
        </p>
      </section>

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-bold text-gray-500">
            ✅ 最近完了した課題({done.length}件)
          </summary>
          <div className="mt-3 space-y-3">
            {done.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
