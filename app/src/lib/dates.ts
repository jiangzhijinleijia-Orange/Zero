// 日付はすべて日本時間(Asia/Tokyo)基準で扱う(NF-2: 利用者は国内のみ)

const TZ = "Asia/Tokyo";

/** 今日の日付を YYYY-MM-DD で返す(JST) */
export function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}

/** YYYY-MM-DD に日数を加算 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
}

/** YYYY-MM-DD → 「6月20日(土)」 */
export function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

/** timestamptz → 「6月20日(土) 14:00」 */
export function formatDateTime(ts: string): string {
  const d = new Date(ts);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** timestamptz → JST の YYYY-MM-DD(カレンダーのセル振り分け用) */
export function toJstDateString(ts: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date(ts));
}

/** YYYY-MM の月初・翌月初(カレンダーの取得範囲) */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { start, end: next };
}

/** 今月を YYYY-MM で返す(JST) */
export function currentMonth(): string {
  return todayJst().slice(0, 7);
}

/** YYYY-MM に月数を加算 */
export function addMonths(month: string, diff: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + diff;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}
