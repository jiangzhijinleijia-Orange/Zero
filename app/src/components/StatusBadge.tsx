import type { TaskStatus } from "@/lib/database.types";
import { taskStatusLabels, taskStatusStyles } from "@/lib/labels";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${taskStatusStyles[status]}`}
    >
      {taskStatusLabels[status]}
    </span>
  );
}
