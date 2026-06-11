"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signInWithEmail } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInWithEmail, null);
  const [showEmail, setShowEmail] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const signInWithDiscord = async () => {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo },
    });
    if (error) setOauthError("Discord ログインを開始できませんでした。");
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={signInWithDiscord}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-3 font-medium text-white transition hover:bg-[#4752c4]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.27 18.27 0 0 0-5.5 0 12.64 12.64 0 0 0-.61-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.04.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.12c.12-.1.25-.2.37-.29a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0c.12.1.25.2.37.3a.08.08 0 0 1 0 .12 12.3 12.3 0 0 1-1.87.89.08.08 0 0 0-.04.1c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6.02-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
        </svg>
        Discord でログイン
      </button>
      {oauthError && <p className="text-sm text-red-600">{oauthError}</p>}

      <button
        type="button"
        onClick={() => setShowEmail((v) => !v)}
        className="w-full text-center text-xs text-gray-500 hover:underline"
      >
        メールアドレスでログイン(講師・運営向け)
      </button>

      {showEmail && (
        <form action={formAction} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          {next && <input type="hidden" name="next" value={next} />}
          <input
            type="email"
            name="email"
            placeholder="メールアドレス"
            required
            className={inputCls}
          />
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            required
            className={inputCls}
          />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton>ログイン</SubmitButton>
        </form>
      )}
    </div>
  );
}
