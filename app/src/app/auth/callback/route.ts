import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth(Discord)からのリダイレクト先。code をセッションに引き換える
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // open redirect 防止: アプリ内のパスのみ許可
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  return NextResponse.redirect(`${origin}/login`);
}
