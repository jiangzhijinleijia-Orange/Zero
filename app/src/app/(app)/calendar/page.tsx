import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { addMonths, currentMonth, formatDateTime, monthRange } from "@/lib/dates";
import { MonthCalendar } from "@/components/MonthCalendar";
import type { CalendarItem } from "@/lib/database.types";

export const metadata = { title: "カレンダー" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? monthParam! : currentMonth();
  const { start, end } = monthRange(month);

  const { data } = await supabase
    .from("calendar_items")
    .select("*")
    .gte("starts_at", `${start}T00:00:00+09:00`)
    .lt("starts_at", `${end}T00:00:00+09:00`)
    .order("starts_at");
  const items = (data ?? []) as CalendarItem[];

  const [year, m] = month.split("-");
  const isStaff = profile.role !== "student";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">カレンダー</h1>
        {isStaff && (
          <Link
            href="/calendar/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + 予定を登録
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${addMonths(month, -1)}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100"
        >
          ← 前月
        </Link>
        <p className="text-lg font-bold">
          {year}{Number(m)}月
        </p>
        <Link
          href={`/calendar?month=${addMonths(month, 1)}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100"
        >
          翌月 →
        </Link>
      </div>

      <MonthCalendar month={month} items={items} />

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-700">この月の一覧</h2>
        {items.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-400">
            予定・締切はありません。
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {items.map((item) => (
              <li
                key={`${item.source}-${item.id}`}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 last:border-b-0"
              >
                <span className="w-28 shrink-0 text-xs text-gray-500">
                  {formatDateTime(item.starts_at)}
                </span>
                {item.source === "assignment" ? (
                  <Link
                    href={`/assignments/${item.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-rose-700 hover:underline"
                  >
                    〆切: {item.title}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
