"use client";

import { useActionState } from "react";
import type { Assignment, Profile, Subject } from "@/lib/database.types";
import { createAssignment } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

/** 課題の作成・一括割当(F-1-1, F-1-2)。copyFrom 指定で複製(F-1-9) */
export function AssignmentForm({
  subjects,
  students,
  copyFrom,
}: {
  subjects: Subject[];
  students: Profile[];
  copyFrom: Assignment | null;
}) {
  const [state, formAction] = useActionState(createAssignment, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className={labelCls}>タイトル</label>
        <input
          name="title"
          defaultValue={copyFrom?.title ?? ""}
          placeholder="例: 英単語帳 p.10〜30"
          required
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>説明(任意)</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={copyFrom?.description ?? ""}
          placeholder="範囲・やり方・参考リンクなど。質問のやりとりは Discord で。"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>科目(任意)</label>
          <select
            name="subject_id"
            defaultValue={copyFrom?.subject_id ?? ""}
            className={inputCls}
          >
            <option value="">—</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>締切日</label>
          <input type="date" name="due_date" required className={inputCls} />
        </div>
      </div>

      <fieldset>
        <legend className={labelCls}>割当先の生徒</legend>
        {students.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            担当生徒がいません。運営に担当関係の設定を依頼してください。
          </p>
        ) : (
          <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2">
            {students.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  name="students"
                  value={s.id}
                  defaultChecked
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm">
                  {s.display_name}
                  {s.grade && <span className="ml-1 text-xs text-gray-400">{s.grade}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton>課題を作成して割り当てる</SubmitButton>
    </form>
  );
}
