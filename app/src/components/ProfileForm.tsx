"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/database.types";
import { updateProfile } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelCls}>表示名</label>
        <input
          name="display_name"
          defaultValue={profile.display_name}
          required
          maxLength={50}
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>学年(任意)</label>
          <input name="grade" defaultValue={profile.grade ?? ""} placeholder="例: 高2" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>所属(任意)</label>
          <input name="affiliation" defaultValue={profile.affiliation ?? ""} className={inputCls} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton>保存する</SubmitButton>
    </form>
  );
}
