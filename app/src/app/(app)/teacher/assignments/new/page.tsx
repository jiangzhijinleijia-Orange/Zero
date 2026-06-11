import { redirect } from "next/navigation";
import { getMyStudents, getSessionProfile } from "@/lib/data";
import { AssignmentForm } from "@/components/AssignmentForm";
import type { Assignment, Subject } from "@/lib/database.types";

export const metadata = { title: "課題作成" };

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ copy?: string }>;
}) {
  const { copy } = await searchParams;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role === "student") redirect("/home");

  const [{ data: subjects }, students, copyFrom] = await Promise.all([
    supabase.from("subjects").select("*").eq("is_active", true).order("sort_order"),
    getMyStudents(),
    copy
      ? supabase
          .from("assignments")
          .select("*")
          .eq("id", copy)
          .maybeSingle()
          .then((r) => (r.data as Assignment | null) ?? null)
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">課題の作成・割当</h1>
        <p className="mt-1 text-sm text-gray-500">
          {copyFrom
            ? `「${copyFrom.title}」を複製しています。締切日を設定してください。`
            : "作成すると、選択した生徒全員にタスクとして割り当てられます。"}
        </p>
      </div>
      <AssignmentForm
        subjects={(subjects ?? []) as Subject[]}
        students={students}
        copyFrom={copyFrom}
      />
    </div>
  );
}
