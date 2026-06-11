import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { roleLabels } from "@/lib/labels";
import { InviteForm } from "@/components/admin/InviteForm";
import { UserStatusButton } from "@/components/admin/UserStatusButton";
import {
  EndMentorshipButton,
  MentorshipForm,
} from "@/components/admin/MentorshipForm";
import type { Invitation, Profile } from "@/lib/database.types";

export const metadata = { title: "管理" };

type MentorshipRow = {
  id: string;
  started_on: string;
  teacher: { display_name: string } | null;
  student: { display_name: string } | null;
};

export default async function AdminPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  const [{ data: userData }, { data: invitationData }, { data: mentorshipData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("role")
        .order("display_name"),
      supabase
        .from("invitations")
        .select("*")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("mentorships")
        .select(
          "id, started_on, teacher:profiles!mentorships_teacher_id_fkey(display_name), student:profiles!mentorships_student_id_fkey(display_name)",
        )
        .is("ended_on", null)
        .order("started_on", { ascending: false }),
    ]);

  const users = (userData ?? []) as Profile[];
  const invitations = (invitationData ?? []) as Invitation[];
  const mentorships = (mentorshipData ?? []) as unknown as MentorshipRow[];

  const teachers = users.filter((u) => u.role === "teacher" && u.status === "active");
  const students = users.filter((u) => u.role === "student" && u.status === "active");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">管理</h1>
        <Link href="/calendar/new" className="text-sm text-indigo-600 hover:underline">
          予定を登録 →
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold text-gray-700">招待リンクの発行</h2>
        <p className="mb-4 text-xs text-gray-500">
          新規メンバーの登録は招待制です。発行したリンクは Discord の DM で本人へ。
        </p>
        <InviteForm teachers={teachers} />
        {invitations.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              未使用の招待: {invitations.length} 件(発行から 72 時間で失効します)
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold text-gray-700">担当関係(講師 ⇄ 生徒)</h2>
        <p className="mb-4 text-xs text-gray-500">
          講師は現担当の生徒のデータ(過去分も含む)だけを閲覧できます。
        </p>
        <MentorshipForm teachers={teachers} students={students} />
        <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
          {mentorships.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
              <p className="text-sm">
                <span className="font-medium">{m.teacher?.display_name}</span>
                <span className="mx-2 text-gray-400">→</span>
                <span className="font-medium">{m.student?.display_name}</span>
                <span className="ml-2 text-xs text-gray-400">{m.started_on}〜</span>
              </p>
              <EndMentorshipButton mentorshipId={m.id} />
            </li>
          ))}
          {mentorships.length === 0 && (
            <li className="py-3 text-center text-sm text-gray-400">
              担当関係がまだ設定されていません。
            </li>
          )}
        </ul>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700">
          ユーザー一覧({users.length}名)
        </h2>
        <ul>
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {u.role === "student" ? (
                    <Link
                      href={`/teacher/students/${u.id}`}
                      className="hover:text-indigo-700 hover:underline"
                    >
                      {u.display_name}
                    </Link>
                  ) : (
                    u.display_name
                  )}
                  {u.status === "inactive" && (
                    <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                      無効
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {roleLabels[u.role]}
                  {u.grade && ` ・ ${u.grade}`}
                  {u.affiliation && ` ・ ${u.affiliation}`}
                </p>
              </div>
              {u.id !== user.id && (
                <UserStatusButton userId={u.id} status={u.status} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-gray-400">
        退会者のデータ削除は Supabase ダッシュボード(Authentication → ユーザー削除)から行ってください。
        プロフィール・課題・成績は連動して削除されます(目安: 申請から 30 日以内)。
      </p>
    </div>
  );
}
