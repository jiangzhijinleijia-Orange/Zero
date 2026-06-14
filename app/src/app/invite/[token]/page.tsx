import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { LoginForm } from "@/components/LoginForm";
import { InviteRedeemForm } from "@/components/InviteRedeemForm";
import { Brand } from "@/components/Brand";

export const metadata = { title: "招待登録" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { user, profile } = await getSessionProfile();

  // 登録済みならホームへ
  if (user && profile) redirect("/");

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
          <p className="mt-3 text-sm text-slate-500">招待リンクからの登録</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-indigo-500/10 backdrop-blur">
          {!user ? (
            <div>
              <p className="mb-6 rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900">
                ようこそ!まずログイン方法を選んでください。Discord
                アカウントでのログインがおすすめです。
              </p>
              <LoginForm next={`/invite/${token}`} />
            </div>
          ) : (
            <InviteRedeemForm token={token} />
          )}
        </div>
      </div>
    </main>
  );
}
