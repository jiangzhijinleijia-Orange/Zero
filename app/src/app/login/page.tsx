import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { LoginForm } from "@/components/LoginForm";

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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-900">蒼理塾</h1>
        <p className="mt-2 text-sm text-gray-500">
          学習管理アプリ — 会話は Discord、状態はアプリ。
        </p>
      </div>
      <LoginForm next={next} />
      <p className="mt-8 text-center text-xs text-gray-400">
        はじめての方は、運営から届いた招待リンクからご登録ください。
      </p>
    </main>
  );
}
