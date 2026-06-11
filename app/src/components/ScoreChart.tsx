"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ScorePoint = {
  examName: string;
  examDate: string; // YYYY-MM-DD
  subjectName: string;
  scoreRate: number; // 得点率(%)
  deviation: number | null;
};

const COLORS = [
  "#4f46e5", "#0891b2", "#d97706", "#dc2626",
  "#059669", "#7c3aed", "#db2777", "#65a30d",
];

type Metric = "scoreRate" | "deviation";

/** 科目別の成績推移グラフ(F-2-4)。判定(A〜E)はあえてグラフ化しない */
export function ScoreChart({ points }: { points: ScorePoint[] }) {
  const [metric, setMetric] = useState<Metric>("scoreRate");

  const subjects = useMemo(
    () => [...new Set(points.map((p) => p.subjectName))],
    [points],
  );

  const data = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string>>();
    for (const p of points) {
      const value = metric === "scoreRate" ? p.scoreRate : p.deviation;
      if (value == null) continue;
      const row = byDate.get(p.examDate) ?? { examDate: p.examDate };
      row[p.subjectName] = value;
      row.examName = p.examName;
      byDate.set(p.examDate, row);
    }
    return [...byDate.values()].sort((a, b) =>
      String(a.examDate).localeCompare(String(b.examDate)),
    );
  }, [points, metric]);

  const hasDeviation = points.some((p) => p.deviation != null);

  if (points.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
        まだ成績が登録されていません。
      </p>
    );
  }

  return (
    <div>
      {hasDeviation && (
        <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-gray-200 text-sm">
          <button
            type="button"
            onClick={() => setMetric("scoreRate")}
            className={`px-3 py-1 ${metric === "scoreRate" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
          >
            得点率
          </button>
          <button
            type="button"
            onClick={() => setMetric("deviation")}
            className={`px-3 py-1 ${metric === "deviation" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
          >
            偏差値
          </button>
        </div>
      )}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="examDate"
              tick={{ fontSize: 11 }}
              tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={metric === "scoreRate" ? [0, 100] : ["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(d) => String(d)}
              formatter={(value, name) => [
                metric === "scoreRate" ? `${value}%` : String(value),
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {subjects.map((subject, i) => (
              <Line
                key={subject}
                type="monotone"
                dataKey={subject}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
