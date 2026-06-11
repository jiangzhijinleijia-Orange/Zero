"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Exam, ExamType, Judgement, Profile, Subject, Topic } from "@/lib/database.types";
import { examTypeLabels, judgements } from "@/lib/labels";
import { createTopic, registerScores, type ScoreRowInput } from "@/lib/actions";

type RowState = {
  key: number;
  subjectId: string;
  score: string;
  maxScore: string;
  deviation: string;
  judgement: "" | Judgement;
  note: string;
  topics: { key: number; topicId: string; score: string; maxScore: string }[];
};

let keyCounter = 1;
const newRow = (): RowState => ({
  key: keyCounter++,
  subjectId: "",
  score: "",
  maxScore: "100",
  deviation: "",
  judgement: "",
  note: "",
  topics: [],
});

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

/**
 * 成績登録フォーム(F-2)。
 * 生徒は自分の成績のみ、講師は担当生徒の成績を登録できる(RLS が強制)。
 */
export function ScoreEntryForm({
  subjects,
  topics: initialTopics,
  recentExams,
  students,
  selfId,
  isStaff,
}: {
  subjects: Subject[];
  topics: Topic[];
  recentExams: Exam[];
  students: Profile[]; // 講師: 担当生徒一覧 / 生徒: 空
  selfId: string;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [studentId, setStudentId] = useState(isStaff ? "" : selfId);
  const [examMode, setExamMode] = useState<"new" | "existing">(
    recentExams.length > 0 ? "existing" : "new",
  );
  const [examId, setExamId] = useState(recentExams[0]?.id ?? "");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examType, setExamType] = useState<ExamType>("mock");
  const [examProvider, setExamProvider] = useState("");
  const [rows, setRows] = useState<RowState[]>([newRow()]);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);

  const patchRow = (key: number, patch: Partial<RowState>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addTopicVocab = async (subjectId: string, rowKey: number) => {
    const name = window.prompt("追加する分野名(例: 二次関数)");
    if (!name) return;
    const result = await createTopic(subjectId, name);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    const topic: Topic = { id: result.id, subject_id: subjectId, name: result.name };
    setTopics((ts) => [...ts, topic]);
    patchRow(rowKey, {
      topics: [
        ...rows.find((r) => r.key === rowKey)!.topics,
        { key: keyCounter++, topicId: topic.id, score: "", maxScore: "" },
      ],
    });
  };

  const submit = () => {
    setError(null);
    const input = {
      exam:
        examMode === "existing"
          ? ({ kind: "existing", id: examId } as const)
          : ({
              kind: "new",
              name: examName,
              examDate,
              type: examType,
              provider: examProvider || null,
            } as const),
      studentId,
      rows: rows
        .filter((r) => r.subjectId || r.score)
        .map(
          (r): ScoreRowInput => ({
            subjectId: r.subjectId,
            score: Number(r.score),
            maxScore: Number(r.maxScore),
            deviation: r.deviation === "" ? null : Number(r.deviation),
            judgement: r.judgement === "" ? null : r.judgement,
            note: r.note || null,
            topics: r.topics
              .filter((t) => t.topicId && t.score !== "" && t.maxScore !== "")
              .map((t) => ({
                topicId: t.topicId,
                score: Number(t.score),
                maxScore: Number(t.maxScore),
              })),
          }),
        ),
    };
    if (!input.studentId) {
      setError("生徒を選択してください。");
      return;
    }
    startTransition(async () => {
      const result = await registerScores(input);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  if (saved) {
    return (
      <div className="rounded-xl bg-emerald-50 p-6 text-center">
        <p className="font-medium text-emerald-800">成績を登録しました ✓</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setRows([newRow()]);
            }}
            className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700"
          >
            続けて登録する
          </button>
          <button
            type="button"
            onClick={() => router.push(isStaff ? "/teacher" : "/scores")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            {isStaff ? "ダッシュボードへ" : "マイ成績を見る"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isStaff && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <label className={labelCls}>生徒</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={inputCls}
          >
            <option value="">選択してください</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
                {s.grade ? `(${s.grade})` : ""}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">テスト</h2>
          {recentExams.length > 0 && (
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setExamMode("existing")}
                className={`px-2.5 py-1 ${examMode === "existing" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
              >
                既存から選ぶ
              </button>
              <button
                type="button"
                onClick={() => setExamMode("new")}
                className={`px-2.5 py-1 ${examMode === "new" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
              >
                新規作成
              </button>
            </div>
          )}
        </div>

        {examMode === "existing" ? (
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className={inputCls}>
            {recentExams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.exam_date}{e.name}{examTypeLabels[e.type]})
              </option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>テスト名</label>
              <input
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="例: 第2回 全国模試"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>実施日</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>種別</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className={inputCls}
              >
                {(Object.keys(examTypeLabels) as ExamType[]).map((t) => (
                  <option key={t} value={t}>
                    {examTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
            {examType === "mock" && (
              <div className="col-span-2">
                <label className={labelCls}>提供元(任意。例: 河合塾、ベネッセ)</label>
                <input
                  value={examProvider}
                  onChange={(e) => setExamProvider(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        {rows.map((row) => {
          const rowTopics = topics.filter((t) => t.subject_id === row.subjectId);
          return (
            <div key={row.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>科目</label>
                  <select
                    value={row.subjectId}
                    onChange={(e) =>
                      patchRow(row.key, { subjectId: e.target.value, topics: [] })
                    }
                    className={inputCls}
                  >
                    <option value="">選択</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>得点</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.score}
                      onChange={(e) => patchRow(row.key, { score: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>満点</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.maxScore}
                      onChange={(e) => patchRow(row.key, { maxScore: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>偏差値(任意)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={row.deviation}
                    onChange={(e) => patchRow(row.key, { deviation: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>志望校判定(任意)</label>
                  <select
                    value={row.judgement}
                    onChange={(e) =>
                      patchRow(row.key, { judgement: e.target.value as "" | Judgement })
                    }
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {judgements.map((j) => (
                      <option key={j} value={j}>
                        {j} 判定
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>振り返りメモ(任意)</label>
                  <input
                    value={row.note}
                    onChange={(e) => patchRow(row.key, { note: e.target.value })}
                    placeholder="例: 長文で時間切れ。次は時間配分を意識"
                    className={inputCls}
                  />
                </div>
              </div>

              {row.subjectId && (
                <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    分野別の内訳(任意・今後の学習提案の材料になります)
                  </p>
                  {row.topics.map((t) => (
                    <div key={t.key} className="mb-2 flex items-center gap-2">
                      <select
                        value={t.topicId}
                        onChange={(e) =>
                          patchRow(row.key, {
                            topics: row.topics.map((x) =>
                              x.key === t.key ? { ...x, topicId: e.target.value } : x,
                            ),
                          })
                        }
                        className={`${inputCls} flex-1`}
                      >
                        <option value="">分野を選択</option>
                        {rowTopics.map((topic) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="得点"
                        value={t.score}
                        onChange={(e) =>
                          patchRow(row.key, {
                            topics: row.topics.map((x) =>
                              x.key === t.key ? { ...x, score: e.target.value } : x,
                            ),
                          })
                        }
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-gray-400">/</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="満点"
                        value={t.maxScore}
                        onChange={(e) =>
                          patchRow(row.key, {
                            topics: row.topics.map((x) =>
                              x.key === t.key ? { ...x, maxScore: e.target.value } : x,
                            ),
                          })
                        }
                        className={`${inputCls} w-20`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patchRow(row.key, {
                            topics: row.topics.filter((x) => x.key !== t.key),
                          })
                        }
                        className="text-gray-400 hover:text-red-500"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        patchRow(row.key, {
                          topics: [
                            ...row.topics,
                            { key: keyCounter++, topicId: "", score: "", maxScore: "" },
                          ],
                        })
                      }
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      + 分野を追加
                    </button>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => addTopicVocab(row.subjectId, row.key)}
                        className="text-gray-500 hover:underline"
                      >
                        新しい分野名を登録
                      </button>
                    )}
                  </div>
                </div>
              )}

              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                  className="mt-3 text-xs text-gray-400 hover:text-red-500"
                >
                  この科目を削除
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          + 科目を追加
        </button>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? "登録中..." : "成績を登録する"}
      </button>
    </div>
  );
}
