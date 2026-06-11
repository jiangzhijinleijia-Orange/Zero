import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { LoginForm } from "@/components/LoginForm";
import { InviteRedeemForm } from "@/components/InviteRedeemForm";

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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-900">蒼理塾</h1>
        <p className="mt-2 text-sm text-gray-500">招待リンクからの登録</p>
      </div>

      {!user ? (
        <div>
          <p className="mb-6 rounded-lg bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900">
            ようこそ!まずログイン方法を選んでください。Discord
            アカウントでのログインがおすすめです。
          </p>
          <LoginForm next={`/invite/${token}`} />
        </div>
      ) : (
        <InviteRedeemForm token={token} />
      )}
    </main>
  );
}
