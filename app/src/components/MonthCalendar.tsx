import Link from "next/link";
import type { CalendarItem } from "@/lib/database.types";
import { toJstDateString, todayJst } from "@/lib/dates";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const itemStyles: Record<string, string> = {
  assignment_due: "bg-rose-100 text-rose-800",
  mock_exam: "bg-violet-100 text-violet-800",
  offline: "bg-sky-100 text-sky-800",
  other: "bg-gray-100 text-gray-700",
};

function itemHref(item: CalendarItem): string | null {
  return item.source === "assignment" ? `/assignments/${item.id}` : null;
}

/** 月表示カレンダー(F-3-1)。予定+課題締切を一望する */
export function MonthCalendar({
  month, // YYYY-MM
  items,
}: {
  month: string;
  items: CalendarItem[];
}) {
  const [year, m] = month.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const leadingBlanks = firstDay.getUTCDay();
  const today = todayJst();

  const byDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const date = toJstDateString(item.starts_at);
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-2 ${i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : ""}`}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const date = day
            ? `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : null;
          const dayItems = date ? (byDate.get(date) ?? []) : [];
          return (
            <div
              key={i}
              className={`min-h-20 border-b border-r border-slate-100 p-1 align-top [&:nth-child(7n)]:border-r-0 ${
                date === today ? "bg-indigo-50/70" : ""
              }`}
            >
              {day && (
                <p className="mb-1">
                  <span
                    className={`tnum inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                      date === today
                        ? "bg-indigo-600 font-bold text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {day}
                  </span>
                </p>
              )}
              <div className="space-y-0.5">
                {dayItems.map((item) => {
                  const href = itemHref(item);
                  const cls = `block truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                    itemStyles[item.item_type] ?? itemStyles.other
                  }`;
                  const label =
                    item.item_type === "assignment_due" ? `〆${item.title}` : item.title;
                  return href ? (
                    <Link key={`${item.source}-${item.id}`} href={href} className={cls}>
                      {label}
                    </Link>
                  ) : (
                    <span key={`${item.source}-${item.id}`} className={cls}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
