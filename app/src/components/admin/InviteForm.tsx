"use client";

import { useState, useTransition } from "react";
import type { Profile, UserRole } from "@/lib/database.types";
import { roleLabels } from "@/lib/labels";
import { createInvitation } from "@/lib/actions";
import { CopyButton } from "@/components/CopyButton";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-gray-500";

/** 招待リンクの発行(F-4-4)。生徒の場合は担当講師を事前指定できる */
export function InviteForm({ teachers }: { teachers: Profile[] }) {
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const submit = (formData: FormData) => {
    setError(null);
    setLink(null);
    startTransition(async () => {
      const result = await createInvitation(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setLink(`${window.location.origin}/invite/${result.token}`);
      }
    });
  };

  return (
    <form action={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>ロール</label>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={inputCls}
          >
            {(Object.keys(roleLabels) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </div>
        {role === "student" && (
          <>
            <div>
              <label className={labelCls}>学年(任意)</label>
              <input name="grade" placeholder="例: 高2" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>担当講師</label>
              <select name="mentor_id" className={inputCls}>
                <option value="">後で設定</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {link && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
          <code className="min-w-0 flex-1 truncate text-xs text-emerald-900">{link}</code>
          <CopyButton text={link} />
        </div>
      )}
      {link && (
        <p className="text-xs text-gray-500">
          このリンクを Discord の DM で本人に送ってください(有効期限 72 時間・1回限り)。
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? "発行中..." : "招待リンクを発行"}
      </button>
    </form>
  );
}
