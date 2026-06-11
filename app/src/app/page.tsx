import { redirect } from "next/navigation";
import { getSessionProfile, homePathFor } from "@/lib/data";

export default async function RootPage() {
  const { user, profile } = await getSessionProfile();

  if (!user) redirect("/login");
  if (!profile || profile.status !== "active") redirect("/pending");
  redirect(homePathFor(profile.role));
}
