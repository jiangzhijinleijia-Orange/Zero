// アプリのブランドロゴ(ワードマーク)。グラデーションで統一感を出す。
// 大きさは className で調整する(例: text-4xl)。
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text font-extrabold tracking-tight text-transparent ${className}`}
    >
      Ryukyu30
    </span>
  );
}
