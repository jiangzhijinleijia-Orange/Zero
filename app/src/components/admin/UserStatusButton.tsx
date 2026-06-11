"use client";

import { useTransition } from "react";
import type { UserStatus } from "@/lib/database.types";
import { setUserStatus } from "@/lib/actions";

export function UserStatusButton({
  userId,
  status,
}: {
  userId: string;
  status: UserStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const next: UserStatus = status === "active" ? "inactive" : "active";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          next === "inactive" &&
          !window.confirm("このユーザーを無効化しますか?(ログインしても何も見えなくなります)")
        ) {
          return;
        }
        startTransition(async () => {
          await setUserStatus(userId, next);
        });
      }}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
        status === "active"
          ? "border border-red-200 text-red-600 hover:bg-red-50"
          : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {status === "active" ? "無効化" : "有効化"}
    </button>
  );
}
