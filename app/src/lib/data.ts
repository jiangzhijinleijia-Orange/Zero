import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/database.types";

/** ログイン中ユーザーとそのプロフィールを取得する(全ページ共通の入口) */
export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null as Profile | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile: (profile as Profile | null) ?? null };
}

export function homePathFor(role: UserRole): string {
  switch (role) {
    case "student":
      return "/home";
    case "teacher":
      return "/teacher";
    case "admin":
      return "/admin";
  }
}

/** 講師の現担当生徒一覧(運営は全生徒) */
export async function getMyStudents() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) return [];

  if (profile.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("status", "active")
      .order("display_name");
    return (data ?? []) as Profile[];
  }

  const { data: mentorships } = await supabase
    .from("mentorships")
    .select("student_id")
    .eq("teacher_id", user.id)
    .is("ended_on", null);
  const ids = (mentorships ?? []).map((m) => m.student_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids)
    .eq("status", "active")
    .order("display_name");
  return (data ?? []) as Profile[];
}
