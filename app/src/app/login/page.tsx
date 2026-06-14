import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { LoginForm } from "@/components/LoginForm";
import { Brand } from "@/components/Brand";

export const metadata = { title: "ログイン" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { user } = await getSessionProfile();
  if (user) redirect(next ?? "/");

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/30 to-violet-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-400/25 to-cyan-300/20 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <Brand className="text-4xl" />
          <p className="mt-3 text-sm text-slate-500">
            学習管理アプリ — 会話は Discord、状態はアプリ。
          </p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-indigo-500/10 backdrop-blur">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          はじめての方は、運営から届いた招待リンクからご登録ください。
        </p>
      </div>
    </main>
  );
}
