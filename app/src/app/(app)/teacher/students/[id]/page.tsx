import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { formatDate, todayJst } from "@/lib/dates";
import { examTypeLabels } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreChart, type ScorePoint } from "@/components/ScoreChart";
import type {
  ExamType,
  Judgement,
  Profile,
  TaskStatus,
} from "@/lib/database.types";

export const metadata = { title: "生徒詳細" };

type TaskRow = {
  id: string;
  status: TaskStatus;
  progress_note: string | null;
  assignment: { id: string; title: string; due_date: string; subject: { name: string } | null };
};
type ScoreRow = {
  id: string;
  score: number;
  max_score: number;
  deviation: number | null;
  judgement: Judgement | null;
  exam: { name: string; exam_date: string; type: ExamType };
  subject: { name: string };
};

/** 生徒詳細(講師視点): 課題履歴+成績推移を縦断的に閲覧(画面8) */
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role === "student") redirect("/home");

  const { data: studentData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  // RLS により担当外の生徒は取得できない(= 404)
  if (!studentData) notFound();
  const student = studentData as Profile;

  const [{ data: taskData }, { data: scoreData }] = await Promise.all([
    supabase
      .from("assignment_tasks")
      .select(
        "id, status, progress_note, assignment:assignments(id, title, due_date, subject:subjects(name))",
      )
      .eq("student_id", id),
    supabase
      .from("exam_scores")
      .select(
        "id, score, max_score, deviation, judgement, exam:exams(name, exam_date, type), subject:subjects(name)",
      )
      .eq("student_id", id),
  ]);

  const tasks = ((taskData ?? []) as unknown as TaskRow[]).sort((a, b) =>
    b.assignment.due_date.localeCompare(a.assignment.due_date),
  );
  const scores = ((scoreData ?? []) as unknown as ScoreRow[]).sort((a, b) =>
    b.exam.exam_date.localeCompare(a.exam.exam_date),
  );

  const points: ScorePoint[] = scores.map((r) => ({
    examName: r.exam.name,
    examDate: r.exam.exam_date,
    subjectName: r.subject.name,
    scoreRate: Math.round((r.score / r.max_score) * 1000) / 10,
    deviation: r.deviation,
  }));

  const today = todayJst();
  const openTasks = tasks.filter((t) => t.status !== "done");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          {student.display_name}
          {student.grade && (
            <span className="ml-2 text-sm font-normal text-gray-500">{student.grade}</span>
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          未完了の課題 {openTasks.length} 件 ・ 成績 {scores.length} 件
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-gray-700">成績推移</h2>
        <ScoreChart points={points} />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700">
          課題履歴
        </h2>
        {tasks.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">課題はまだありません。</p>
        ) : (
          <ul>
            {tasks.map((t) => {
              const overdue = t.assignment.due_date < today && t.status !== "done";
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/assignments/${t.assignment.id}`}
                      className="text-sm font-medium hover:text-indigo-700 hover:underline"
                    >
                      {t.assignment.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t.assignment.subject && (
                        <span className="mr-2">{t.assignment.subject.name}</span>
                      )}
                      <span className={overdue ? "font-semibold text-rose-600" : ""}>
                        締切 {formatDate(t.assignment.due_date)}
                      </span>
                    </p>
                    {t.progress_note && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        📝 {t.progress_note}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700">
          成績一覧
        </h2>
        {scores.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">成績はまだありません。</p>
        ) : (
          <ul>
            {scores.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.exam.name}
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {r.subject.name}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(r.exam.exam_date)} ・ {examTypeLabels[r.exam.type]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {r.score}
                    <span className="text-xs font-normal text-gray-400">/{r.max_score}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.deviation != null && `偏差値 ${r.deviation}`}
                    {r.deviation != null && r.judgement && " ・ "}
                    {r.judgement && `${r.judgement} 判定`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
