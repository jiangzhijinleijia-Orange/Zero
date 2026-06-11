import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { signOut } from "@/lib/actions";
import { roleLabels } from "@/lib/labels";
import { AppNav, type NavItem } from "@/components/AppNav";
import type { UserRole } from "@/lib/database.types";

const navItems: Record<UserRole, NavItem[]> = {
  student: [
    { href: "/home", label: "ホーム" },
    { href: "/scores", label: "マイ成績" },
    { href: "/scores/new", label: "成績登録" },
    { href: "/calendar", label: "カレンダー" },
  ],
  teacher: [
    { href: "/teacher", label: "ダッシュボード" },
    { href: "/teacher/assignments/new", label: "課題作成" },
    { href: "/scores/new", label: "成績登録" },
    { href: "/calendar", label: "カレンダー" },
  ],
  admin: [
    { href: "/admin", label: "管理" },
    { href: "/teacher", label: "ダッシュボード" },
    { href: "/scores/new", label: "成績登録" },
    { href: "/calendar", label: "カレンダー" },
  ],
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile || profile.status !== "active") redirect("/pending");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between pt-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-indigo-900">
              蒼理塾
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {profile.display_name}
                <span className="ml-1 text-xs text-gray-400">
                  {roleLabels[profile.role]}
                </span>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
          <AppNav items={navItems[profile.role]} />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-8 text-center text-xs text-gray-400">
        会話は Discord、状態はアプリ。
      </footer>
    </div>
  );
}
