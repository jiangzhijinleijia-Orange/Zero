"use client";

import { useActionState, useState } from "react";
import type { EventType, Profile } from "@/lib/database.types";
import { eventTypeLabels } from "@/lib/labels";
import { createEvent } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

/** 予定の登録(F-3-3)。公開範囲は 全体 / 特定生徒のみ(F-3-4) */
export function EventForm({ students }: { students: Profile[] }) {
  const [state, formAction] = useActionState(createEvent, null);
  const [targeted, setTargeted] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className={labelCls}>タイトル</label>
        <input
          name="title"
          required
          placeholder="例: 第2回 全国模試 / 6月オフライン会"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>日付</label>
          <input type="date" name="date" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>時刻(任意)</label>
          <input type="time" name="time" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>種別</label>
          <select name="type" className={inputCls}>
            {(Object.keys(eventTypeLabels) as EventType[]).map((t) => (
              <option key={t} value={t}>
                {eventTypeLabels[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>公開範囲</label>
        <div className="flex gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="all"
              defaultChecked
              onChange={() => setTargeted(false)}
              className="accent-indigo-600"
            />
            全体公開
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="targeted"
              onChange={() => setTargeted(true)}
              className="accent-indigo-600"
            />
            特定の生徒のみ
          </label>
        </div>
      </div>

      {targeted && (
        <fieldset>
          <legend className={labelCls}>対象の生徒</legend>
          <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2">
            {students.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  name="targets"
                  value={s.id}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm">{s.display_name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton>予定を登録する</SubmitButton>
    </form>
  );
}
