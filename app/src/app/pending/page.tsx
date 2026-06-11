import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { signOut } from "@/lib/actions";

export const metadata = { title: "登録待ち" };

// ログイン済みだがプロフィール未作成(招待未引換)or 無効化済みのユーザー向け
export default async function PendingPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile && profile.status === "active") redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12 text-center">
      <h1 className="text-xl font-bold">アカウントが有効ではありません</h1>
      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        {profile
          ? "このアカウントは現在無効化されています。心当たりがない場合は、Discord で運営にお問い合わせください。"
          : "登録には運営が発行する招待リンクが必要です。Discord で運営に招待リンクの発行を依頼し、届いたリンクをこの端末で開いてください。"}
      </p>
      <form action={signOut} className="mt-8">
        <button
          type="submit"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100"
        >
          ログアウト
        </button>
      </form>
    </main>
  );
}
