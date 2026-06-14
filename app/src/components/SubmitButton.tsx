"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
      }
    >
      {pending ? "送信中..." : children}
    </button>
  );
}
