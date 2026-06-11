"use client";

import { useActionState } from "react";
import { redeemInvite } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

/** 招待リンクからの初回登録(F-4-4)。同意取得(NF-6)もここで行う */
export function InviteRedeemForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(redeemInvite.bind(null, token), null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          表示名(ニックネーム可。本名でなくて構いません)
        </label>
        <input
          name="display_name"
          required
          maxLength={50}
          placeholder="例: たろう"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
        <p className="mb-2 font-semibold text-gray-700">データの取り扱いについて</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>このアプリは、課題の進捗・テストの成績・予定を記録します。</li>
          <li>あなたの成績は、あなた本人・担当の講師・運営だけが見られます。他の生徒には見えません。</li>
          <li>本名や住所は集めません。表示名と学年だけで利用できます。</li>
          <li>やめたいときは、運営に連絡すればデータを削除できます。</li>
        </ul>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-indigo-600" />
        上記を読んで同意しました(中学生・高校生のみなさんは、保護者の方にも伝えてください)
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <SubmitButton>登録してはじめる</SubmitButton>
    </form>
  );
}
