import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyStudents, getSessionProfile } from "@/lib/data";
import { formatDate, todayJst } from "@/lib/dates";
import { taskStatusLabels } from "@/lib/labels";
import type { Assignment, TaskStatus } from "@/lib/database.types";

export const metadata = { title: "ダッシュボード" };

const cellStyles: Record<TaskStatus, string> = {
  not_started: "bg-gray-200 text-gray-500",
  in_progress: "bg-amber-400 text-white",
  done: "bg-emerald-500 text-white",
};
const cellMarks: Record<TaskStatus, string> = {
  not_started: "−",
  in_progress: "…",
  done: "✓",
};

type TaskCell = { assignment_id: string; student_id: string; status: TaskStatus };

/** 講師ダッシュボード(F-1-6): 担当生徒 × 課題のマトリクス。進捗が色で一望できる */
export default async function TeacherDashboardPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role === "student") redirect("/home");

  const students = await getMyStudents();

  const assignmentQuery = supabase
    .from("assignments")
    .select("*")
    .order("due_date", { ascending: false })
    .limit(12);
  // 講師は自分が作成した課題のみ。運営は全課題が見える(RLS 準拠の絞り込み)
  const { data: assignmentData } =
    profile.role === "teacher"
      ? await assignmentQuery.eq("created_by", user.id)
      : await assignmentQuery;
  const assignments = (assignmentData ?? []) as Assignment[];

  const { data: taskData } =
    assignments.length > 0
      ? await supabase
          .from("assignment_tasks")
          .select("assignment_id, student_id, status")
          .in("assignment_id", assignments.map((a) => a.id))
      : { data: [] };
  const tasks = (taskData ?? []) as TaskCell[];
  const taskMap = new Map(tasks.map((t) => [`${t.assignment_id}:${t.student_id}`, t.status]));

  const today = todayJst();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <Link
          href="/teacher/assignments/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + 課題を作成
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">
          担当生徒がいません。運営に担当関係の設定を依頼してください。
        </p>
      ) : assignments.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">
          まだ課題がありません。「課題を作成」から始めましょう。
        </p>
      ) : (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-130 text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500">
                  生徒
                </th>
                {assignments.map((a) => {
                  const overdue = a.due_date < today;
                  return (
                    <th key={a.id} className="px-2 py-2 text-center align-bottom">
                      <Link
                        href={`/assignments/${a.id}`}
                        className="block max-w-24 text-xs font-medium text-gray-700 hover:text-indigo-700"
                      >
                        <span className="block truncate">{a.title}</span>
                        <span
                          className={`text-[10px] font-normal ${
                            overdue ? "font-semibold text-rose-600" : "text-gray-400"
                          }`}
                        >
                          {formatDate(a.due_date)}
                        </span>
                      </Link>
                      <Link
                        href={`/teacher/assignments/new?copy=${a.id}`}
                        className="text-[10px] text-gray-400 hover:text-indigo-600 hover:underline"
                      >
                        複製
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="sticky left-0 bg-white px-3 py-2">
                    <Link
                      href={`/teacher/students/${s.id}`}
                      className="text-sm font-medium hover:text-indigo-700 hover:underline"
                    >
                      {s.display_name}
                    </Link>
                    {s.grade && (
                      <span className="ml-1 text-xs text-gray-400">{s.grade}</span>
                    )}
                  </td>
                  {assignments.map((a) => {
                    const status = taskMap.get(`${a.id}:${s.id}`);
                    return (
                      <td key={a.id} className="px-2 py-2 text-center">
                        {status ? (
                          <span
                            title={taskStatusLabels[status]}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${cellStyles[status]}`}
                          >
                            {cellMarks[status]}
                          </span>
                        ) : (
                          <span className="text-gray-300"></span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-xs text-gray-400">
        凡例: <span className="font-bold text-emerald-600">✓ 完了</span> /{" "}
        <span className="font-bold text-amber-500">… 進行中</span> /{" "}
        <span className="font-bold text-gray-400">− 未着手</span> / ・ 未割当 ——
        生徒名をタップすると課題履歴と成績推移が見られます。
      </p>
    </div>
  );
}
