import { redirect } from "next/navigation";
import { getMyStudents, getSessionProfile } from "@/lib/data";
import { EventForm } from "@/components/EventForm";

export const metadata = { title: "予定登録" };

export default async function NewEventPage() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role === "student") redirect("/calendar");

  const students = await getMyStudents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">予定の登録</h1>
        <p className="mt-1 text-sm text-gray-500">
          模試日・オフライン会・面談など。課題の締切はカレンダーに自動で表示されるため、ここに登録する必要はありません。
        </p>
      </div>
      <EventForm students={students} />
    </div>
  );
}
