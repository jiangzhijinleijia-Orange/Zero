"use client";

import { useActionState } from "react";
import { saveTaskNote } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

/** 進捗メモ(F-1-7)。例: 問題集 p.10〜30 のうち p.22 まで */
export function NoteForm({
  taskId,
  initialNote,
}: {
  taskId: string;
  initialNote: string | null;
}) {
  const [state, formAction] = useActionState(saveTaskNote.bind(null, taskId), null);

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="progress_note"
        rows={3}
        defaultValue={initialNote ?? ""}
        placeholder="例: p.22 まで終了。23〜30 は週末にやる"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50">
        メモを保存
      </SubmitButton>
    </form>
  );
}
