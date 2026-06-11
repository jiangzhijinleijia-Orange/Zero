import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "プロフィール設定" };

export default async function SettingsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-bold">プロフィール設定</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <ProfileForm profile={profile} />
      </div>
      <p className="text-xs leading-relaxed text-gray-400">
        集めるのは表示名・学年・所属だけです。本名や住所は登録しないでください。
        退会(データ削除)を希望する場合は、Discord で運営に連絡してください。
      </p>
    </div>
  );
}
