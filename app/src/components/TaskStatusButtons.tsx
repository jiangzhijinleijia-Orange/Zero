"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaskStatus } from "@/lib/database.types";
import { taskStatusLabels } from "@/lib/labels";
import { setTaskStatus } from "@/lib/actions";

const activeStyles: Record<TaskStatus, string> = {
  not_started: "bg-gray-600 text-white border-gray-600",
  in_progress: "bg-amber-500 text-white border-amber-500",
  done: "bg-emerald-600 text-white border-emerald-600",
};

/** ステータスの1タップ更新(F-1-5)。3状態をそのままボタンで並べる */
export function TaskStatusButtons({
  taskId,
  status,
  size = "md",
}: {
  taskId: string;
  status: TaskStatus;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<TaskStatus>(status);
  const [error, setError] = useState<string | null>(null);

  const update = (next: TaskStatus) => {
    if (next === current || isPending) return;
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const result = await setTaskStatus(taskId, next);
      if (result?.error) {
        setCurrent(previous);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";

  return (
    <div>
      <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
        {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => update(s)}
            disabled={isPending}
            className={`${pad} font-medium transition border-r border-gray-200 last:border-r-0 ${
              current === s
                ? activeStyles[s]
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {taskStatusLabels[s]}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
