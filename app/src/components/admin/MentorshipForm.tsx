"use client";

import { useActionState, useTransition } from "react";
import type { Profile } from "@/lib/database.types";
import { addMentorship, endMentorship } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

export function MentorshipForm({
  teachers,
  students,
}: {
  teachers: Profile[];
  students: Profile[];
}) {
  const [state, formAction] = useActionState(addMentorship, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-40 flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">講師</label>
        <select name="teacher_id" required className={inputCls}>
          <option value="">選択</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-40 flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">生徒</label>
        <select name="student_id" required className={inputCls}>
          <option value="">選択</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50">
        担当を設定
      </SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function EndMentorshipButton({ mentorshipId }: { mentorshipId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (window.confirm("この担当関係を終了しますか?(講師から生徒のデータが見えなくなります)")) {
          startTransition(async () => {
            await endMentorship(mentorshipId);
          });
        }
      }}
      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
    >
      担当終了
    </button>
  );
}
