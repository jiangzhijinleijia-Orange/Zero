import { redirect } from "next/navigation";
import { getMyStudents, getSessionProfile } from "@/lib/data";
import { ScoreEntryForm } from "@/components/ScoreEntryForm";
import type { Exam, Subject, Topic } from "@/lib/database.types";

export const metadata = { title: "成績登録" };

export default async function NewScorePage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");

  const isStaff = profile.role !== "student";

  const [{ data: subjects }, { data: topics }, { data: exams }, students] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("topics").select("*").order("name"),
      supabase.from("exams").select("*").order("exam_date", { ascending: false }).limit(30),
      isStaff ? getMyStudents() : Promise.resolve([]),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">成績登録</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isStaff
            ? "担当生徒のテスト結果を登録します。"
            : "テストが返ってきたら、忘れないうちに登録しましょう。"}
        </p>
      </div>
      <ScoreEntryForm
        subjects={(subjects ?? []) as Subject[]}
        topics={(topics ?? []) as Topic[]}
        recentExams={(exams ?? []) as Exam[]}
        students={students}
        selfId={user.id}
        isStaff={isStaff}
      />
    </div>
  );
}
