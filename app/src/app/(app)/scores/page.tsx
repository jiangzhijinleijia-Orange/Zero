import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { examTypeLabels } from "@/lib/labels";
import { ScoreChart, type ScorePoint } from "@/components/ScoreChart";
import type { ExamType, Judgement } from "@/lib/database.types";

export const metadata = { title: "マイ成績" };

type ScoreRow = {
  id: string;
  score: number;
  max_score: number;
  deviation: number | null;
  judgement: Judgement | null;
  note: string | null;
  exam: { name: string; exam_date: string; type: ExamType; provider: string | null };
  subject: { name: string };
};

export default async function MyScoresPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const { data } = await supabase
    .from("exam_scores")
    .select(
      "id, score, max_score, deviation, judgement, note, exam:exams(name, exam_date, type, provider), subject:subjects(name)",
    )
    .eq("student_id", user.id);

  const rows = ((data ?? []) as unknown as ScoreRow[]).sort((a, b) =>
    b.exam.exam_date.localeCompare(a.exam.exam_date),
  );

  const points: ScorePoint[] = rows.map((r) => ({
    examName: r.exam.name,
    examDate: r.exam.exam_date,
    subjectName: r.subject.name,
    scoreRate: Math.round((r.score / r.max_score) * 1000) / 10,
    deviation: r.deviation,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">マイ成績</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-gray-700">推移(科目別)</h2>
        <ScoreChart points={points} />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700">
          成績一覧
        </h2>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">
            まだ成績がありません。「成績登録」から登録してみましょう。
          </p>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="border-b border-gray-100 px-4 py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.exam.name}
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        {r.subject.name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(r.exam.exam_date)} ・ {examTypeLabels[r.exam.type]}
                      {r.exam.provider && ` ・ ${r.exam.provider}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {r.score}
                      <span className="text-xs font-normal text-gray-400">
                        /{r.max_score}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.deviation != null && `偏差値 ${r.deviation}`}
                      {r.deviation != null && r.judgement && " ・ "}
                      {r.judgement && `${r.judgement} 判定`}
                    </p>
                  </div>
                </div>
                {r.note && (
                  <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    📝 {r.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
